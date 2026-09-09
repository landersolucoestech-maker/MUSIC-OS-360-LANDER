#!/usr/bin/env node
// CLI over lib/policy.mjs. `report` loads and validates every policy file;
// `check-tools --agent <name> --tools a,b,c` verifies a proposed tool grant
// doesn't exceed capabilities.json; `is-destructive --cmd "..."` checks a
// command against destructive-operations.json.
import { pathToFileURL } from "node:url";
import { loadAllPolicies, allowedToolsFor, matchDestructive } from "./lib/policy.mjs";

function parseArgs(argv) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) flags[a.slice(2)] = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
    else positional.push(a);
  }
  return { flags, positional };
}

export function report(cwd = process.cwd()) {
  const { policies, errors, valid } = loadAllPolicies(cwd);
  return { valid, loaded: Object.keys(policies), errors };
}

export function checkTools({ agent, tools }, cwd = process.cwd()) {
  const { policies } = loadAllPolicies(cwd);
  const allowed = allowedToolsFor(policies, agent);
  if (allowed === null) return { status: "UNKNOWN_AGENT", agent };
  const requested = tools.split(",").map((t) => t.trim()).filter(Boolean);
  const excess = requested.filter((t) => !allowed.includes(t));
  return { status: excess.length === 0 ? "OK" : "EXCEEDS_CAPABILITY", agent, allowed, requested, excess };
}

export function isDestructive(cmd, cwd = process.cwd()) {
  const { policies } = loadAllPolicies(cwd);
  const match = matchDestructive(policies, cmd);
  return match ? { destructive: true, classification: match.classification, pattern: match.pattern } : { destructive: false };
}

function main() {
  const { flags, positional } = parseArgs(process.argv.slice(2));
  const cmd = positional[0];
  let result;
  if (cmd === "report") result = report();
  else if (cmd === "check-tools") result = checkTools({ agent: flags.agent, tools: flags.tools });
  else if (cmd === "is-destructive") result = isDestructive(flags.cmd || "");
  else result = { status: "ERROR", message: `UNKNOWN_COMMAND: ${cmd}. Use report | check-tools | is-destructive` };
  console.log(JSON.stringify(result, null, 2));
  if (result.valid === false || result.status === "EXCEEDS_CAPABILITY") process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
