#!/usr/bin/env node
/**
 * Prevents CI/CD from regressing to a two-branch topology.
 *
 * Permanent promotion path:
 *   dev -> staging -> main
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function extractJobBlock(source, jobName) {
  const lines = source.split("\n");
  const start = lines.findIndex(
    (line) => /^ {2}[\w-]+:\s*$/.test(line) && line.trim() === `${jobName}:`,
  );
  if (start === -1) return null;

  const block = [lines[start]];
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^ {2}[\w-]+:\s*$/.test(lines[index])) break;
    block.push(lines[index]);
  }
  return block.join("\n");
}

const ci = read(".github/workflows/ci.yml");
const security = read(".github/workflows/security.yml");
const staging = read(".github/workflows/staging.yml");
const runbook = read("docs/runbooks/staging-to-production.md");

const errors = [];

const permanentBranches = "branches: [dev, staging, main]";
if (ci.split(permanentBranches).length - 1 < 2) {
  errors.push("ci.yml must target dev, staging and main for push and pull_request.");
}

if (security.split(permanentBranches).length - 1 < 2) {
  errors.push("security.yml must target dev, staging and main for push and pull_request.");
}

if (!/push:\s*\n\s+branches:\s*\[staging\]/m.test(staging)) {
  errors.push("staging.yml must run on pushes to the staging branch.");
}

if (/\bref:\s*dev\b/.test(staging)) {
  errors.push("staging.yml must checkout the triggering staging ref, never force ref: dev.");
}

if ((staging.match(/github\.ref == 'refs\/heads\/staging'/g) ?? []).length < 2) {
  errors.push("staging deploy and smoke jobs must be guarded by refs/heads/staging.");
}

for (const jobName of [
  "db-verify-application-dev",
  "db-verify-realtime-external-dev",
]) {
  const block = extractJobBlock(ci, jobName);
  if (!block) {
    errors.push(`ci.yml is missing jobs.${jobName}.`);
    continue;
  }
  if (!block.includes("if: github.ref == 'refs/heads/dev'")) {
    errors.push(`${jobName} must run only on refs/heads/dev.`);
  }
  if (block.includes("refs/heads/main") || block.includes("refs/heads/staging")) {
    errors.push(`${jobName} must never query staging or production environments.`);
  }
}

if (!runbook.includes("dev -> staging -> main")) {
  errors.push("The promotion runbook must document dev -> staging -> main.");
}

if (errors.length > 0) {
  console.error("❌ Branch topology guard failed:");
  for (const error of errors) console.error(`  • ${error}`);
  process.exit(1);
}

console.log("✓ Branch topology verified: dev -> staging -> main");
