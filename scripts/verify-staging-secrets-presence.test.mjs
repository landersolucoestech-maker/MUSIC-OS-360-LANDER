import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluatePresence, REQUIRED_STAGING_SECRETS, OPTIONAL_STAGING_SECRETS } from './verify-staging-secrets-presence.mjs';

test('all required secrets present -> ok', () => {
  const result = evaluatePresence(REQUIRED_STAGING_SECRETS);
  assert.equal(result.ok, true);
  assert.deepEqual(result.missingRequired, []);
});

test('one required secret missing -> not ok, reported by name', () => {
  const partial = REQUIRED_STAGING_SECRETS.filter((n) => n !== 'STAGING_DATABASE_URL');
  const result = evaluatePresence(partial);
  assert.equal(result.ok, false);
  assert.deepEqual(result.missingRequired, ['STAGING_DATABASE_URL']);
});

test('optional secrets missing does not affect ok', () => {
  const result = evaluatePresence(REQUIRED_STAGING_SECRETS);
  const missingOptional = result.optional.filter((o) => !o.present);
  assert.deepEqual(missingOptional.map((o) => o.name), OPTIONAL_STAGING_SECRETS);
  assert.equal(result.ok, true);
});

test('no secrets present at all -> not ok, all required missing', () => {
  const result = evaluatePresence([]);
  assert.equal(result.ok, false);
  assert.deepEqual(result.missingRequired, REQUIRED_STAGING_SECRETS);
});

test('extraneous unrelated secret names are ignored', () => {
  const result = evaluatePresence([...REQUIRED_STAGING_SECRETS, 'SOME_UNRELATED_SECRET']);
  assert.equal(result.ok, true);
});
