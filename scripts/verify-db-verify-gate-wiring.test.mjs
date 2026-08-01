import test from 'node:test';
import assert from 'node:assert/strict';
import { checkGateJobWiring, extractJobBlock } from './verify-db-verify-gate-wiring.mjs';

test('both env vars correctly wired -> PASS', () => {
  const jobBlock = `
  db-verify-supabase-dev:
    env:
      DATABASE_URL: \${{ secrets.DATABASE_URL }}
      DB_VERIFY_ENABLED: \${{ vars.DB_VERIFY_ENABLED }}
  `;
  const result = checkGateJobWiring(jobBlock);
  assert.equal(result.ok, true);
});

test('DB_VERIFY_ENABLED missing entirely -> FAIL (the actual bug found today)', () => {
  const jobBlock = `
  db-verify-supabase-dev:
    env:
      DATABASE_URL: \${{ secrets.DATABASE_URL }}
  `;
  const result = checkGateJobWiring(jobBlock);
  assert.equal(result.ok, false);
  assert.match(result.reasons[0], /DB_VERIFY_ENABLED/);
});

test('DATABASE_URL missing entirely -> FAIL', () => {
  const jobBlock = `
  db-verify-supabase-dev:
    env:
      DB_VERIFY_ENABLED: \${{ vars.DB_VERIFY_ENABLED }}
  `;
  const result = checkGateJobWiring(jobBlock);
  assert.equal(result.ok, false);
  assert.match(result.reasons[0], /DATABASE_URL/);
});

test('env vars present but pointing at the wrong context -> FAIL', () => {
  const jobBlock = `
  db-verify-supabase-dev:
    env:
      DATABASE_URL: \${{ vars.DATABASE_URL }}
      DB_VERIFY_ENABLED: \${{ secrets.DB_VERIFY_ENABLED }}
  `;
  const result = checkGateJobWiring(jobBlock);
  assert.equal(result.ok, false);
  assert.equal(result.reasons.length, 2);
});

test('job block not found (null) -> FAIL', () => {
  const result = checkGateJobWiring(null);
  assert.equal(result.ok, false);
  assert.match(result.reasons[0], /not found/);
});

test('extractJobBlock: finds the named job and stops at the next sibling job', () => {
  const source = [
    'jobs:',
    '  quality:',
    '    name: Lint',
    '  db-verify-supabase-dev:',
    '    env:',
    '      FOO: bar',
    '  release-tag:',
    '    name: Tag Release',
  ].join('\n');
  const block = extractJobBlock(source, 'db-verify-supabase-dev');
  assert.match(block, /FOO: bar/);
  assert.doesNotMatch(block, /Tag Release/);
  assert.doesNotMatch(block, /Lint/);
});

test('extractJobBlock: returns null for a job that does not exist', () => {
  const source = 'jobs:\n  quality:\n    name: Lint\n';
  const block = extractJobBlock(source, 'db-verify-supabase-dev');
  assert.equal(block, null);
});
