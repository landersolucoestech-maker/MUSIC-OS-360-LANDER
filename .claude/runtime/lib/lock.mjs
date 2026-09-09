// Exclusive file-based lock used to prevent two concurrent mission/scheduled-task
// runs from writing the journal or run-state at the same time (stop-loop protection).
// Uses O_EXCL create (fs 'wx' flag), which atomically fails if the file already
// exists — the same primitive flock()/mkdir-based locks rely on, no dependency needed.
import { openSync, closeSync, writeSync, readFileSync, unlinkSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { validate } from "./schema-validate.mjs";

// lock.mjs always ships at .claude/runtime/lib/lock.mjs alongside .claude/contracts/,
// in both the pack's own repo and every install target — this relative resolution
// needs no cwd-based fallback the way cwd-scoped modules (memory.mjs, ops.mjs) do.
const LOCK_SCHEMA_PATH = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "contracts", "lock-record.schema.json");

export function acquireLock(lockPath, { pid = process.pid, meta = {} } = {}) {
  try {
    mkdirSync(dirname(lockPath), { recursive: true });
    const payloadObj = { pid, acquiredAt: new Date().toISOString(), ...meta };
    const result = validate(LOCK_SCHEMA_PATH, payloadObj);
    if (!result.valid) throw new Error(`SCHEMA_VALIDATION_FAILED (lock-record): ${result.errors.join("; ")}`);
    const fd = openSync(lockPath, "wx");
    const payload = JSON.stringify(payloadObj);
    writeSync(fd, payload);
    closeSync(fd);
    return { acquired: true, lockPath };
  } catch (err) {
    if (err.code === "EEXIST") return { acquired: false, reason: "LOCK_HELD", lockPath };
    throw err;
  }
}

export function readLock(lockPath) {
  if (!existsSync(lockPath)) return null;
  try {
    return JSON.parse(readFileSync(lockPath, "utf8"));
  } catch {
    return { corrupt: true };
  }
}

export function isStale(lockPath, maxAgeMs) {
  const lock = readLock(lockPath);
  if (!lock || lock.corrupt) return Boolean(lock); // a corrupt lock file counts as stale/breakable
  const age = Date.now() - new Date(lock.acquiredAt).getTime();
  return age > maxAgeMs;
}

export function releaseLock(lockPath) {
  if (existsSync(lockPath)) unlinkSync(lockPath);
}

/** Attempt to acquire, breaking a stale lock first if maxAgeMs is given. */
export function acquireWithStaleBreak(lockPath, maxAgeMs, opts) {
  if (existsSync(lockPath) && maxAgeMs != null && isStale(lockPath, maxAgeMs)) {
    releaseLock(lockPath);
  }
  return acquireLock(lockPath, opts);
}
