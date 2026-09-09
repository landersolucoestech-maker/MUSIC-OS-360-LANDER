// Append-only, hash-chained event journal at .claude/ops/logs/journal.ndjson.
// Shared by lib/record-store.mjs (appends on every write) and journal-verify.mjs
// (replays the chain to detect corruption/tampering/truncation) — one
// implementation of the hash computation, not two independently-maintained ones.
import { existsSync, mkdirSync, appendFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";

const GENESIS_HASH = "0".repeat(64);

export function journalPath(cwd) {
  return join(cwd, ".claude", "ops", "logs", "journal.ndjson");
}

function computeHash(entryWithoutHash) {
  return createHash("sha256").update(JSON.stringify(entryWithoutHash)).digest("hex");
}

function readLines(path) {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8").split("\n").filter(Boolean);
}

export function lastEntry(cwd) {
  const lines = readLines(journalPath(cwd));
  return lines.length ? JSON.parse(lines[lines.length - 1]) : null;
}

export function appendEvent(cwd, kind, recordId) {
  const path = journalPath(cwd);
  mkdirSync(dirname(path), { recursive: true });
  const prev = lastEntry(cwd);
  const seq = prev ? prev.seq + 1 : 1;
  const prevHash = prev ? prev.hash : GENESIS_HASH;
  const base = { seq, kind, recordId, at: new Date().toISOString(), prevHash };
  const hash = computeHash(base);
  const entry = { ...base, hash };
  appendFileSync(path, JSON.stringify(entry) + "\n", "utf8");
  return entry;
}

/** Replays the full chain. Returns { valid, entryCount, brokenAtSeq } — brokenAtSeq is
 * null when valid, otherwise the first seq whose prevHash/hash doesn't match. */
export function verifyChain(cwd) {
  const lines = readLines(journalPath(cwd));
  let expectedPrevHash = GENESIS_HASH;
  for (const line of lines) {
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      return { valid: false, entryCount: lines.length, brokenAtSeq: null, reason: "MALFORMED_JSON_LINE" };
    }
    if (entry.prevHash !== expectedPrevHash) {
      return { valid: false, entryCount: lines.length, brokenAtSeq: entry.seq, reason: "PREV_HASH_MISMATCH" };
    }
    const { hash, ...base } = entry;
    if (computeHash(base) !== hash) {
      return { valid: false, entryCount: lines.length, brokenAtSeq: entry.seq, reason: "HASH_MISMATCH" };
    }
    expectedPrevHash = hash;
  }
  return { valid: true, entryCount: lines.length, brokenAtSeq: null };
}
