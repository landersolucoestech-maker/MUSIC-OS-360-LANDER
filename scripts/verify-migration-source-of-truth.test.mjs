import test from 'node:test';
import assert from 'node:assert/strict';
import {
  checkSupabaseMigrationsAllowlist,
  checkNoParallelTimestampCollision,
  checkCanonicalRunnerConfig,
  SUPABASE_MIGRATIONS_ALLOWLIST,
} from './verify-migration-source-of-truth.mjs';

test('allowlist: exactly the frozen legacy files -> PASS', () => {
  const result = checkSupabaseMigrationsAllowlist(SUPABASE_MIGRATIONS_ALLOWLIST);
  assert.equal(result.ok, true);
  assert.deepEqual(result.unexpected, []);
});

test('allowlist: an extra .sql file appears -> FAIL', () => {
  const result = checkSupabaseMigrationsAllowlist([
    ...SUPABASE_MIGRATIONS_ALLOWLIST,
    '20260801000000_new_backfill.sql',
  ]);
  assert.equal(result.ok, false);
  assert.deepEqual(result.unexpected, ['20260801000000_new_backfill.sql']);
});

test('allowlist: non-.sql files (e.g. README, .gitkeep) are ignored', () => {
  const result = checkSupabaseMigrationsAllowlist([...SUPABASE_MIGRATIONS_ALLOWLIST, 'README.md', '.gitkeep']);
  assert.equal(result.ok, true);
});

test('collision: no overlap between TypeORM and Supabase files -> PASS', () => {
  const result = checkNoParallelTimestampCollision(
    ['20260731000001_HardenRbacCatalogRls.ts'],
    SUPABASE_MIGRATIONS_ALLOWLIST,
  );
  assert.equal(result.ok, true);
});

test('collision: same timestamp prefix hand-mirrored into supabase/migrations -> FAIL', () => {
  const result = checkNoParallelTimestampCollision(
    ['20260731000001_HardenRbacCatalogRls.ts'],
    ['20260731000001_harden_rbac_catalog_rls.sql'],
  );
  assert.equal(result.ok, false);
  assert.equal(result.collisions.length, 1);
  assert.equal(result.collisions[0].typeormTimestamp, '20260731000001');
});

test('collision: same normalized name but different timestamp -> FAIL', () => {
  const result = checkNoParallelTimestampCollision(
    ['20260731000001_HardenRbacCatalogRls.ts'],
    ['20990101000000_hardenrbaccatalogrls.sql'],
  );
  assert.equal(result.ok, false);
  assert.equal(result.collisions.length, 1);
});

test('collision: allowlisted legacy file coincidentally shares a name -> PASS (already-reviewed history)', () => {
  const result = checkNoParallelTimestampCollision(
    ['20240101000000_InitialSchema.ts'],
    ['20260521071214_initial_schema.sql'],
  );
  assert.equal(result.ok, true);
});

test('runner config: canonical table name and migrations glob present -> PASS', () => {
  const source = `
    migrations: [
      path.join(__dirname, 'migrations', '*.{ts,js}'),
    ],
    migrationsTableName: 'musicos360_migrations',
  `;
  const result = checkCanonicalRunnerConfig(source);
  assert.equal(result.ok, true);
});

test('runner config: tracking table name silently changed -> FAIL', () => {
  const source = `
    migrations: [path.join(__dirname, 'migrations', '*.{ts,js}')],
    migrationsTableName: 'some_other_table',
  `;
  const result = checkCanonicalRunnerConfig(source);
  assert.equal(result.ok, false);
  assert.match(result.reasons[0], /musicos360_migrations/);
});

test('runner config: no longer globs ./migrations -> FAIL', () => {
  const source = `
    migrations: [path.join(__dirname, 'somewhere-else', '*.{ts,js}')],
    migrationsTableName: 'musicos360_migrations',
  `;
  const result = checkCanonicalRunnerConfig(source);
  assert.equal(result.ok, false);
  assert.match(result.reasons[0], /migrations/);
});
