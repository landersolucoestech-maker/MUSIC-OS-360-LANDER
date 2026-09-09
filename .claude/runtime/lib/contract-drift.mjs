// Real structural diff between two JSON-shaped contracts (JSON Schema files,
// or any two JSON documents with a stable field-set — e.g. two versions of an
// OpenAPI path's response schema in JSON form). Scope boundary, stated
// honestly: this compares field/type PRESENCE, not full JSON Schema semantic
// equivalence (a schema with looser vs. stricter constraints on the same field
// won't be flagged) — sufficient to catch a producer/consumer field-name or
// type mismatch, which is the actual failure mode contract-reviewer looks for.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", ".next", ".turbo", "coverage"]);

function flattenProperties(schema, prefix = "") {
  const fields = {};
  const props = schema?.properties || {};
  for (const [key, value] of Object.entries(props)) {
    const path = prefix ? `${prefix}.${key}` : key;
    fields[path] = { type: value.type ?? null, required: (schema.required || []).includes(key) };
    if (value.type === "object" || value.properties) {
      Object.assign(fields, flattenProperties(value, path));
    }
  }
  return fields;
}

export function diffContracts(schemaA, schemaB) {
  const fieldsA = flattenProperties(schemaA);
  const fieldsB = flattenProperties(schemaB);
  const allKeys = new Set([...Object.keys(fieldsA), ...Object.keys(fieldsB)]);

  const removed = [];
  const added = [];
  const typeChanged = [];
  const requiredChanged = [];

  for (const key of allKeys) {
    const a = fieldsA[key];
    const b = fieldsB[key];
    if (a && !b) removed.push(key);
    else if (!a && b) added.push(key);
    else if (a.type !== b.type) typeChanged.push({ field: key, from: a.type, to: b.type });
    else if (a.required !== b.required) requiredChanged.push({ field: key, from: a.required, to: b.required });
  }

  const breaking = removed.length > 0 || typeChanged.length > 0 || requiredChanged.some((r) => !r.from && r.to);
  return { removed, added, typeChanged, requiredChanged, breaking };
}

export function diffContractFiles(pathA, pathB) {
  return diffContracts(JSON.parse(readFileSync(pathA, "utf8")), JSON.parse(readFileSync(pathB, "utf8")));
}

/** Finds versioned schema pairs by naming convention (name.v1.schema.json /
 * name.v2.schema.json, ...) anywhere under root — the generic basis for
 * "which two contract files should be diffed" that both the completion gate's
 * no-breaking-contract-drift check and scripts/run-torture-audit.mjs share,
 * instead of each reimplementing the same walk. Only consecutive versions are
 * compared (v1->v2, v2->v3, ...). */
export function findVersionedSchemaPairs(root) {
  const byBase = new Map();
  function walk(dir) {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      const match = entry.name.match(/^(.*)\.v(\d+)\.schema\.json$/);
      if (match) {
        const [, base, version] = match;
        const key = join(dir, base);
        if (!byBase.has(key)) byBase.set(key, []);
        byBase.get(key).push({ version: Number(version), path: full });
      }
    }
  }
  walk(root);
  const pairs = [];
  for (const versions of byBase.values()) {
    versions.sort((a, b) => a.version - b.version);
    for (let i = 0; i < versions.length - 1; i++) pairs.push([versions[i], versions[i + 1]]);
  }
  return pairs;
}
