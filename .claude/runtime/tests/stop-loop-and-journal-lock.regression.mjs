// Regression test proving the lock primitive (lib/lock.mjs, used by hooks.mjs's
// withStopLoopGuard) actually excludes a REAL concurrent OS process — not just a
// second in-process function call — and that the journal chain stays valid
// across a lock-guarded write. Run via: node --test .claude/runtime/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { withStopLoopGuard, lockPathFor } from "../hooks.mjs";
import { addRecord } from "../lib/record-store.mjs";
import { verifyChain } from "../lib/journal.mjs";
import { checkSync } from "./helpers/check-sync.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const HOLD_LOCK = join(__dirname, "helpers", "hold-lock.mjs");
const ACQUIRE_ATTEMPT = join(__dirname, "helpers", "acquire-attempt.mjs");

function tempDir() {
  return mkdtempSync(join(tmpdir(), "eos-lock-test-"));
}

function waitForOutput(script, args, marker) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [script, ...args]);
    let out = "";
    child.stdout.on("data", (d) => {
      out += d.toString();
      if (out.includes(marker)) resolve({ child, out: () => out });
    });
  });
}

test("a real concurrent process is BLOCKED while another process holds the lock, then succeeds after release", async () => {
  const dir = tempDir();
  const lockPath = join(dir, "test.lock");
  const releaseSignal = join(dir, "release.signal");
  try {
    const { child } = await waitForOutput(HOLD_LOCK, [lockPath, releaseSignal], "ACQUIRED");
    // Confirm the precondition explicitly: the lock file must be visible to THIS
    // process before asserting a third process also sees it as held — otherwise a
    // false BLOCKED->ACQUIRED flake here would silently prove nothing.
    assert.equal(existsSync(lockPath), true, "lock file should exist once the child reported ACQUIRED");

    const duringHold = execFileSync(process.execPath, [ACQUIRE_ATTEMPT, lockPath], { encoding: "utf8" }).trim();
    assert.equal(duringHold, "BLOCKED");

    // Explicit release via sentinel file instead of a fixed timer — robust
    // regardless of how much system load slows the two spawned processes down.
    writeFileSync(releaseSignal, "go");
    await new Promise((resolve) => child.on("exit", resolve));

    const afterRelease = execFileSync(process.execPath, [ACQUIRE_ATTEMPT, lockPath], { encoding: "utf8" }).trim();
    assert.equal(afterRelease, "ACQUIRED");

    assert.deepEqual(checkSync(lockPath), { exists: false, valid: true });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("withStopLoopGuard reports ALREADY_RUNNING against a lock a real process is holding, without running its callback", async () => {
  const dir = tempDir();
  const lockPath = lockPathFor(dir, "guarded");
  const releaseSignal = join(dir, "release.signal");
  let ranCallback = false;
  try {
    const { child } = await waitForOutput(HOLD_LOCK, [lockPath, releaseSignal], "ACQUIRED");

    const outcome = await withStopLoopGuard(dir, "guarded", async () => {
      ranCallback = true;
    });
    assert.equal(outcome.status, "BLOCKED");
    assert.equal(outcome.reason, "ALREADY_RUNNING");
    assert.equal(ranCallback, false);

    writeFileSync(releaseSignal, "go");
    await new Promise((resolve) => child.on("exit", resolve));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("journal chain stays valid across writes made while holding a stop-loop guard", async () => {
  const dir = tempDir();
  execFileSync("git", ["init", "-q"], { cwd: dir });
  execFileSync("git", ["config", "user.email", "a@a.com"], { cwd: dir });
  execFileSync("git", ["config", "user.name", "a"], { cwd: dir });
  try {
    const outcome = await withStopLoopGuard(dir, "test-task", async () => {
      addRecord(dir, "decision", { topic: "t1", decision: "d1", decidedBy: "x" });
      addRecord(dir, "decision", { topic: "t2", decision: "d2", decidedBy: "x" });
      return "done";
    });
    assert.equal(outcome.status, "OK");
    assert.equal(outcome.result, "done");

    const chain = verifyChain(dir);
    assert.equal(chain.valid, true);
    assert.equal(chain.entryCount, 2);

    // The lock must be released after the guarded function completes.
    assert.equal(existsSync(join(dir, ".claude", "ops", "runtime", "test-task.lock")), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("withStopLoopGuard releases the lock even when the callback throws", async () => {
  const dir = tempDir();
  try {
    const outcome = await withStopLoopGuard(dir, "throwing-task", async () => {
      throw new Error("boom");
    }).catch((e) => ({ status: "THREW", message: e.message }));
    assert.equal(outcome.status, "THREW");
    assert.equal(existsSync(join(dir, ".claude", "ops", "runtime", "throwing-task.lock")), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
