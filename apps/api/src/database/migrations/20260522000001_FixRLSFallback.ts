import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds a current_setting('app.current_tenant_id') fallback to private_get_tenant_id().
 *
 * Why: direct SQL connections (e.g. verify:tenant-isolation, Supabase migrations) run
 * as the postgres superuser which bypasses RLS, OR as the `authenticated` role without
 * a JWT context.  Without a fallback, private_get_tenant_id() returns NULL for every
 * non-JWT call, blocking all operations even for test tooling.
 *
 * Security note: PostgREST/Supabase HTTP sessions cannot set session variables, so
 * the fallback cannot be exploited through the normal API surface. Direct SQL access
 * is already privileged (superuser bypasses RLS anyway).
 */
export class FixRLSFallback20260522000001 implements MigrationInterface {
  name = 'FixRLSFallback20260522000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION private_get_tenant_id()
      RETURNS uuid
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      SET search_path = public, pg_catalog
      AS $$
        SELECT COALESCE(
          -- Primary path: JWT app_metadata.org_id (Supabase HTTP / PostgREST)
          (
            SELECT id
              FROM public.tenants
             WHERE org_id::text = COALESCE(auth.jwt()->'app_metadata'->>'org_id', '')
               AND deleted_at IS NULL
             LIMIT 1
          ),
          -- Fallback: direct tenant UUID via session variable (direct SQL / test tooling)
          CASE
            WHEN current_setting('app.current_tenant_id', true) <> ''
            THEN (current_setting('app.current_tenant_id', true))::uuid
          END
        );
      $$
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION private_get_tenant_id()
      RETURNS uuid
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      SET search_path = public, pg_catalog
      AS $$
        SELECT id
          FROM public.tenants
         WHERE org_id::text = COALESCE(
                 auth.jwt()->'app_metadata'->>'org_id',
                 ''
               )
           AND deleted_at IS NULL
        LIMIT 1;
      $$
    `);
  }
}
