#!/usr/bin/env node
// Bounded historical recall — NOT policy, permission, task state, or proof.
// Source-backed entries (--source <file>) record that file's content hash and
// flip to potentially_stale when the file changes. Unsourced entries flip to
// historical when the workspace fingerprint differs from the one recorded at
// write time. Never used by completion-gate.mjs to satisfy a gate.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { sha256File, workspaceFingerprint } from "./lib/hash.mjs";
import { shortId } from "./lib/state-store.mjs";
import { validate } from "./lib/schema-validate.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
function memoryEntrySchemaPath(cwd) {
  const local = join(cwd, ".claude", "contracts", "memory-entry.schema.json");
  return existsSync(local) ? local : join(__dirname, "..", "contracts", "memory-entry.schema.json");
}

// Lives inside .claude/ops/memory/ (a directory, per the ops model — not a bare
// .claude/ops/memory.json file) so the memory store sits alongside the other
// per-concern ops directories (evidence/, checkpoints/, baselines/, effects/)
// rather than as a lone flat file at the ops root.
const MEMORY_FILE = ".claude/ops/memory/entries.json";

function memPath(cwd) {
  return join(cwd, MEMORY_FILE);
}

function load(cwd) {
  const p = memPath(cwd);
  if (!existsSync(p)) return [];
  return JSON.parse(readFileSync(p, "utf8"));
}

function save(list, cwd) {
  const p = memPath(cwd);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(list, null, 2) + "\n", "utf8");
}

function parseFlags(argv) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      if (eq !== -1) flags[a.slice(2, eq)] = a.slice(eq + 1);
      else flags[a.slice(2)] = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
    } else positional.push(a);
  }
  return { flags, positional };
}

export function remember({ flags, cwd }) {
  if (!flags.key || !flags.text) throw new Error('USAGE: remember --key <slug> --text "..." [--source <file>]');
  const list = load(cwd);
  const entry = {
    id: shortId("mem"),
    key: flags.key,
    text: flags.text,
    source: flags.source || null,
    sourceHash: flags.source ? sha256File(join(cwd, flags.source)) : null,
    workspaceFingerprintAtWrite: flags.source ? null : workspaceFingerprint(cwd).fingerprint ?? null,
    createdAt: new Date().toISOString(),
    supersededBy: null,
  };
  const result = validate(memoryEntrySchemaPath(cwd), entry);
  if (!result.valid) throw new Error(`SCHEMA_VALIDATION_FAILED (memory-entry): ${result.errors.join("; ")}`);
  // Supersede prior entries with the same key rather than silently rewriting them.
  for (const e of list) if (e.key === flags.key && !e.supersededBy) e.supersededBy = entry.id;
  list.push(entry);
  save(list, cwd);
  return { status: "OK", entry };
}

export function recall({ flags, cwd }) {
  const list = load(cwd);
  const filtered = flags.key ? list.filter((e) => e.key === flags.key) : list;
  return filtered.map((e) => annotateStaleness(e, cwd));
}

function annotateStaleness(entry, cwd) {
  let staleness = "fresh";
  if (entry.supersededBy) {
    staleness = "superseded";
  } else if (entry.source) {
    const current = existsSync(join(cwd, entry.source)) ? sha256File(join(cwd, entry.source)) : null;
    staleness = current === entry.sourceHash ? "fresh" : "potentially_stale";
  } else if (entry.workspaceFingerprintAtWrite) {
    const current = workspaceFingerprint(cwd).fingerprint ?? null;
    staleness = current === entry.workspaceFingerprintAtWrite ? "fresh" : "historical";
  }
  return { ...entry, staleness };
}

export function check({ cwd }) {
  const list = load(cwd).map((e) => annotateStaleness(e, cwd));
  return {
    total: list.length,
    fresh: list.filter((e) => e.staleness === "fresh").length,
    potentiallyStale: list.filter((e) => e.staleness === "potentially_stale").length,
    historical: list.filter((e) => e.staleness === "historical").length,
    superseded: list.filter((e) => e.staleness === "superseded").length,
    entries: list,
  };
}

const COMMANDS = { remember, recall, check };

export function dispatch(argv, cwd = process.cwd()) {
  const { flags, positional } = parseFlags(argv);
  const key = positional[0];
  if (!COMMANDS[key]) throw new Error(`UNKNOWN_COMMAND: ${key}. Available: ${Object.keys(COMMANDS).join(", ")}`);
  return COMMANDS[key]({ flags, positional, cwd });
}

function main() {
  try {
    console.log(JSON.stringify(dispatch(process.argv.slice(2)), null, 2));
  } catch (err) {
    console.log(JSON.stringify({ status: "ERROR", message: err.message }, null, 2));
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
