#!/usr/bin/env node
// Builds and closes ContextPackage delegation records (mission-orchestrator ->
// specialist agent), implementing .claude/rules/agent-orchestration.md's
// "bounded context package" requirement mechanically instead of just as prose.
import { pathToFileURL } from "node:url";
import { addRecord, getRecord, updateRecord, listRecords } from "./lib/record-store.mjs";

function parseArgs(argv) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      if (eq !== -1) flags[a.slice(2, eq)] = a.slice(eq + 1);
      else flags[a.slice(2)] = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
    } else positional.push(a);
  }
  return { flags, positional };
}

export function open({ agent, objective, requirementIds = [], filesInScope = [] }, cwd = process.cwd()) {
  if (!agent || !objective) throw new Error("USAGE: open --agent <name> --objective \"...\"");
  return addRecord(cwd, "delegation", {
    agent, objective,
    requirementIds: Array.isArray(requirementIds) ? requirementIds : requirementIds.split(",").filter(Boolean),
    filesInScope: Array.isArray(filesInScope) ? filesInScope : filesInScope.split(",").filter(Boolean),
    status: "OPEN",
  });
}

export function close(id, cwd = process.cwd()) {
  const existing = getRecord(cwd, "delegation", id);
  if (!existing) throw new Error(`UNKNOWN_DELEGATION: ${id}`);
  return updateRecord(cwd, "delegation", id, { status: "CLOSED" });
}

export function listOpen(cwd = process.cwd()) {
  return listRecords(cwd, "delegation").filter((d) => d.status === "OPEN");
}

function main() {
  const { flags, positional } = parseArgs(process.argv.slice(2));
  const cmd = positional[0];
  let result;
  if (cmd === "open") result = open({ agent: flags.agent, objective: flags.objective, requirementIds: flags.requirement || [], filesInScope: flags.files || [] });
  else if (cmd === "close") result = close(flags.id);
  else if (cmd === "list-open") result = listOpen();
  else result = { status: "ERROR", message: `UNKNOWN_COMMAND: ${cmd}. Use open | close | list-open` };
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
