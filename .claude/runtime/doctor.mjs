#!/usr/bin/env node
// Diagnostic CLI: Node version, git availability, and presence of every required
// path from engineering-os.json's manifest. What the launchers (Category 12) run
// before starting Claude Code — fails loudly and specifically instead of letting
// a broken install surface as a confusing downstream error.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { isGitRepo, run } from "./lib/exec.mjs";
import { expectedPaths } from "./manifest.mjs";

export function diagnose(cwd = process.cwd()) {
  const problems = [];
  const checks = [];

  const nodeVersion = process.versions.node;
  const nodeMajor = Number(nodeVersion.split(".")[0]);
  checks.push({ check: "node-version", value: nodeVersion, ok: nodeMajor >= 18 });
  if (nodeMajor < 18) problems.push(`Node ${nodeVersion} is below the minimum supported (18). Upgrade Node.`);

  const gitResult = run("git", ["--version"]);
  checks.push({ check: "git-available", value: gitResult.stdout, ok: gitResult.ok });
  if (!gitResult.ok) problems.push("git is not on PATH — the runtime's workspace fingerprint and evidence commands require it.");

  const inGitRepo = isGitRepo(cwd);
  checks.push({ check: "cwd-is-git-repo", value: cwd, ok: inGitRepo });
  if (!inGitRepo) problems.push(`${cwd} is not a git repository — initialize one before running a mission (workspace fingerprint needs git history/status).`);

  for (const item of expectedPaths(cwd)) {
    if (!item.required) continue;
    const exists = existsSync(join(cwd, item.path));
    checks.push({ check: `path:${item.path}`, ok: exists });
    if (!exists) problems.push(`Missing required path: ${item.path} (category: ${item.category}) — was the pack actually installed here?`);
  }

  return { status: problems.length === 0 ? "HEALTHY" : "UNHEALTHY", problems, checks };
}

function main() {
  const report = diagnose();
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.status === "HEALTHY" ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
