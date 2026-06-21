import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 20260612000002_FixAppJwtInsufficientPrivilege
 *
 * P2-8 hotfix for app_jwt() (defined in 20260612000001_PortableRlsTenantContext).
 *
 * Root cause: app_jwt() (SECURITY INVOKER) calls auth.jwt() as a best-effort
 * fallback. When the API connects via a NOBYPASSRLS application role that lacks
 * USAGE on the `auth` schema, `auth.jwt()` raises SQLSTATE 42501
 * (insufficient_privilege → "permission denied for schema auth"). The original
 * EXCEPTION handler only trapped undefined_function / invalid_schema_name /
 * undefined_object, so the privilege error propagated and broke every RLS policy
 * evaluation that referenced app_jwt() / app_is_super_admin().
 *
 * Minimal fix: also trap `insufficient_privilege` so the function degrades to the
 * portable `request.jwt.claims` path and returns '{}' when the auth schema is not
 * reachable. This does NOT weaken RLS: an empty JWT simply means "no super_admin
 * claim", so tenant_isolation (current_setting('app.current_tenant_id')) still
 * governs access. No policy/grant/owner/security-mode change.
 *
 * Reversible: down() restores the previous handler (without insufficient_privilege).
 */
export class FixAppJwtInsufficientPrivilege20260612000002 implements MigrationInterface {
  name = 'FixAppJwtInsufficientPrivilege20260612000002';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION app_jwt()
      RETURNS jsonb
      LANGUAGE plpgsql
      STABLE
      AS $fn$
      DECLARE
        v_claims jsonb;
      BEGIN
        v_claims := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb;
        IF v_claims IS NOT NULL THEN
          RETURN v_claims;
        END IF;
        BEGIN
          v_claims := auth.jwt();
        EXCEPTION
          WHEN undefined_function OR invalid_schema_name OR undefined_object
            OR insufficient_privilege THEN
            v_claims := NULL;
        END;
        RETURN COALESCE(v_claims, '{}'::jsonb);
      END;
      $fn$
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION app_jwt()
      RETURNS jsonb
      LANGUAGE plpgsql
      STABLE
      AS $fn$
      DECLARE
        v_claims jsonb;
      BEGIN
        v_claims := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb;
        IF v_claims IS NOT NULL THEN
          RETURN v_claims;
        END IF;
        BEGIN
          v_claims := auth.jwt();
        EXCEPTION
          WHEN undefined_function OR invalid_schema_name OR undefined_object THEN
            v_claims := NULL;
        END;
        RETURN COALESCE(v_claims, '{}'::jsonb);
      END;
      $fn$
    `);
  }
}
