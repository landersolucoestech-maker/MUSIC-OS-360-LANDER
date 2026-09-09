#!/usr/bin/env node
// Spawned as a separate OS process: attempts to acquire the given lock exactly
// once and prints ACQUIRED or BLOCKED, then exits (releasing if it acquired).
// Used to prove the lock excludes a real concurrent process, not just a second
// in-process call on the same event loop.
import { acquireLock, releaseLock } from "../../lib/lock.mjs";

const lockPath = process.argv[2];
const result = acquireLock(lockPath);
if (result.acquired) {
  console.log("ACQUIRED");
  releaseLock(lockPath);
} else {
  console.log("BLOCKED");
}
