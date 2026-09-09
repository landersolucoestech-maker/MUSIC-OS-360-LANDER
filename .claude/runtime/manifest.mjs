#!/usr/bin/env node
// Loads .claude/engineering-os.json's `structure` section and turns it into a flat
// list of expected paths with metadata, consumed by validate-pack.mjs and by the
// installer to know what it must copy. This IS the "expected structure" manifest —
// see .claude/engineering-os.json's own description field.
import { readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readJson } from "./lib/core.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

function packRoot(cwd) {
  return existsSync(join(cwd, ".claude", "engineering-os.json")) ? cwd : join(__dirname, "..", "..");
}

export function loadManifest(cwd = process.cwd()) {
  return readJson(join(packRoot(cwd), ".claude", "engineering-os.json"));
}

/** Flat list: { path, required, kind } for every category directory + requiredFiles entry. */
export function expectedPaths(cwd = process.cwd()) {
  const root = packRoot(cwd);
  const manifest = loadManifest(root);
  const out = [];
  for (const [catName, cat] of Object.entries(manifest.structure.categories)) {
    out.push({ path: cat.dir, required: cat.required, kind: "dir", category: catName });
  }
  for (const f of manifest.structure.requiredFiles) out.push({ path: f, required: true, kind: "file", category: "requiredFiles" });
  for (const f of manifest.structure.generatedPerInstall) out.push({ path: f, required: false, kind: "file", category: "generatedPerInstall" });
  return out;
}

function main() {
  console.log(JSON.stringify({ manifest: loadManifest(), expected: expectedPaths() }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
