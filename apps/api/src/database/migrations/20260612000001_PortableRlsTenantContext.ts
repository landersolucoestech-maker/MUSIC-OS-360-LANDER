import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 20260612000001_PortableRlsTenantContext
 *
 * Makes the Row-Level Security layer portable across any PostgreSQL provider
 * (Supabase, AWS RDS, Aurora, Google Cloud SQL, Azure, Neon, Railway, Render,
 * self-hosted) by removing the hard dependency on Supabase's `auth.jwt()` from
 * the tenant-resolution function and from the `super_admin_full_access` /
 * `org_isolation` policies originally created in 20260520000020_RLSPolicies.
 *
 * ── Portable session-variable contract ──────────────────────────────────────
 * Set per transaction by the application (via a future query-runner / SET LOCAL)
 * or by direct SQL tooling:
 *   - app.current_tenant_id : tenant UUID  (primary tenant isolation key)
 *   - app.current_org_id    : org UUID     (org-scoped tables)
 *   - app.current_role      : effective role (e.g. 'super_admin')
 *
 * ── Backward compatibility ──────────────────────────────────────────────────
 * When a Supabase/PostgREST JWT context is present, the helpers still resolve
 * org/role/tenant from `app_metadata`, so the existing Supabase HTTP surface
 * keeps working unchanged. The JWT path is GUARDED (plpgsql EXCEPTION block) so
 * it NEVER errors on a vanilla PostgreSQL where `auth.jwt()` does not exist.
 *
 * ── Fail-closed ─────────────────────────────────────────────────────────────
 * When neither a session variable nor a JWT is available, every helper returns
 * NULL / FALSE → USING / WITH CHECK comparisons evaluate to NULL → deny.
 *
 * ── Reversibility ───────────────────────────────────────────────────────────
 * down() restores the `auth.jwt()`-based definitions verbatim (the state left by
 * 20260522000001_FixRLSFallback + 20260520000020_RLSPolicies) and drops the new
 * portable helpers. NON-destructive: no table or row is touched, only functions
 * and policy expressions are swapped.
 */
export class PortableRlsTenantContext20260612000001 implements MigrationInterface {
  name = 'PortableRlsTenantContext20260612000001';

  // Tenant-scoped tables carrying tenant_id (mirror of 20260520000020_RLSPolicies).
  private readonly TENANT_TABLES = [
    'org_members', 'artists', 'works', 'phonograms', 'contracts',
    'contract_templates', 'transactions', 'invoices', 'clients', 'leads',
    'lead_interactions', 'campaigns', 'briefings', 'events', 'projects',
    'releases', 'shares', 'takedowns', 'support_tickets', 'notifications',
    'uploads', 'integrations', 'oauth_connections', 'webhook_events',
    'audit_logs', 'ai_jobs', 'artist_goals', 'content_detections',
    'ecad_reports', 'employees', 'payroll_entries', 'leave_requests',
    'workflow_transitions', 'domain_event_log', 'activity_logs',
  ];

  // Org-level tables (no tenant_id, isolated by an org column).
  private readonly ORG_TABLES: Array<{ table: string; orgColumn: string }> = [
    { table: 'organizations', orgColumn: 'id' },
    { table: 'tenants', orgColumn: 'org_id' },
    { table: 'billing_subscriptions', orgColumn: 'org_id' },
  ];

  async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. Portable JWT accessor ────────────────────────────────────────────
    // Reads PostgREST-standard `request.jwt.claims` GUC when present; falls back
    // to Supabase `auth.jwt()` only if that function exists. Never throws.
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

    // ── 2. Portable tenant resolver (fail-closed) ───────────────────────────
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION app_current_tenant_id()
      RETURNS uuid
      LANGUAGE plpgsql
      STABLE
      SECURITY DEFINER
      SET search_path = public, pg_catalog
      AS $fn$
      DECLARE
        v_tenant text;
        v_org    text;
      BEGIN
        -- 1. Portable session variable (works on any PostgreSQL).
        v_tenant := NULLIF(current_setting('app.current_tenant_id', true), '');
        IF v_tenant IS NOT NULL THEN
          RETURN v_tenant::uuid;
        END IF;
        -- 2. Supabase/PostgREST JWT: derive tenant from app_metadata.org_id.
        v_org := app_jwt()->'app_metadata'->>'org_id';
        IF v_org IS NULL OR v_org = '' THEN
          RETURN NULL;  -- fail-closed
        END IF;
        RETURN (
          SELECT id FROM public.tenants
           WHERE org_id::text = v_org AND deleted_at IS NULL
           LIMIT 1
        );
      END;
      $fn$
    `);

    // ── 3. Portable org resolver ────────────────────────────────────────────
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION app_current_org_id()
      RETURNS text
      LANGUAGE plpgsql
      STABLE
      AS $fn$
      DECLARE
        v_org text;
      BEGIN
        v_org := NULLIF(current_setting('app.current_org_id', true), '');
        IF v_org IS NOT NULL THEN
          RETURN v_org;
        END IF;
        RETURN NULLIF(app_jwt()->'app_metadata'->>'org_id', '');
      END;
      $fn$
    `);

    // ── 4. Portable super_admin predicate ───────────────────────────────────
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION app_is_super_admin()
      RETURNS boolean
      LANGUAGE plpgsql
      STABLE
      AS $fn$
      DECLARE
        v_role text;
      BEGIN
        v_role := NULLIF(current_setting('app.current_role', true), '');
        IF v_role IS NOT NULL THEN
          RETURN v_role = 'super_admin';
        END IF;
        RETURN COALESCE(app_jwt()->'app_metadata'->>'role', '') = 'super_admin';
      END;
      $fn$
    `);

    // ── 5. Re-point private_get_tenant_id() to the portable resolver ────────
    // Existing `tenant_isolation` policies reference private_get_tenant_id();
    // delegating keeps them working without rewriting 35 policies.
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION private_get_tenant_id()
      RETURNS uuid
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      SET search_path = public, pg_catalog
      AS $fn$ SELECT app_current_tenant_id() $fn$
    `);

    // ── 6. Grants ───────────────────────────────────────────────────────────
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
          GRANT EXECUTE ON FUNCTION app_jwt(), app_current_tenant_id(),
            app_current_org_id(), app_is_super_admin() TO authenticated;
        END IF;
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
          GRANT EXECUTE ON FUNCTION app_jwt(), app_current_tenant_id(),
            app_current_org_id(), app_is_super_admin() TO service_role;
        END IF;
      END $$
    `);

    // ── 7. Rewrite super_admin policies on tenant tables (drop auth.jwt) ────
    for (const table of this.TENANT_TABLES) {
      await queryRunner.query(`
        DO $$
        BEGIN
          IF to_regclass('public.${table}') IS NOT NULL THEN
            DROP POLICY IF EXISTS "super_admin_full_access" ON public."${table}";
            CREATE POLICY "super_admin_full_access" ON public."${table}"
              FOR ALL TO authenticated
              USING (app_is_super_admin())
              WITH CHECK (app_is_super_admin());
          END IF;
        END $$
      `);
    }

    // ── 8. Rewrite super_admin + org_isolation policies on org tables ───────
    for (const { table, orgColumn } of this.ORG_TABLES) {
      await queryRunner.query(`
        DO $$
        BEGIN
          IF to_regclass('public.${table}') IS NOT NULL THEN
            DROP POLICY IF EXISTS "super_admin_full_access" ON public."${table}";
            CREATE POLICY "super_admin_full_access" ON public."${table}"
              FOR ALL TO authenticated
              USING (app_is_super_admin())
              WITH CHECK (app_is_super_admin());

            DROP POLICY IF EXISTS "org_isolation" ON public."${table}";
            CREATE POLICY "org_isolation" ON public."${table}"
              FOR ALL TO authenticated
              USING ("${orgColumn}"::text = app_current_org_id())
              WITH CHECK ("${orgColumn}"::text = app_current_org_id());
          END IF;
        END $$
      `);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // ── Restore auth.jwt()-based super_admin policies on tenant tables ──────
    for (const table of this.TENANT_TABLES) {
      await queryRunner.query(`
        DO $$
        BEGIN
          IF to_regclass('public.${table}') IS NOT NULL THEN
            DROP POLICY IF EXISTS "super_admin_full_access" ON public."${table}";
            CREATE POLICY "super_admin_full_access" ON public."${table}"
              FOR ALL TO authenticated
              USING ((auth.jwt()->'app_metadata'->>'role')::text = 'super_admin')
              WITH CHECK ((auth.jwt()->'app_metadata'->>'role')::text = 'super_admin');
          END IF;
        END $$
      `);
    }

    // ── Restore auth.jwt()-based policies on org tables ─────────────────────
    for (const { table, orgColumn } of this.ORG_TABLES) {
      await queryRunner.query(`
        DO $$
        BEGIN
          IF to_regclass('public.${table}') IS NOT NULL THEN
            DROP POLICY IF EXISTS "super_admin_full_access" ON public."${table}";
            CREATE POLICY "super_admin_full_access" ON public."${table}"
              FOR ALL TO authenticated
              USING ((auth.jwt()->'app_metadata'->>'role')::text = 'super_admin')
              WITH CHECK ((auth.jwt()->'app_metadata'->>'role')::text = 'super_admin');

            DROP POLICY IF EXISTS "org_isolation" ON public."${table}";
            CREATE POLICY "org_isolation" ON public."${table}"
              FOR ALL TO authenticated
              USING ("${orgColumn}"::text = COALESCE(auth.jwt()->'app_metadata'->>'org_id', ''))
              WITH CHECK ("${orgColumn}"::text = COALESCE(auth.jwt()->'app_metadata'->>'org_id', ''));
          END IF;
        END $$
      `);
    }

    // ── Restore private_get_tenant_id() to the FixRLSFallback definition ────
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION private_get_tenant_id()
      RETURNS uuid
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      SET search_path = public, pg_catalog
      AS $fn$
        SELECT COALESCE(
          (
            SELECT id
              FROM public.tenants
             WHERE org_id::text = COALESCE(auth.jwt()->'app_metadata'->>'org_id', '')
               AND deleted_at IS NULL
             LIMIT 1
          ),
          CASE
            WHEN current_setting('app.current_tenant_id', true) <> ''
            THEN (current_setting('app.current_tenant_id', true))::uuid
          END
        );
      $fn$
    `);

    // ── Drop portable helpers ───────────────────────────────────────────────
    await queryRunner.query(`DROP FUNCTION IF EXISTS app_is_super_admin()`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS app_current_org_id()`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS app_current_tenant_id()`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS app_jwt()`);
  }
}
