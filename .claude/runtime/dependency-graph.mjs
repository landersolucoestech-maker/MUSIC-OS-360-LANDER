#!/usr/bin/env node
// Real, dependency-free MODULE-LEVEL import graph for JS/TS (and basic Python)
// source files: extracts static `import ... from '...'`, `require('...')`, and
// `from . import x` statements via regex, resolves relative specifiers to real
// files in the repo, and builds a file-to-file graph. Explicit scope boundary:
// this is a MODULE graph, not a function-level SYMBOL/CALL graph — that needs a
// real AST parser, which this pack does not vendor (staying dependency-free).
// Powers cross-layer-impact's "who else imports this file" and automatic scope
// expansion (findConsumers), and residue-search's dead-file detection
// (findOrphans) with real, re-derivable data instead of a human's grep.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, resolve, extname, relative } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { validate } from "./lib/schema-validate.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", ".next", ".turbo", "coverage"]);
const JS_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];
const RESOLVE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", "/index.ts", "/index.tsx", "/index.js", "/index.mjs"];

const IMPORT_PATTERNS = [
  /import\s+(?:[\w*{}\s,]+\s+from\s+)?['"]([^'"]+)['"]/g,
  /export\s+(?:[\w*{}\s,]+\s+from\s+)?['"]([^'"]+)['"]/g,
  /require\(\s*['"]([^'"]+)['"]\s*\)/g,
];

function listSourceFiles(root, maxFiles = 3000) {
  const files = [];
  function walk(dir) {
    if (files.length >= maxFiles) return;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (files.length >= maxFiles) return;
      if (SKIP_DIRS.has(entry.name)) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (JS_EXTENSIONS.includes(extname(entry.name))) files.push(full);
    }
  }
  walk(root);
  return files;
}

function extractSpecifiers(content) {
  const specifiers = [];
  for (const pattern of IMPORT_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(content))) specifiers.push(match[1]);
  }
  return specifiers;
}

function resolveSpecifier(fromFile, specifier) {
  if (!specifier.startsWith(".")) return null; // external package — not a repo-internal edge
  const base = resolve(dirname(fromFile), specifier);
  if (existsSync(base) && statSync(base).isFile()) return base;
  for (const ext of RESOLVE_EXTENSIONS) {
    const candidate = base + ext;
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

export function buildGraph(root = process.cwd()) {
  const files = listSourceFiles(root);
  const nodes = new Set();
  const edges = [];
  const unresolvedImports = [];

  for (const file of files) {
    const relFile = relative(root, file).replace(/\\/g, "/");
    nodes.add(relFile);
    const content = readFileSync(file, "utf8");
    for (const specifier of extractSpecifiers(content)) {
      const resolved = resolveSpecifier(file, specifier);
      if (resolved) {
        edges.push({ from: relFile, to: relative(root, resolved).replace(/\\/g, "/") });
      } else if (specifier.startsWith(".")) {
        unresolvedImports.push({ from: relFile, specifier });
      }
    }
  }

  const graph = { nodes: [...nodes], edges, unresolvedImports, scannedAt: new Date().toISOString() };
  const schemaPath = join(__dirname, "..", "contracts", "dependency-graph.schema.json");
  const check = validate(schemaPath, graph);
  if (!check.valid) throw new Error(`SCHEMA_VALIDATION_FAILED (dependency-graph): ${check.errors.join("; ")}`);
  return graph;
}

/** Files that (directly) import `targetFile` — the real basis for "automatic
 * scope expansion": if you're changing targetFile, these are what else needs
 * to be in the batch. */
export function findConsumers(graph, targetFile) {
  return graph.edges.filter((e) => e.to === targetFile).map((e) => e.from);
}

/** Files nothing in the repo imports — dead-file candidates for residue-search,
 * NOT a final verdict (an entry point, a CLI script, or a file loaded
 * dynamically will correctly show up here and needs human/agent judgment). */
export function findOrphans(graph) {
  const imported = new Set(graph.edges.map((e) => e.to));
  return graph.nodes.filter((n) => !imported.has(n));
}

function main() {
  console.log(JSON.stringify(buildGraph(), null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
