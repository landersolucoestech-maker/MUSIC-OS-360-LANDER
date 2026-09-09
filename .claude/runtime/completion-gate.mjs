#!/usr/bin/env node
// Thin, backward-compatible CLI entrypoint. The actual GATE DEFINITION lives at
// .claude/gates/completion.json and the GATE ENGINE that executes it lives at
// gate-engine.mjs — this file just wires the familiar `completion-gate.mjs
// [--run-gates]` invocation to `gate-engine.mjs completion [--run-gates]` so
// existing callers (docs, skills, CI) don't need to change.
import { pathToFileURL } from "node:url";
import { evaluateGateFile } from "./gate-engine.mjs";

function parseArgs(argv) {
  const out = { cwd: process.cwd(), runGates: false };
  for (const a of argv) {
    if (a === "--run-gates") out.runGates = true;
    else if (a.startsWith("--cwd=")) out.cwd = a.split("=")[1];
  }
  return out;
}

export function evaluate({ cwd = process.cwd(), runGates = false } = {}) {
  return evaluateGateFile("completion", { cwd, flags: { runGates } });
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const result = evaluate(opts);
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.status === "PASS" ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
