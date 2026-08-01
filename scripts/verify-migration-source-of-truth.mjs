#!/usr/bin/env node
/**
 * scripts/verify-migration-source-of-truth.mjs
 *
 * MUSIC OS 360 has exactly one canonical migration system: TypeORM
 * migrations in apps/api/src/database/migrations/, tracked in the
 * musicos360_migrations table (see apps/api/DATABASE.md). supabase/migrations/
 * is a frozen historical artifact (2 legacy SQL files) and is never a second
 * tracker. This guard fails the build the moment that stops being true —
 * before drift accumulates into an actual dual-tracking mess — by checking:
 *
 *   1. supabase/migrations/ contains only the frozen, allowlisted files.
 *   2. No *new* file in supabase/migrations/ shares a timestamp prefix or
 *      normalized name with a TypeORM migration (a hand-mirrored duplicate).
 *   3. datasource.ts — the config db-ops.ts (db:migrate/db:check) actually
 *      loads — still globs apps/api/src/database/migrations and still uses
 *      musicos360_migrations as the tracking table name.
 *
 * Deliberately out of scope: database.module.ts also declares a second,
 * explicit ALL_MIGRATIONS array for the NestJS runtime DataSource, and it
 * has drifted out of sync with the migrations directory (pre-existing,
 * unrelated to supabase/migrations — see apps/api/DATABASE.md). Reconciling
 * that is a separate, dedicated piece of work, not something this guard
 * silently papers over or enforces.
 *
 * Usage:
 *   node scripts/verify-migration-source-of-truth.mjs
 */
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

// Adding a file here is itself the "explicit architectural decision" this
// guard exists to force — it must be a deliberate code change, reviewed like
// any other, never a silent addition.
export const SUPABASE_MIGRATIONS_ALLOWLIST = [
  '20260521071214_initial_schema.sql',
  '20260617233000_reconcile_custom_access_token_hook_tenant_selection.sql',
];

const TYPEORM_FILENAME_RE = /^(\d{14})_([A-Za-z0-9]+)\.ts$/;

export function checkSupabaseMigrationsAllowlist(actualFiles, allowlist = SUPABASE_MIGRATIONS_ALLOWLIST) {
  const allowed = new Set(allowlist);
  const unexpected = actualFiles.filter((f) => f.endsWith('.sql') && !allowed.has(f));
  return {
    ok: unexpected.length === 0,
    unexpected,
  };
}

function normalizeName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Only new (non-allowlisted) supabase/migrations files are checked for
// collisions — the 2 frozen legacy files are already-reviewed history and
// can coincidentally share a name ("initial schema") with an unrelated
// TypeORM migration without that being an attempt at duplicate tracking.
export function checkNoParallelTimestampCollision(typeormFiles, supabaseFiles, allowlist = SUPABASE_MIGRATIONS_ALLOWLIST) {
  const allowed = new Set(allowlist);
  const typeormEntries = typeormFiles
    .map((f) => f.match(TYPEORM_FILENAME_RE))
    .filter(Boolean)
    .map((m) => ({ timestamp: m[1], normalized: normalizeName(m[2]) }));

  const collisions = [];
  for (const sqlFile of supabaseFiles) {
    if (!sqlFile.endsWith('.sql') || allowed.has(sqlFile)) continue;
    const sqlTimestamp = sqlFile.match(/^(\d{14})/)?.[1];
    const sqlNormalized = normalizeName(sqlFile.replace(/\.sql$/, ''));
    for (const entry of typeormEntries) {
      const timestampCollides = sqlTimestamp && sqlTimestamp === entry.timestamp;
      const nameCollides = sqlNormalized.includes(entry.normalized) && entry.normalized.length > 0;
      if (timestampCollides || nameCollides) {
        collisions.push({ supabaseFile: sqlFile, typeormTimestamp: entry.timestamp });
      }
    }
  }
  return { ok: collisions.length === 0, collisions };
}

// datasource.ts (not database.module.ts) is what db-ops.ts actually loads
// for db:migrate/db:check — its `migrations: [path.join(__dirname,
// 'migrations', '*.{ts,js}')]` glob is the real canonical runner config.
export function checkCanonicalRunnerConfig(datasourceSource) {
  const reasons = [];
  if (!datasourceSource.includes("migrationsTableName: 'musicos360_migrations'")) {
    reasons.push("musicos360_migrations tracking table name not found in datasource.ts — did it silently change?");
  }
  // Matches a standalone quoted 'migrations' path segment only — not a
  // substring hit inside an identifier like 'musicos360_migrations'.
  if (!/(['"])migrations\1/.test(datasourceSource)) {
    reasons.push("no migrations glob pointing at './migrations' found — TypeORM runner may no longer point at apps/api/src/database/migrations");
  }
  return { ok: reasons.length === 0, reasons };
}

function main() {
  const supabaseMigrationsDir = path.join(REPO_ROOT, 'supabase', 'migrations');
  const typeormMigrationsDir = path.join(REPO_ROOT, 'apps', 'api', 'src', 'database', 'migrations');
  const datasourcePath = path.join(REPO_ROOT, 'apps', 'api', 'src', 'database', 'datasource.ts');

  const supabaseFiles = readdirSync(supabaseMigrationsDir);
  const typeormFiles = readdirSync(typeormMigrationsDir).filter((f) => f.endsWith('.ts') && !f.endsWith('.spec.ts'));
  const datasourceSource = readFileSync(datasourcePath, 'utf8');

  const results = [
    ['supabase/migrations/ matches the frozen allowlist', checkSupabaseMigrationsAllowlist(supabaseFiles)],
    ['no TypeORM/Supabase migration name or timestamp collision', checkNoParallelTimestampCollision(typeormFiles, supabaseFiles)],
    ['datasource.ts still points at the canonical runner/tracking table', checkCanonicalRunnerConfig(datasourceSource)],
  ];

  let failed = false;
  for (const [label, result] of results) {
    if (result.ok) {
      console.log(`  ✓  ${label}`);
    } else {
      failed = true;
      console.error(`  ✗  ${label}`);
      console.error(`     ${JSON.stringify(result, null, 2).split('\n').join('\n     ')}`);
    }
  }

  if (failed) {
    console.error('\nMigration source-of-truth guard FAILED — see apps/api/DATABASE.md for the canonical-migrations policy.');
    process.exitCode = 1;
    return;
  }
  console.log('\nMigration source-of-truth guard PASSED.');
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  main();
}
