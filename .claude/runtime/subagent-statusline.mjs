#!/usr/bin/env node
// Statusline scoped to one delegated subagent's context-package (a "delegation"
// record from context-engine.mjs) rather than the whole mission — what a
// subagent's own status line shows: which objective it was given and how much
// of it is still open.
import { pathToFileURL } from "node:url";
import { getRecord } from "./lib/record-store.mjs";

export function subagentStatusLine(delegationId, cwd = process.cwd()) {
  const delegation = getRecord(cwd, "delegation", delegationId);
  if (!delegation) return `engineering-os: unknown delegation ${delegationId}`;
  return `engineering-os: ${delegation.agent} [${delegation.status}] objective="${delegation.objective}" requirements=${delegation.requirementIds.length}`;
}

function main() {
  const id = process.argv[2];
  if (!id) {
    console.log("USAGE: subagent-statusline.mjs <delegation-id>");
    process.exitCode = 1;
    return;
  }
  console.log(subagentStatusLine(id));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
