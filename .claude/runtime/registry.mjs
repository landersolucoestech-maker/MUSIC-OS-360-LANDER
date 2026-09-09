#!/usr/bin/env node
// Scans .claude/agents/*.md and .claude/skills/*/SKILL.md, validates each file's
// frontmatter against agent-manifest.schema.json / skill-manifest.schema.json, and
// cross-checks every agent's declared tools against capabilities.json (an agent
// whose frontmatter grants more than its capability-manifest ceiling is a real
// policy violation, not a lint nit). Consumer: validate-pack.mjs calls this;
// mission-orchestrator's agent selection reads report().agents to know what exists.
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseFrontmatter } from "./lib/frontmatter.mjs";
import { validate } from "./lib/schema-validate.mjs";
import { loadAllPolicies, allowedToolsFor } from "./lib/policy.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

function packRoot(cwd) {
  return existsSync(join(cwd, ".claude", "agents")) ? cwd : join(__dirname, "..", "..");
}

function scanDir(dir, pattern) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => (pattern === "flat" ? e.isFile() && e.name.endsWith(".md") : e.isDirectory()))
    .map((e) => (pattern === "flat" ? join(dir, e.name) : join(dir, e.name, "SKILL.md")))
    .filter((p) => existsSync(p));
}

export function buildRegistry(cwd = process.cwd()) {
  const root = packRoot(cwd);
  const contractsDir = join(root, ".claude", "contracts");
  const agentSchema = join(contractsDir, "agent-manifest.schema.json");
  const skillSchema = join(contractsDir, "skill-manifest.schema.json");
  const { policies } = loadAllPolicies(root);

  const agents = scanDir(join(root, ".claude", "agents"), "flat").map((path) => {
    const { data } = parseFrontmatter(readFileSync(path, "utf8"));
    const result = validate(agentSchema, data);
    const declaredTools = (data.tools || "").split(",").map((t) => t.trim()).filter(Boolean);
    const allowed = allowedToolsFor(policies, data.name);
    const excess = allowed ? declaredTools.filter((t) => !allowed.includes(t)) : [];
    return {
      path, name: data.name, description: data.description, valid: result.valid, schemaErrors: result.errors,
      declaredTools, capabilityCeiling: allowed,
      capabilityViolation: allowed !== null && excess.length > 0 ? excess : null,
      missingFromCapabilities: allowed === null,
    };
  });

  const skills = scanDir(join(root, ".claude", "skills"), "nested").map((path) => {
    const { data } = parseFrontmatter(readFileSync(path, "utf8"));
    const result = validate(skillSchema, data);
    return { path, name: data.name, description: data.description, valid: result.valid, schemaErrors: result.errors };
  });

  return { agents, skills };
}

function main() {
  const { agents, skills } = buildRegistry();
  const invalidAgents = agents.filter((a) => !a.valid || a.capabilityViolation || a.missingFromCapabilities);
  const invalidSkills = skills.filter((s) => !s.valid);
  const report = {
    agentCount: agents.length,
    skillCount: skills.length,
    invalidAgents,
    invalidSkills,
    status: invalidAgents.length === 0 && invalidSkills.length === 0 ? "OK" : "VIOLATIONS",
  };
  console.log(JSON.stringify(report, null, 2));
  if (report.status !== "OK") process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
