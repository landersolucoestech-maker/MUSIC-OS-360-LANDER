#!/usr/bin/env node
// Single entrypoint other tools (launchers, doctor, CI) can call directly, without
// npm, to self-test the pack's runtime. Adapts to where it's actually running:
// - "dev" mode (this pack's own repo — has a top-level tests/ and installer/,
//   which are never copied to an install target): runs the full dev test suite
//   plus the installer round-trip.
// - "installed" mode (a target project after install.mjs ran — only has
//   .claude/runtime/tests/, since installer/ and the project-root tests/ aren't
//   part of what gets installed): runs registry/policy checks plus the
//   regression suite that DID get installed, and nothing that can't exist there.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { buildRegistry } from "./registry.mjs";
import { loadAllPolicies } from "./lib/policy.mjs";
import { validate as validatePack } from "./validate-pack.mjs";

function checkRegistry() {
  const { agents, skills } = buildRegistry();
  const bad = [...agents, ...skills].filter((a) => !a.valid || a.capabilityViolation || a.missingFromCapabilities);
  return { name: "registry", status: bad.length === 0 ? "PASS" : "FAIL", details: bad };
}

function checkPolicies() {
  const { valid, errors } = loadAllPolicies();
  return { name: "policies", status: valid ? "PASS" : "FAIL", details: errors };
}

function checkStructure(cwd) {
  const result = validatePack(cwd);
  return { name: "structure", status: result.status === "PASS" ? "PASS" : "FAIL", details: result.reasons };
}

// Exported (and taking explicit patterns) so this module's own test suite can
// verify the invocation mechanism against a safe, non-recursive fixture instead
// of the real "dev" patterns, which would include this very test file and
// re-spawn the whole suite indefinitely.
export function runNodeTestPatterns(patterns) {
  try {
    // No shell here: invoking node.exe directly needs no shell (unlike the
    // npm/pnpm/yarn .cmd-shim case in gate-engine.mjs), and shell:true actually
    // breaks this specific call on Windows — it doesn't quote process.execPath,
    // so a space in "C:\Program Files\nodejs\node.exe" splits the command.
    execFileSync(process.execPath, ["--test", ...patterns], { stdio: "inherit" });
    return { name: "node-tests", status: "PASS" };
  } catch {
    return { name: "node-tests", status: "FAIL" };
  }
}

function runNodeTests(mode) {
  const patterns =
    mode === "dev"
      ? ["tests/**/*.test.mjs", ".claude/runtime/tests/**/*.regression.mjs"]
      : [".claude/runtime/tests/**/*.regression.mjs"];
  return runNodeTestPatterns(patterns);
}

function runInstallerSelfTest() {
  try {
    execFileSync(process.execPath, ["installer/install.mjs", "--self-test"], { stdio: "inherit" });
    return { name: "installer-self-test", status: "PASS" };
  } catch {
    return { name: "installer-self-test", status: "FAIL" };
  }
}

export function detectMode(cwd = process.cwd()) {
  return existsSync(`${cwd}/tests`) && existsSync(`${cwd}/installer`) ? "dev" : "installed";
}

// skipNodeTests exists solely so this module's own test suite can verify
// checkRegistry/checkPolicies/mode-detection without recursively re-spawning
// the entire suite (runNodeTests("dev") would otherwise re-run this very test
// file, which would call runSelfTest again, forking indefinitely).
export function runSelfTest(cwd = process.cwd(), { skipNodeTests = false } = {}) {
  const mode = detectMode(cwd);
  const results = [checkRegistry(), checkPolicies(), checkStructure(cwd)];
  if (!skipNodeTests) results.push(runNodeTests(mode));
  if (mode === "dev" && !skipNodeTests) results.push(runInstallerSelfTest());
  const status = results.every((r) => r.status === "PASS") ? "PASS" : "FAIL";
  return { status, mode, results };
}

function main() {
  const report = runSelfTest();
  console.log(JSON.stringify({ status: report.status, mode: report.mode, results: report.results.map((r) => ({ name: r.name, status: r.status })) }, null, 2));
  process.exitCode = report.status === "PASS" ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
