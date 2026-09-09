#!/usr/bin/env node
// Verifies .claude/ops/logs/journal.ndjson's hash chain. Exit 0 + PASS if intact
// (including the valid empty case: no journal yet), exit 1 + FAIL with the exact
// broken sequence number otherwise.
import { pathToFileURL } from "node:url";
import { verifyChain } from "./lib/journal.mjs";

function main() {
  const cwd = process.argv.includes("--cwd")
    ? process.argv[process.argv.indexOf("--cwd") + 1]
    : process.cwd();
  const result = verifyChain(cwd);
  console.log(JSON.stringify({ status: result.valid ? "PASS" : "FAIL", ...result }, null, 2));
  process.exitCode = result.valid ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
