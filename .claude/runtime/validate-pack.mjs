#!/usr/bin/env node
// THE structural validator: compares the installed pack against the canonical
// expected-structure manifest, validates every schema/policy/agent/skill, and
// cross-references ownership.json/capabilities.json against real agent files
// (orphan detection both directions). The pack cannot declare itself
// "complete" while this reports BLOCK — see docs/ARCHITECTURE.md and
// .claude/engineering-os.json.
import { existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { expectedPaths, loadManifest } from "./manifest.mjs";
import { buildRegistry } from "./registry.mjs";
import { loadAllPolicies } from "./lib/policy.mjs";
import { readJson } from "./lib/core.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

function packRoot(cwd) {
  return existsSync(join(cwd, ".claude", "engineering-os.json")) ? cwd : join(__dirname, "..", "..");
}

function checkExpectedPaths(cwd) {
  const missing = [];
  for (const item of expectedPaths(cwd)) {
    if (!item.required) continue;
    if (!existsSync(join(cwd, item.path))) missing.push(item.path);
  }
  return missing;
}

function checkMinCounts(cwd) {
  const manifest = loadManifest(cwd);
  const problems = [];
  for (const [catName, cat] of Object.entries(manifest.structure.categories)) {
    if (!cat.required || !cat.minCount) continue;
    const dir = join(cwd, cat.dir);
    if (!existsSync(dir)) {
      problems.push(`${catName}: directory ${cat.dir} missing entirely`);
      continue;
    }
    const count = countMatching(dir, cat.glob);
    if (count < cat.minCount) problems.push(`${catName}: found ${count}, expected at least ${cat.minCount}`);
  }
  return problems;
}

function countMatching(dir, glob) {
  // Supports the two glob shapes actually used in engineering-os.json: "*.ext"
  // (flat) and "*/SKILL.md" (one level of subdirectory).
  if (glob.startsWith("*/")) {
    const suffix = glob.slice(1); // "/SKILL.md"
    return readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && existsSync(join(dir, e.name, suffix.slice(1))))
      .length;
  }
  const ext = glob.replace("*", "");
  return readdirSync(dir, { withFileTypes: true }).filter((e) => e.isFile() && e.name.endsWith(ext)).length;
}

function checkOwnershipCrossReference(cwd) {
  const problems = [];
  const agentsDir = join(cwd, ".claude", "agents");
  const agentFiles = new Set(existsSync(agentsDir) ? readdirSync(agentsDir).map((f) => f.replace(/\.md$/, "")) : []);

  const ownershipPath = join(cwd, ".claude", "ownership.json");
  if (existsSync(ownershipPath)) {
    const ownership = readJson(ownershipPath);
    for (const owner of ownership.owners) {
      if (!agentFiles.has(owner.agent)) problems.push(`ownership.json references unknown agent "${owner.agent}" (orphan policy entry)`);
    }
  }

  const capabilitiesPath = join(cwd, ".claude", "policies", "capabilities.json");
  if (existsSync(capabilitiesPath)) {
    const capabilities = readJson(capabilitiesPath);
    const capabilityAgents = new Set(capabilities.roles.map((r) => r.agent));
    for (const agent of agentFiles) {
      if (!capabilityAgents.has(agent)) problems.push(`agent "${agent}" has no capabilities.json entry (missing capability ceiling)`);
    }
    for (const role of capabilities.roles) {
      if (!agentFiles.has(role.agent)) problems.push(`capabilities.json references unknown agent "${role.agent}" (orphan policy entry)`);
    }
  }

  return problems;
}

export function validate(cwd = packRoot(process.cwd())) {
  const reasons = [];

  const missingPaths = checkExpectedPaths(cwd);
  if (missingPaths.length) reasons.push(`missing required paths: ${missingPaths.join(", ")}`);

  const countProblems = checkMinCounts(cwd);
  reasons.push(...countProblems.map((p) => `category count: ${p}`));

  const { agents, skills } = buildRegistry(cwd);
  const invalidAgents = agents.filter((a) => !a.valid || a.capabilityViolation || a.missingFromCapabilities);
  const invalidSkills = skills.filter((s) => !s.valid);
  reasons.push(...invalidAgents.map((a) => `invalid agent manifest/capability: ${a.path}`));
  reasons.push(...invalidSkills.map((s) => `invalid skill manifest: ${s.path}`));

  const { valid: policiesValid, errors: policyErrors } = loadAllPolicies(cwd);
  if (!policiesValid) reasons.push(...policyErrors.map((e) => `policy schema violation in ${e.file}: ${e.errors.join("; ")}`));

  reasons.push(...checkOwnershipCrossReference(cwd));

  return { status: reasons.length === 0 ? "PASS" : "BLOCK", reasons, missingPaths, countProblems, invalidAgents, invalidSkills, policyErrors };
}

function main() {
  const result = validate();
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.status === "PASS" ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
