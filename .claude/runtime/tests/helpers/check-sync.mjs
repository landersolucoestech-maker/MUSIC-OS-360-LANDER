#!/usr/bin/env node
// Synchronous integrity check for a lock file: does it exist, and if so, is its
// content well-formed JSON with the {pid, acquiredAt} shape lock.mjs writes.
// Used by stop-loop-and-journal-lock.regression.mjs to confirm a lock left no
// corrupt/partial file behind after release.
import { readLock } from "../../lib/lock.mjs";
import { existsSync } from "node:fs";

export function checkSync(lockPath) {
  if (!existsSync(lockPath)) return { exists: false, valid: true };
  const lock = readLock(lockPath);
  const valid = Boolean(lock && !lock.corrupt && typeof lock.pid === "number" && typeof lock.acquiredAt === "string");
  return { exists: true, valid, lock };
}

if (process.argv[2]) {
  console.log(JSON.stringify(checkSync(process.argv[2]), null, 2));
}
