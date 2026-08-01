#!/usr/bin/env node
/**
 * scripts/verify-db-verify-gate-wiring.mjs
 *
 * Regression guard for a real bug found while building this gate: the
 * "DB Verify — Supabase DEV" job's gate step (scripts/db-verify-gate.mjs)
 * reads DB_VERIFY_ENABLED/DATABASE_URL from process.env, but the workflow
 * YAML never actually wired the GitHub Actions `vars.DB_VERIFY_ENABLED`
 * context into that step's environment — so the gate always read it as
 * unset and silently reported "skipped" forever, no matter what the repo
 * variable was set to. Unit tests on the gate's pure decision logic can't
 * catch this class of bug (the logic itself was correct); only checking the
 * actual YAML wiring can.
 *
 * Text-based, not a real YAML parse (js-yaml is not an actual dependency of
 * this repo — see verify-critical-workflows.mjs, whose own "deep parse"
 * silently never runs for the same reason). Extracts the job's own text
 * block by indentation, same approach as the rest of this project's guard
 * scripts (see verify-migration-source-of-truth.mjs).
 *
 * Usage:
 *   node scripts/verify-db-verify-gate-wiring.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

// Extracts the text of one top-level job block (2-space indented key under
// `jobs:`) up to the next sibling job or end of file.
export function extractJobBlock(ciYamlSource, jobName) {
  const lines = ciYamlSource.split('\n');
  const startIndex = lines.findIndex((line) => /^ {2}[\w-]+:\s*$/.test(line) && line.trim() === `${jobName}:`);
  if (startIndex === -1) return null;

  const blockLines = [lines[startIndex]];
  for (let i = startIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^ {2}[\w-]+:\s*$/.test(line)) break; // next sibling job
    blockLines.push(line);
  }
  return blockLines.join('\n');
}

export function checkGateJobWiring(jobBlock) {
  const reasons = [];
  if (jobBlock == null) {
    return { ok: false, reasons: ['jobs.db-verify-supabase-dev not found in .github/workflows/ci.yml — did the job get renamed?'] };
  }
  if (!/DB_VERIFY_ENABLED:\s*\$\{\{\s*vars\.DB_VERIFY_ENABLED\s*\}\}/.test(jobBlock)) {
    reasons.push('env.DB_VERIFY_ENABLED is missing or does not reference ${{ vars.DB_VERIFY_ENABLED }} — the gate script would always read it as unset');
  }
  if (!/DATABASE_URL:\s*\$\{\{\s*secrets\.DATABASE_URL\s*\}\}/.test(jobBlock)) {
    reasons.push('env.DATABASE_URL is missing or does not reference ${{ secrets.DATABASE_URL }} — the gate script could never detect the real secret');
  }
  return { ok: reasons.length === 0, reasons };
}

function main() {
  const ciYamlPath = path.join(REPO_ROOT, '.github', 'workflows', 'ci.yml');
  const source = readFileSync(ciYamlPath, 'utf8');
  const jobBlock = extractJobBlock(source, 'db-verify-supabase-dev');
  const result = checkGateJobWiring(jobBlock);

  if (result.ok) {
    console.log('  ✓  DB Verify — Supabase DEV job correctly wires DB_VERIFY_ENABLED and DATABASE_URL into its environment');
  } else {
    console.error('  ✗  DB Verify — Supabase DEV job wiring is broken:');
    for (const reason of result.reasons) console.error(`     - ${reason}`);
    process.exitCode = 1;
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  main();
}
