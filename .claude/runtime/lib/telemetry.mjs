// Lightweight local telemetry: append-only ndjson of timing/status events under
// .claude/ops/telemetry/events.ndjson. Distinct from lib/journal.mjs (which is
// a hash-chained AUDIT log of record mutations, checked for tamper-evidence) —
// telemetry is unordered-safe, unverified, purely observational timing data,
// consumed by nothing that gates completion. Written by gate-engine.mjs on
// every gate-definition run so "how long did this gate take, how often does it
// fail" is answerable from real data instead of nothing.
import { existsSync, mkdirSync, appendFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { validate } from "./schema-validate.mjs";

const TELEMETRY_SCHEMA_PATH = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "contracts", "telemetry-event.schema.json");

export function telemetryPath(cwd) {
  return join(cwd, ".claude", "ops", "telemetry", "events.ndjson");
}

export function recordEvent(cwd, name, data = {}) {
  const path = telemetryPath(cwd);
  const event = { name, at: new Date().toISOString(), ...data };
  const result = validate(TELEMETRY_SCHEMA_PATH, event);
  if (!result.valid) throw new Error(`SCHEMA_VALIDATION_FAILED (telemetry-event): ${result.errors.join("; ")}`);
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, JSON.stringify(event) + "\n", "utf8");
  return event;
}

export function readEvents(cwd) {
  const path = telemetryPath(cwd);
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
}
