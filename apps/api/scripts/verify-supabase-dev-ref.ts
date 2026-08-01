#!/usr/bin/env ts-node
/**
 * scripts/verify-supabase-dev-ref.ts
 *
 * CLI wrapper for validateSupabaseDevRef (see
 * src/core/config/verify-supabase-dev-ref.util.ts, where the tested logic
 * lives — apps/api/scripts/ is outside jest's rootDir, so this file stays a
 * thin, untested-by-design shell). Runs immediately before any query in the
 * "DB Verify — Supabase DEV" CI job: extracts the Supabase project ref from
 * DATABASE_URL and confirms it is the DEV branch ref — never MAIN, never
 * production, never anything unrecognized — before a single query executes.
 * The connection string itself is never logged; only the extracted ref (a
 * short, public-looking project ID) is printed on success.
 *
 * Usage:
 *   npx tsx scripts/verify-supabase-dev-ref.ts
 */
import { validateSupabaseDevRef } from '../src/core/config/verify-supabase-dev-ref.util';

function main(): void {
  const result = validateSupabaseDevRef(process.env['DATABASE_URL']);
  if (!result.ok) {
    console.error(`::error::Supabase DEV ref validation FAILED — ${result.reason}. No query was executed.`);
    process.exitCode = 1;
    return;
  }
  console.log(`Supabase DEV project ref validated: ${result.ref}`);
}

main();
