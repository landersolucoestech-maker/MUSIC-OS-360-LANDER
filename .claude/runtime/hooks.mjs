#!/usr/bin/env node
// Cross-cutting hook points: (1) checkCommand flags a destructive command per
// destructive-operations.json before it runs; (2) withStopLoopGuard prevents the
// same named task (e.g. a scheduled task, or an autonomous loop re-entering
// itself) from running twice concurrently, using the exclusive file lock in
// lib/lock.mjs. This is what .claude/scheduled_tasks.lock is for in practice.
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { loadAllPolicies, matchDestructive } from "./lib/policy.mjs";
import { acquireWithStaleBreak, releaseLock } from "./lib/lock.mjs";

export function checkCommand(cmd, cwd = process.cwd()) {
  const { policies } = loadAllPolicies(cwd);
  const match = matchDestructive(policies, cmd);
  return match
    ? { flagged: true, classification: match.classification, message: `Command matches a destructive pattern (${match.classification}); see .claude/policies/authority.json for the required approval-request before proceeding.` }
    : { flagged: false };
}

const DEFAULT_STALE_MS = 30 * 60 * 1000; // 30 minutes: a lock older than this is almost certainly an orphan from a crashed run, not a real concurrent execution.

export function lockPathFor(cwd, taskId) {
  return taskId === "scheduled_tasks"
    ? join(cwd, ".claude", "scheduled_tasks.lock")
    : join(cwd, ".claude", "ops", "runtime", `${taskId}.lock`);
}

/** Runs fn() only if the named task isn't already running elsewhere; releases the lock afterward (success or throw). */
export async function withStopLoopGuard(cwd, taskId, fn, { staleMs = DEFAULT_STALE_MS } = {}) {
  const lockPath = lockPathFor(cwd, taskId);
  const acquired = acquireWithStaleBreak(lockPath, staleMs, { meta: { taskId } });
  if (!acquired.acquired) {
    return { status: "BLOCKED", reason: "ALREADY_RUNNING", taskId, lockPath };
  }
  try {
    const result = await fn();
    return { status: "OK", result };
  } finally {
    releaseLock(lockPath);
  }
}

function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === "check-command") {
    console.log(JSON.stringify(checkCommand(rest.join(" ")), null, 2));
  } else {
    console.log(JSON.stringify({ status: "ERROR", message: "USAGE: hooks.mjs check-command <command...>" }, null, 2));
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
