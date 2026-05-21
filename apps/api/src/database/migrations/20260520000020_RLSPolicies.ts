import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 20260520000020_RLSPolicies
 *
 * Enables Row-Level Security on all tenant-scoped tables.
 *
 * Strategy:
 *  - A helper function `private_get_tenant_id()` resolves the tenant UUID from
 *    the JWT claim `app_metadata.org_id` (injected by the Custom Access Token Hook).
 *  - All domain tables get a single ALL policy for the `authenticated` role.
 *  - `anon` role gets no policies → default deny (cannot read anything).
 *  - `super_admin` role bypasses tenant filter (sees all rows).
 *  - The API backend connects via the service role key → RLS is bypassed at the
 *    API layer (guards enforce tenant isolation). RLS is a second defence for
 *    direct PostgREST / Supabase Realtime connections.
 *
 * Tables covered:
 *   Tenant-scoped (35 tables): all domain tables that carry tenant_id.
 *   Org-scoped (3 tables): organizations, tenants, billing_subscriptions.
 *
 * Rollback: down() disables RLS and drops all policies.
 */
export class RLSPolicies20260520000020 implements MigrationInterface {
  name = 'RLSPolicies20260520000020';

  // ── Tables that carry tenant_id ──────────────────────────────────────────────
  private readonly TENANT_TABLES = [
    'org_members',
    'artists',
    'works',
    'phonograms',
    'contracts',
    'contract_templates',
    'transactions',
    'invoices',
    'clients',
    'leads',
    'lead_interactions',
    'campaigns',
    'briefings',
    'events',
    'projects',
    'releases',
    'shares',
    'takedowns',
    'support_tickets',
    'notifications',
    'uploads',
    'integrations',
    'oauth_connections',
    'webhook_events',
    'audit_logs',
    'ai_jobs',
    'artist_goals',
    'content_detections',
    'ecad_reports',
    'employees',
    'payroll_entries',
    'leave_requests',
    'workflow_transitions',
    'domain_event_log',
    'activity_logs',
  ];

  // ── Org-level tables (no tenant_id, use org_id directly) ────────────────────
  private readonly ORG_TABLES: Array<{ table: string; orgColumn: string }> = [
    { table: 'organizations', orgColumn: 'id' },
    { table: 'tenants', orgColumn: 'org_id' },
    { table: 'billing_subscriptions', orgColumn: 'org_id' },
  ];

  async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. Helper function ─────────────────────────────────────────────────────
    // Returns the tenant id for the current JWT user by joining tenants.org_id
    // with app_metadata.org_id from the JWT. Returns NULL if org_id is absent
    // or no matching tenant — this causes all USING checks to fail (deny).
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

    // Grant execute to authenticated so they can call it via policies.
    await queryRunner.query(`
      GRANT EXECUTE ON FUNCTION private_get_tenant_id() TO authenticated
    `);

    // ── 2. Tenant-scoped tables ────────────────────────────────────────────────
    for (const table of this.TENANT_TABLES) {
      await queryRunner.query(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`);

      // Drop existing policies to make this idempotent.
      await queryRunner.query(`
        DROP POLICY IF EXISTS "tenant_isolation" ON "${table}"
      `);
      await queryRunner.query(`
        DROP POLICY IF EXISTS "super_admin_full_access" ON "${table}"
      `);

      // SUPER_ADMIN sees all rows.
      await queryRunner.query(`
        CREATE POLICY "super_admin_full_access" ON "${table}"
          FOR ALL
          TO authenticated
          USING (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          )
          WITH CHECK (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          )
      `);

      // All other roles see only rows belonging to their tenant.
      await queryRunner.query(`
        CREATE POLICY "tenant_isolation" ON "${table}"
          FOR ALL
          TO authenticated
          USING (
            tenant_id = private_get_tenant_id()
          )
          WITH CHECK (
            tenant_id = private_get_tenant_id()
          )
      `);
    }

    // ── 3. Org-scoped tables ───────────────────────────────────────────────────
    for (const { table, orgColumn } of this.ORG_TABLES) {
      await queryRunner.query(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`);

      await queryRunner.query(`
        DROP POLICY IF EXISTS "org_isolation" ON "${table}"
      `);
      await queryRunner.query(`
        DROP POLICY IF EXISTS "super_admin_full_access" ON "${table}"
      `);

      await queryRunner.query(`
        CREATE POLICY "super_admin_full_access" ON "${table}"
          FOR ALL
          TO authenticated
          USING (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          )
          WITH CHECK (
            (auth.jwt()->'app_metadata'->>'role')::text = 'super_admin'
          )
      `);

      // org_id column name is consistent across all three tables.
      await queryRunner.query(`
        CREATE POLICY "org_isolation" ON "${table}"
          FOR ALL
          TO authenticated
          USING (
            "${orgColumn}"::text = COALESCE(
              auth.jwt()->'app_metadata'->>'org_id',
              ''
            )
          )
          WITH CHECK (
            "${orgColumn}"::text = COALESCE(
              auth.jwt()->'app_metadata'->>'org_id',
              ''
            )
          )
      `);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of [
      ...this.TENANT_TABLES,
      ...this.ORG_TABLES.map((entry) => entry.table),
    ]) {
      await queryRunner.query(`
        DROP POLICY IF EXISTS "tenant_isolation"       ON "${table}"
      `);
      await queryRunner.query(`
        DROP POLICY IF EXISTS "org_isolation"          ON "${table}"
      `);
      await queryRunner.query(`
        DROP POLICY IF EXISTS "super_admin_full_access" ON "${table}"
      `);
      await queryRunner.query(`ALTER TABLE "${table}" DISABLE ROW LEVEL SECURITY`);
    }

    await queryRunner.query(`DROP FUNCTION IF EXISTS private_get_tenant_id()`);
  }
}
