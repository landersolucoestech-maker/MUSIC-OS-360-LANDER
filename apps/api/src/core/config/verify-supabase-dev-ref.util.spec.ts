import { validateSupabaseDevRef } from './verify-supabase-dev-ref.util';
import { SUPABASE_DEV_REF, SUPABASE_MAIN_REF, SUPABASE_PROD_REF } from './env.schema';

function pooler(ref: string): string {
  return `postgresql://postgres.${ref}:pw@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;
}

describe('validateSupabaseDevRef', () => {
  it('accepts the real DEV ref', () => {
    const result = validateSupabaseDevRef(pooler(SUPABASE_DEV_REF));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.ref).toBe(SUPABASE_DEV_REF);
  });

  it('rejects the MAIN ref explicitly', () => {
    const result = validateSupabaseDevRef(pooler(SUPABASE_MAIN_REF));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/MAIN/);
  });

  it('rejects the production ref', () => {
    const result = validateSupabaseDevRef(pooler(SUPABASE_PROD_REF));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/not the expected DEV ref/);
  });

  it('rejects a denylisted historical ref', () => {
    const result = validateSupabaseDevRef(pooler('sxdhnhoupjrnntrmjtyn'));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/denylisted/);
  });

  it('rejects an unknown/unrecognized ref', () => {
    const result = validateSupabaseDevRef(pooler('completelyunknownref00'));
    expect(result.ok).toBe(false);
  });

  it('rejects when DATABASE_URL is empty', () => {
    const result = validateSupabaseDevRef('');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/not set/);
  });

  it('rejects when DATABASE_URL is undefined', () => {
    const result = validateSupabaseDevRef(undefined);
    expect(result.ok).toBe(false);
  });

  it('rejects a malformed URL with no extractable ref', () => {
    const result = validateSupabaseDevRef('postgresql://localhost:5432/musicos360');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/could not be extracted/);
  });

  it('never includes the connection string itself in the failure reason', () => {
    const secretLookingUrl = pooler(SUPABASE_MAIN_REF).replace('pw', 'sUp3rS3cr3tPassw0rd');
    const result = validateSupabaseDevRef(secretLookingUrl);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).not.toContain('sUp3rS3cr3tPassw0rd');
  });
});
