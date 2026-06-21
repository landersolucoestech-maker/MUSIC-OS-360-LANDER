import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 20260610000007_EnableRlsOnRbacTables  (M7 — FASE 4 RBAC Enterprise)
 *
 * Ativa RLS no padrão EXISTENTE (private_get_tenant_id() + super_admin_full_access), criado em
 * 20260520000020_RLSPolicies (executa antes desta).
 *
 *  - departments, positions, job_functions, membership_job_functions → tenant_isolation (FORCE RLS).
 *  - roles → globais (tenant_id IS NULL) visíveis a todos; escrita só no próprio tenant.
 *  - permissions e role_permissions → SEM RLS (catálogo global; sem tenant_id — decisão D3).
 *    A API conecta via service role; RLS é a 2ª defesa para conexões diretas PostgREST/Realtime.
 *  - org_members já possui RLS adequada desde 20260520000020 — não é re-tocada.
 *
 * Idempotente (DROP POLICY IF EXISTS antes de CREATE). Reversível via down().
 */
export class EnableRlsOnRbacTables20260610000007 implements MigrationInterface {
  name = 'EnableRlsOnRbacTables20260610000007';

  private readonly TENANT_TABLES = [
    'departments',
    'positions',
    'job_functions',
    'membership_job_functions',
  ];

  async up(qr: QueryRunner): Promise<void> {
    // ── Tabelas tenant-scoped: padrão idêntico ao RLSPolicies ───────────────────
    for (const table of this.TENANT_TABLES) {
      await qr.query(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`);
      await qr.query(`ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY`);
      await qr.query(`DROP POLICY IF EXISTS "tenant_isolation"       ON "${table}"`);
      await qr.query(`DROP POLICY IF EXISTS "super_admin_full_access" ON "${table}"`);
      await qr.query(`
        CREATE POLICY "super_admin_full_access" ON "${table}"
          FOR ALL TO authenticated
          USING ((auth.jwt()->'app_metadata'->>'role')::text = 'super_admin')
          WITH CHECK ((auth.jwt()->'app_metadata'->>'role')::text = 'super_admin')
      `);
      await qr.query(`
        CREATE POLICY "tenant_isolation" ON "${table}"
          FOR ALL TO authenticated
          USING (tenant_id = private_get_tenant_id())
          WITH CHECK (tenant_id = private_get_tenant_id())
      `);
    }

    // ── roles: globais visíveis (tenant_id NULL); custom isolado por tenant ─────
    await qr.query(`ALTER TABLE "roles" ENABLE ROW LEVEL SECURITY`);
    await qr.query(`ALTER TABLE "roles" FORCE ROW LEVEL SECURITY`);
    await qr.query(`DROP POLICY IF EXISTS "roles_visibility"        ON "roles"`);
    await qr.query(`DROP POLICY IF EXISTS "super_admin_full_access" ON "roles"`);
    await qr.query(`
      CREATE POLICY "super_admin_full_access" ON "roles"
        FOR ALL TO authenticated
        USING ((auth.jwt()->'app_metadata'->>'role')::text = 'super_admin')
        WITH CHECK ((auth.jwt()->'app_metadata'->>'role')::text = 'super_admin')
    `);
    await qr.query(`
      CREATE POLICY "roles_visibility" ON "roles"
        FOR ALL TO authenticated
        USING ("tenant_id" IS NULL OR "tenant_id" = private_get_tenant_id())
        WITH CHECK ("tenant_id" = private_get_tenant_id())
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    for (const table of this.TENANT_TABLES) {
      await qr.query(`DROP POLICY IF EXISTS "tenant_isolation"       ON "${table}"`);
      await qr.query(`DROP POLICY IF EXISTS "super_admin_full_access" ON "${table}"`);
      await qr.query(`ALTER TABLE "${table}" DISABLE ROW LEVEL SECURITY`);
    }
    await qr.query(`DROP POLICY IF EXISTS "roles_visibility"        ON "roles"`);
    await qr.query(`DROP POLICY IF EXISTS "super_admin_full_access" ON "roles"`);
    await qr.query(`ALTER TABLE "roles" DISABLE ROW LEVEL SECURITY`);
  }
}
