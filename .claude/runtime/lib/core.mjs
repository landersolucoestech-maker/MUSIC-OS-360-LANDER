// Cross-cutting primitives shared by the runtime engines (policy-engine, registry,
// graph-engine, gate-engine, journal). Kept separate from state-store.mjs,
// which owns the run-state.json shape specifically.
import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { randomBytes } from "node:crypto";

export function nowIso() {
  return new Date().toISOString();
}

export function newId(prefix) {
  return `${prefix}-${randomBytes(4).toString("hex")}`;
}

export function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

/** Crash-safe write: write to a temp file, then rename over the target (atomic on POSIX and NTFS). */
export function writeJsonAtomic(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp-${process.pid}-${Date.now()}`;
  writeFileSync(tmp, JSON.stringify(data, null, 2) + "\n", "utf8");
  renameSync(tmp, path);
}

export function readJsonSafe(path, fallback) {
  return existsSync(path) ? readJson(path) : fallback;
}
