// Generic file-per-record CRUD backing every kind in record-kinds.mjs: validates
// against that kind's schema, writes .claude/ops/<dir>/<id>.json atomically, and
// appends a journal entry — one mechanism instead of a bespoke store per record
// kind (approval, assumption, changeset, conflict, decision, ...).
import { readdirSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { newId, nowIso, readJson, writeJsonAtomic } from "./core.mjs";
import { validate } from "./schema-validate.mjs";
import { appendEvent } from "./journal.mjs";
import { RECORD_KINDS } from "./record-kinds.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

function contractsDir(cwd) {
  const local = join(cwd, ".claude", "contracts");
  return existsSync(local) ? local : join(__dirname, "..", "..", "contracts");
}

function kindConfig(kind) {
  const cfg = RECORD_KINDS[kind];
  if (!cfg) throw new Error(`UNKNOWN_RECORD_KIND: ${kind}. Known: ${Object.keys(RECORD_KINDS).join(", ")}`);
  return cfg;
}

export function addRecord(cwd, kind, fields) {
  const cfg = kindConfig(kind);
  const record = { id: newId(kind.slice(0, 4)), createdAt: nowIso(), ...fields };
  const schemaPath = join(contractsDir(cwd), cfg.schema);
  const result = validate(schemaPath, record);
  if (!result.valid) throw new Error(`SCHEMA_VALIDATION_FAILED (${kind}): ${result.errors.join("; ")}`);
  const dir = join(cwd, cfg.dir);
  mkdirSync(dir, { recursive: true });
  writeJsonAtomic(join(dir, `${record.id}.json`), record);
  appendEvent(cwd, kind, record.id);
  return record;
}

export function getRecord(cwd, kind, id) {
  const cfg = kindConfig(kind);
  const path = join(cwd, cfg.dir, `${id}.json`);
  return existsSync(path) ? readJson(path) : null;
}

export function updateRecord(cwd, kind, id, patch) {
  const existing = getRecord(cwd, kind, id);
  if (!existing) throw new Error(`RECORD_NOT_FOUND: ${kind}/${id}`);
  const updated = { ...existing, ...patch };
  const cfg = kindConfig(kind);
  const schemaPath = join(contractsDir(cwd), cfg.schema);
  const result = validate(schemaPath, updated);
  if (!result.valid) throw new Error(`SCHEMA_VALIDATION_FAILED (${kind}): ${result.errors.join("; ")}`);
  writeJsonAtomic(join(cwd, cfg.dir, `${id}.json`), updated);
  appendEvent(cwd, kind, id);
  return updated;
}

export function listRecords(cwd, kind) {
  const cfg = kindConfig(kind);
  const dir = join(cwd, cfg.dir);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => readJson(join(dir, f)));
}
