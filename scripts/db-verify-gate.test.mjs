import test from 'node:test';
import assert from 'node:assert/strict';
import { decideGate } from './db-verify-gate.mjs';

test('DB_VERIFY_ENABLED unset -> skipped, exit 0 (legitimate opt-out)', () => {
  const result = decideGate({ dbVerifyEnabled: undefined, hasDatabaseUrl: true });
  assert.equal(result.status, 'skipped');
  assert.equal(result.exitCode, 0);
  assert.equal(result.enabledOutput, 'false');
});

test('DB_VERIFY_ENABLED=false -> skipped, exit 0, regardless of secret presence', () => {
  const result = decideGate({ dbVerifyEnabled: 'false', hasDatabaseUrl: false });
  assert.equal(result.status, 'skipped');
  assert.equal(result.exitCode, 0);
});

test('DB_VERIFY_ENABLED=true, DATABASE_URL missing -> misconfigured, exit 1 (never a silent success)', () => {
  const result = decideGate({ dbVerifyEnabled: 'true', hasDatabaseUrl: false });
  assert.equal(result.status, 'misconfigured');
  assert.equal(result.exitCode, 1);
  assert.equal(result.enabledOutput, 'false');
  assert.match(result.message, /misconfiguration/);
});

test('DB_VERIFY_ENABLED=true, DATABASE_URL present -> enabled, exit 0', () => {
  const result = decideGate({ dbVerifyEnabled: 'true', hasDatabaseUrl: true });
  assert.equal(result.status, 'enabled');
  assert.equal(result.exitCode, 0);
  assert.equal(result.enabledOutput, 'true');
});

test('DB_VERIFY_ENABLED=TRUE (wrong case) is treated as not-enabled, never enabled by accident', () => {
  const result = decideGate({ dbVerifyEnabled: 'TRUE', hasDatabaseUrl: true });
  assert.equal(result.status, 'skipped');
});

test('a whitespace-only value never counts as a real secret', () => {
  // The caller passes hasDatabaseUrl as a precomputed boolean (main() trims
  // and checks non-empty before calling), so this documents that contract.
  const result = decideGate({ dbVerifyEnabled: 'true', hasDatabaseUrl: false });
  assert.equal(result.status, 'misconfigured');
});
