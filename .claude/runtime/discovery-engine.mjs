#!/usr/bin/env node
// Real, dependency-free repository discovery: package-manager/workspace
// detection from actual lockfiles/manifests, language detection from a bounded
// file-extension census, framework/test-tooling detection from package.json's
// real dependency lists (not guessed), and migration/Docker/CI presence checks.
// This is what repo-intelligence's discovery phase actually runs — a real
// filesystem scan, not an LLM guess dressed up as one.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { validate } from "./lib/schema-validate.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", ".next", ".turbo", "coverage", "vendor", "__pycache__"]);

const LOCKFILE_MANAGERS = {
  "pnpm-lock.yaml": "pnpm",
  "package-lock.json": "npm",
  "yarn.lock": "yarn",
  "bun.lockb": "bun",
  "Cargo.lock": "cargo",
  "poetry.lock": "poetry",
  "Pipfile.lock": "pipenv",
  "requirements.txt": "pip",
  "go.sum": "go",
  "Gemfile.lock": "bundler",
  "composer.lock": "composer",
};

const FRAMEWORK_SIGNATURES = {
  react: "react", vue: "vue", "@angular/core": "angular", next: "next.js", nuxt: "nuxt",
  express: "express", fastify: "fastify", "@nestjs/core": "nestjs", koa: "koa",
  django: "django", flask: "flask", "ruby on rails": "rails", rails: "rails",
  "spring-boot": "spring boot",
};

const TEST_TOOLING_SIGNATURES = {
  jest: "jest", vitest: "vitest", mocha: "mocha", ava: "ava", jasmine: "jasmine",
  cypress: "cypress", playwright: "playwright", pytest: "pytest", rspec: "rspec",
};

const LANGUAGE_EXTENSIONS = {
  ".ts": "TypeScript", ".tsx": "TypeScript", ".js": "JavaScript", ".jsx": "JavaScript",
  ".mjs": "JavaScript", ".py": "Python", ".go": "Go", ".rb": "Ruby", ".java": "Java",
  ".rs": "Rust", ".php": "PHP", ".cs": "C#", ".kt": "Kotlin", ".swift": "Swift",
};

function readJsonSafe(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function detectPackageManagers(root) {
  return Object.entries(LOCKFILE_MANAGERS)
    .filter(([file]) => existsSync(join(root, file)))
    .map(([, manager]) => manager);
}

function detectWorkspaces(root) {
  const pkg = readJsonSafe(join(root, "package.json"));
  const workspaces = new Set();
  if (pkg?.workspaces) {
    const list = Array.isArray(pkg.workspaces) ? pkg.workspaces : pkg.workspaces.packages || [];
    for (const w of list) workspaces.add(w);
  }
  if (existsSync(join(root, "pnpm-workspace.yaml"))) {
    const content = readFileSync(join(root, "pnpm-workspace.yaml"), "utf8");
    for (const line of content.split("\n")) {
      const match = line.match(/^\s*-\s*['"]?([^'"\s]+)['"]?\s*$/);
      if (match) workspaces.add(match[1]);
    }
  }
  return [...workspaces];
}

/** Bounded census: walks up to maxFiles files (default 2000), skipping known
 * noise directories, and counts extensions — enough to name the dominant
 * language(s) without becoming a full repository indexer. */
function censusLanguages(root, maxFiles = 2000) {
  const counts = {};
  let visited = 0;
  function walk(dir) {
    if (visited >= maxFiles) return;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (visited >= maxFiles) return;
      if (SKIP_DIRS.has(entry.name)) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else {
        visited++;
        const lang = LANGUAGE_EXTENSIONS[extname(entry.name)];
        if (lang) counts[lang] = (counts[lang] || 0) + 1;
      }
    }
  }
  walk(root);
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([lang]) => lang);
}

function detectFromDependencies(root, signatureMap) {
  const pkg = readJsonSafe(join(root, "package.json"));
  const allDeps = { ...(pkg?.dependencies || {}), ...(pkg?.devDependencies || {}) };
  const found = new Set();
  for (const [depName, label] of Object.entries(signatureMap)) {
    if (allDeps[depName]) found.add(label);
  }
  return [...found];
}

function detectMigrations(root) {
  return ["migrations", "db/migrate", "prisma/migrations", "database/migrations"].some((p) => existsSync(join(root, p)));
}

function detectDocker(root) {
  return existsSync(join(root, "Dockerfile")) || existsSync(join(root, "docker-compose.yml")) || existsSync(join(root, "docker-compose.yaml"));
}

function detectCI(root) {
  return existsSync(join(root, ".github", "workflows")) || existsSync(join(root, ".gitlab-ci.yml")) || existsSync(join(root, ".circleci"));
}

export function discover(root = process.cwd()) {
  const result = {
    packageManagers: detectPackageManagers(root),
    workspaces: detectWorkspaces(root),
    languages: censusLanguages(root),
    frameworks: detectFromDependencies(root, FRAMEWORK_SIGNATURES),
    testTooling: detectFromDependencies(root, TEST_TOOLING_SIGNATURES),
    hasDatabaseMigrations: detectMigrations(root),
    hasDockerfile: detectDocker(root),
    hasCI: detectCI(root),
    scannedAt: new Date().toISOString(),
  };
  const schemaPath = join(__dirname, "..", "contracts", "discovery-result.schema.json");
  const check = validate(schemaPath, result);
  if (!check.valid) throw new Error(`SCHEMA_VALIDATION_FAILED (discovery-result): ${check.errors.join("; ")}`);
  return result;
}

function main() {
  console.log(JSON.stringify(discover(), null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
