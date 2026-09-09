#!/usr/bin/env node
// Computes the runtime-detected impact level from touched files + diff content,
// takes the max against any operator-declared level, and records it in mission state.
// Usage: node impact.mjs [--declared=L2] [--cwd=.] [--json]
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { git, isGitRepo } from "./lib/exec.mjs";
import { loadState, saveState, maxImpact } from "./lib/state-store.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const out = { cwd: process.cwd(), json: false, declared: null };
  for (const a of argv) {
    if (a === "--json") out.json = true;
    else if (a.startsWith("--declared=")) out.declared = a.split("=")[1];
    else if (a.startsWith("--cwd=")) out.cwd = a.split("=")[1];
  }
  return out;
}

function loadPolicy(cwd) {
  const candidates = [
    join(cwd, ".claude", "policies", "impact-levels.json"),
    join(__dirname, "..", "policies", "impact-levels.json"),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return JSON.parse(readFileSync(p, "utf8"));
  }
  return null;
}

function compileRules(rules) {
  return rules.map((r) => ({ ...r, regex: new RegExp(r.pattern, r.flags || "") }));
}

export function detectImpact({ cwd, policy, touchedFiles, diffText }) {
  if (touchedFiles.length === 0) {
    return { level: policy.defaultLevel, reasons: ["no touched files detected"] };
  }
  const allDocs = touchedFiles.every((f) =>
    policy.docOnlyPathPatterns.some((p) => new RegExp(p, "i").test(f))
  );
  if (allDocs) {
    return { level: policy.docOnlyLevel, reasons: ["all touched files match doc-only patterns"] };
  }

  const pathRules = compileRules(policy.pathRules);
  const contentRules = compileRules(policy.contentRules);

  let level = policy.defaultLevel;
  const reasons = [];

  for (const file of touchedFiles) {
    for (const rule of pathRules) {
      if (rule.regex.test(file)) {
        level = maxImpact(level, rule.level);
        reasons.push(`${file}: ${rule.reason} -> ${rule.level}`);
      }
    }
  }
  for (const rule of contentRules) {
    if (rule.regex.test(diffText)) {
      level = maxImpact(level, rule.level);
      reasons.push(`diff content: ${rule.reason} -> ${rule.level}`);
    }
  }
  return { level, reasons };
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!isGitRepo(opts.cwd)) {
    const result = { status: "BLOCKED", reason: "NOT_A_GIT_REPO — impact detection requires git." };
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = 2;
    return;
  }
  const policy = loadPolicy(opts.cwd);
  if (!policy) {
    console.log(JSON.stringify({ status: "BLOCKED", reason: "impact-levels.json policy not found" }, null, 2));
    process.exitCode = 2;
    return;
  }

  const staged = git(["diff", "--name-only", "--cached"], opts.cwd);
  const unstaged = git(["diff", "--name-only"], opts.cwd);
  const untracked = git(["ls-files", "--others", "--exclude-standard"], opts.cwd);
  const touchedFiles = [
    ...new Set(
      [staged.stdout, unstaged.stdout, untracked.stdout]
        .flatMap((s) => s.split("\n"))
        .map((s) => s.trim())
        .filter(Boolean)
    ),
  ];
  const diffText = [git(["diff", "--cached"], opts.cwd).stdout, git(["diff"], opts.cwd).stdout].join("\n");

  const { level: runtimeDetected, reasons } = detectImpact({ cwd: opts.cwd, policy, touchedFiles, diffText });
  const effective = maxImpact(opts.declared, runtimeDetected);

  const result = {
    status: "OK",
    operatorDeclared: opts.declared,
    runtimeDetected,
    effective,
    touchedFileCount: touchedFiles.length,
    reasons,
  };

  const state = loadState(opts.cwd);
  if (state) {
    state.impact = { operatorDeclared: opts.declared, runtimeDetected, effective };
    saveState(state, opts.cwd);
    result.stateUpdated = true;
  } else {
    result.stateUpdated = false;
    result.note = "no mission state found; run ops.mjs init to persist this result";
  }

  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
