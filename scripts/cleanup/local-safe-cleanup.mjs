import { lstat, readdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "../..");

const removableTargets = [
  ".tmp",
  ".tmp-audit",
  ".validation-shots",
  "dist",
  "build",
  "coverage",
  ".turbo",
  ".vitest-cache",
];

const protectedTargets = [
  "backups",
  "apps/api/src/database/migrations",
  "apps/api/src/modules/auth",
  "apps/api/src/modules/billing",
  "apps/api/src/modules/users",
  "apps/api/src/core/guards",
  "apps/api/src/modules/uploads",
  "apps/api/src/storage",
];

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const apply = args.has("--apply");

if (dryRun === apply) {
  console.error("Usage: node scripts/cleanup/local-safe-cleanup.mjs --dry-run|--apply");
  process.exit(2);
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(2)} ${units[index]}`;
}

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

const protectedAbsolute = protectedTargets.map((target) => path.resolve(workspaceRoot, target));

function assertSafeTarget(absPath) {
  if (!isInside(workspaceRoot, absPath)) {
    throw new Error(`Refusing path outside workspace: ${absPath}`);
  }

  if (absPath === workspaceRoot) {
    throw new Error("Refusing to remove workspace root");
  }

  for (const protectedPath of protectedAbsolute) {
    if (isInside(protectedPath, absPath) || isInside(absPath, protectedPath)) {
      throw new Error(`Refusing protected path overlap: ${absPath}`);
    }
  }
}

async function collectStats(absPath) {
  const stat = await lstat(absPath);

  if (!stat.isDirectory()) {
    return {
      files: 1,
      directories: 0,
      bytes: stat.size,
    };
  }

  let files = 0;
  let directories = 1;
  let bytes = 0;
  const entries = await readdir(absPath, { withFileTypes: true });

  for (const entry of entries) {
    const child = path.join(absPath, entry.name);
    if (entry.isDirectory()) {
      const nested = await collectStats(child);
      files += nested.files;
      directories += nested.directories;
      bytes += nested.bytes;
    } else {
      const childStat = await lstat(child);
      files += 1;
      bytes += childStat.size;
    }
  }

  return { files, directories, bytes };
}

const summary = {
  mode: dryRun ? "dry-run" : "apply",
  targetsFound: 0,
  files: 0,
  directories: 0,
  bytes: 0,
  removed: [],
  missing: [],
  errors: [],
};

console.log(`[repo-clean] workspace=${workspaceRoot}`);
console.log(`[repo-clean] mode=${summary.mode}`);
console.log("[repo-clean] protected paths:");
for (const target of protectedTargets) {
  console.log(`  - ${target}`);
}

for (const target of removableTargets) {
  const absPath = path.resolve(workspaceRoot, target);

  try {
    assertSafeTarget(absPath);

    if (!existsSync(absPath)) {
      summary.missing.push(target);
      console.log(`[repo-clean] missing: ${target}`);
      continue;
    }

    const stats = await collectStats(absPath);
    summary.targetsFound += 1;
    summary.files += stats.files;
    summary.directories += stats.directories;
    summary.bytes += stats.bytes;

    console.log(
      `[repo-clean] found: ${target} files=${stats.files} dirs=${stats.directories} size=${formatBytes(stats.bytes)}`,
    );

    if (apply) {
      await rm(absPath, { recursive: true, force: true });
      summary.removed.push(target);
      console.log(`[repo-clean] removed: ${target}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    summary.errors.push({ target, message });
    console.error(`[repo-clean] error: ${target}: ${message}`);
  }
}

console.log("");
console.log("[repo-clean] summary");
console.log(`mode=${summary.mode}`);
console.log(`targets_found=${summary.targetsFound}`);
console.log(`files_found=${summary.files}`);
console.log(`directories_found=${summary.directories}`);
console.log(`estimated_size=${formatBytes(summary.bytes)}`);
console.log(`removed=${summary.removed.length ? summary.removed.join(", ") : "none"}`);
console.log(`missing=${summary.missing.length ? summary.missing.join(", ") : "none"}`);
console.log(`errors=${summary.errors.length}`);

if (summary.errors.length > 0) {
  process.exit(1);
}

if (dryRun) {
  console.log("[repo-clean] dry-run complete; no files were removed.");
} else {
  console.log("[repo-clean] apply complete.");
}
