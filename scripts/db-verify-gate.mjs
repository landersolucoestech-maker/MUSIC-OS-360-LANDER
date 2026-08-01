#!/usr/bin/env node
/**
 * scripts/db-verify-gate.mjs
 *
 * Decides whether the "DB Verify — Supabase DEV" CI job should actually run
 * its checks against the real DEV branch, and — critically — never lets a
 * missing DATABASE_URL secret look like success. Three outcomes only:
 *
 *   - DB_VERIFY_ENABLED != 'true'            -> "skipped" (deliberate admin
 *     opt-out, exit 0, job still shows green because nothing was supposed
 *     to run — this is a legitimate, reported choice, not a misconfiguration).
 *   - DB_VERIFY_ENABLED == 'true' but no      -> "misconfigured" (exit 1 —
 *     DATABASE_URL                              someone turned the check ON
 *                                                but never gave it anything
 *                                                to connect to; a green job
 *                                                here would be a false
 *                                                positive for "DEV verified").
 *   - DB_VERIFY_ENABLED == 'true' and         -> "enabled" (exit 0, the
 *     DATABASE_URL present                       job proceeds to run real
 *                                                checks against Supabase DEV).
 *
 * Usage (in CI):
 *   node scripts/db-verify-gate.mjs
 * Reads DB_VERIFY_ENABLED and DATABASE_URL from process.env. Writes
 * "enabled=true|false" to $GITHUB_OUTPUT and a message to
 * $GITHUB_STEP_SUMMARY when those files exist; always safe to run locally
 * (falls back to console.log / no-op).
 */
import { appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export function decideGate({ dbVerifyEnabled, hasDatabaseUrl }) {
  if (dbVerifyEnabled !== 'true') {
    return {
      status: 'skipped',
      exitCode: 0,
      enabledOutput: 'false',
      message:
        "DB_VERIFY_ENABLED repo variable is not 'true' — Supabase DEV checks are SKIPPED this run (deliberate opt-out). " +
        'Set DB_VERIFY_ENABLED=true and configure the DATABASE_URL secret (development environment) under Settings > Actions to enable.',
    };
  }
  if (!hasDatabaseUrl) {
    return {
      status: 'misconfigured',
      exitCode: 1,
      enabledOutput: 'false',
      message:
        'DB_VERIFY_ENABLED=true but the DATABASE_URL secret is not configured (development environment). ' +
        'This is a misconfiguration, not a valid skip — failing so this never reads as "Supabase DEV verified" when nothing actually connected.',
    };
  }
  return {
    status: 'enabled',
    exitCode: 0,
    enabledOutput: 'true',
    message: 'DB_VERIFY_ENABLED=true and DATABASE_URL is configured — running Supabase DEV checks.',
  };
}

function main() {
  const result = decideGate({
    dbVerifyEnabled: process.env['DB_VERIFY_ENABLED'],
    hasDatabaseUrl: Boolean(process.env['DATABASE_URL'] && process.env['DATABASE_URL'].trim() !== ''),
  });

  const logFn = result.status === 'misconfigured' ? console.error : console.log;
  const prefix = result.status === 'misconfigured' ? '::error::' : '::warning::';
  logFn(result.status === 'enabled' ? result.message : `${prefix}${result.message}`);

  const githubOutput = process.env['GITHUB_OUTPUT'];
  if (githubOutput) {
    appendFileSync(githubOutput, `enabled=${result.enabledOutput}\n`);
  }
  const githubStepSummary = process.env['GITHUB_STEP_SUMMARY'];
  if (githubStepSummary && result.status !== 'enabled') {
    appendFileSync(githubStepSummary, `${result.message}\n`);
  }

  process.exitCode = result.exitCode;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  main();
}
