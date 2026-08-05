/**
 * Extracts the Supabase project ref from DATABASE_URL and confirms it
 * matches a specific expected ref — never MAIN, never a denylisted
 * historical ref, never anything unrecognized. Pure and testable; never
 * includes the connection string in its result, only the extracted ref (a
 * short, public-looking project ID) on success or a reason string on
 * failure.
 *
 * Used as an explicit, standalone confirmation step in CI jobs that touch a
 * real Supabase environment (see scripts/verify-supabase-dev-ref.ts and
 * scripts/verify-supabase-staging-ref.ts), on top of assertDatabaseCommandEnv
 * (already enforced at datasource.ts module load for every
 * db:check/verify:rls invocation).
 */
import {
  extractSupabaseRef,
  SUPABASE_DEV_REF,
  SUPABASE_STAGING_REF,
  SUPABASE_PROD_REF,
  SUPABASE_REF_DENYLIST,
} from './env.schema';

export type DevRefValidation =
  | { ok: true; ref: string }
  | { ok: false; reason: string };

export function validateSupabaseRef(
  databaseUrl: string | undefined,
  expectedRef: string,
  expectedLabel: string,
): DevRefValidation {
  if (!databaseUrl || databaseUrl.trim() === '') {
    return { ok: false, reason: 'DATABASE_URL is not set' };
  }
  const ref = extractSupabaseRef(databaseUrl);
  if (!ref) {
    return { ok: false, reason: 'Supabase project ref could not be extracted from DATABASE_URL' };
  }
  if (ref === SUPABASE_PROD_REF && expectedRef !== SUPABASE_PROD_REF) {
    return { ok: false, reason: 'DATABASE_URL points at the PRODUCTION ref — refusing to proceed' };
  }
  if (SUPABASE_REF_DENYLIST.includes(ref)) {
    return { ok: false, reason: `DATABASE_URL points at a denylisted ref ("${ref}")` };
  }
  if (ref !== expectedRef) {
    return { ok: false, reason: `DATABASE_URL ref ("${ref}") is not the expected ${expectedLabel} ref` };
  }
  return { ok: true, ref };
}

export function validateSupabaseDevRef(databaseUrl: string | undefined): DevRefValidation {
  return validateSupabaseRef(databaseUrl, SUPABASE_DEV_REF, 'DEV');
}

export function validateSupabaseStagingRef(databaseUrl: string | undefined): DevRefValidation {
  return validateSupabaseRef(databaseUrl, SUPABASE_STAGING_REF, 'STAGING');
}
