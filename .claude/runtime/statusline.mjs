#!/usr/bin/env node
// Claude Code statusline provider: a one-line summary of the current mission
// (if any) for the target project this pack is installed in. Reads
// .claude/ops/state.json only — never mutates anything.
import { pathToFileURL } from "node:url";
import { loadState } from "./lib/state-store.mjs";

export function statusLine(cwd = process.cwd()) {
  const state = loadState(cwd);
  if (!state) return "engineering-os: no active mission";
  const openFindings = state.findings.filter((f) => !f.disposition).length;
  const openCriteria = state.requirements.flatMap((r) => r.acceptanceCriteria).filter((c) => c.status !== "closed").length;
  const openBlockers = state.blockers.filter((b) => !b.resolved).length;
  const impact = state.impact?.effective || "?";
  return `engineering-os: ${state.missionName} [${state.status}] impact=${impact} openCriteria=${openCriteria} openFindings=${openFindings} blockers=${openBlockers}`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(statusLine());
}
