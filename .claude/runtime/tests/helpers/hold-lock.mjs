#!/usr/bin/env node
// Spawned as a separate OS process by stop-loop-and-journal-lock.regression.mjs:
// acquires the given lock, prints "ACQUIRED" so the parent knows it's safe to
// attempt a concurrent acquire, then holds it until a release-signal sentinel
// file appears (polled), rather than a fixed timeout — a fixed short timeout is
// flaky under system load (spawning the *attempting* process can itself take
// longer than the hold window on a busy machine), and OS signals (SIGTERM) are
// not reliably delivered to a Node child on Windows, so a plain file sentinel is
// the portable choice. A real second process is required here — an in-process
// function call cannot prove the lock actually excludes a genuinely concurrent
// execution.
import { existsSync, unlinkSync } from "node:fs";
import { acquireLock, releaseLock } from "../../lib/lock.mjs";

const lockPath = process.argv[2];
const releaseSignalPath = process.argv[3];

const result = acquireLock(lockPath);
if (!result.acquired) {
  console.log("NOT_ACQUIRED");
  process.exit(1);
}
console.log("ACQUIRED");

function release() {
  clearInterval(poll);
  releaseLock(lockPath);
  if (existsSync(releaseSignalPath)) unlinkSync(releaseSignalPath);
  console.log("RELEASED");
  process.exit(0);
}

const poll = setInterval(() => {
  if (existsSync(releaseSignalPath)) release();
}, 20);

// Fallback safety net in case the parent forgets to signal (keeps CI from hanging forever).
setTimeout(release, 10_000);
