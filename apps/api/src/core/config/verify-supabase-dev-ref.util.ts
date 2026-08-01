/**
 * Extracts the Supabase project ref from DATABASE_URL and confirms it is
 * the DEV branch ref — never MAIN, never production, never anything
 * unrecognized. Pure and testable; never includes the connection string in
 * its result, only the extracted ref (a short, public-looking project ID)
 * on success or a reason string on failure.
 *
 * Used as an explicit, standalone confirmation step in the "DB Verify —
 * Supabase DEV" CI job (see scripts/verify-supabase-dev-ref.ts), on top of
 * assertDatabaseCommandEnv (already enforced at datasource.ts module load
 * for every db:check/verify:rls invocation).
 */
import {
  extractSupabaseRef,
  SUPABASE_DEV_REF,
  SUPABASE_MAIN_REF,
  SUPABASE_REF_DENYLIST,
} from './env.schema';

export type DevRefValidation =
  | { ok: true; ref: string }
  | { ok: false; reason: string };

export function validateSupabaseDevRef(databaseUrl: string | undefined): DevRefValidation {
  if (!databaseUrl || databaseUrl.trim() === '') {
    return { ok: false, reason: 'DATABASE_URL is not set' };
  }
  const ref = extractSupabaseRef(databaseUrl);
  if (!ref) {
    return { ok: false, reason: 'Supabase project ref could not be extracted from DATABASE_URL' };
  }
  if (ref === SUPABASE_MAIN_REF) {
    return { ok: false, reason: 'DATABASE_URL points at the MAIN ref — refusing to proceed' };
  }
  if (SUPABASE_REF_DENYLIST.includes(ref)) {
    return { ok: false, reason: `DATABASE_URL points at a denylisted ref ("${ref}")` };
  }
  if (ref !== SUPABASE_DEV_REF) {
    return { ok: false, reason: `DATABASE_URL ref ("${ref}") is not the expected DEV ref` };
  }
  return { ok: true, ref };
}
