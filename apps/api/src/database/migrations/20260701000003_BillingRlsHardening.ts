import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Hardening RLS das tabelas de billing gerenciadas por sistema.
 *
 * PROBLEMA (evidência): billing.service / billing-enforcement.service usam
 * DATA_SOURCE, que em produção (DATABASE_SESSION_CONTEXT_ENABLED=true) conecta
 * como `musicos_app` — role LOGIN NOBYPASSRLS, membro de `authenticated`.
 * As tabelas tenant_billing_state / payment_events / billing_settings tinham
 * RLS ENABLE mas NENHUMA policy → para uma role não-owner isso é DENY-ALL
 * (o webhook não grava payment_events/tenant_billing_state; enforcement quebra).
 *
 * CORREÇÃO: FORCE ROW LEVEL SECURITY (fail-closed, consistente com as demais
 * tabelas) + policies mínimas usando os helpers portáveis app_current_tenant_id()
 * e app_is_super_admin() (migration 20260612000001).
 *
 * Modelo de acesso:
 *  - Caminho de SISTEMA (webhook @Public / schedulers): sem app.current_tenant_id
 *    → app_current_tenant_id() = NULL → acesso liberado (necessário p/ idempotência
 *    do webhook e enforcement). Rotas de tenant SEMPRE têm contexto setado, então
 *    nunca caem nesse ramo.
 *  - Sessão de TENANT: vê/altera apenas a própria linha (tenant_id).
 *  - super_admin: acesso total (endpoints admin de suspensão/reativação).
 */
export class BillingRlsHardening20260701000003 implements MigrationInterface {
  name = 'BillingRlsHardening20260701000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── tenant_billing_state (tenant-scoped) ────────────────────────────────
    await queryRunner.query(`ALTER TABLE "tenant_billing_state" ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE "tenant_billing_state" FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`DROP POLICY IF EXISTS "super_admin_full_access" ON "tenant_billing_state"`);
    await queryRunner.query(`
      CREATE POLICY "super_admin_full_access" ON "tenant_billing_state"
        FOR ALL TO authenticated
        USING (app_is_super_admin()) WITH CHECK (app_is_super_admin())
    `);
    await queryRunner.query(`DROP POLICY IF EXISTS "tenant_billing_state_access" ON "tenant_billing_state"`);
    await queryRunner.query(`
      CREATE POLICY "tenant_billing_state_access" ON "tenant_billing_state"
        FOR ALL TO authenticated
        USING (app_current_tenant_id() IS NULL OR tenant_id = app_current_tenant_id())
        WITH CHECK (app_current_tenant_id() IS NULL OR tenant_id = app_current_tenant_id())
    `);

    // ── payment_events (auditoria de sistema; tenant_id nullable) ────────────
    await queryRunner.query(`ALTER TABLE "payment_events" ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE "payment_events" FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`DROP POLICY IF EXISTS "super_admin_full_access" ON "payment_events"`);
    await queryRunner.query(`
      CREATE POLICY "super_admin_full_access" ON "payment_events"
        FOR ALL TO authenticated
        USING (app_is_super_admin()) WITH CHECK (app_is_super_admin())
    `);
    await queryRunner.query(`DROP POLICY IF EXISTS "payment_events_access" ON "payment_events"`);
    await queryRunner.query(`
      CREATE POLICY "payment_events_access" ON "payment_events"
        FOR ALL TO authenticated
        USING (app_current_tenant_id() IS NULL OR tenant_id IS NULL OR tenant_id = app_current_tenant_id())
        WITH CHECK (app_current_tenant_id() IS NULL OR tenant_id IS NULL OR tenant_id = app_current_tenant_id())
    `);

    // ── billing_settings (config global; leitura p/ app, escrita p/ super_admin) ─
    await queryRunner.query(`ALTER TABLE "billing_settings" ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE "billing_settings" FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`DROP POLICY IF EXISTS "billing_settings_read" ON "billing_settings"`);
    await queryRunner.query(`
      CREATE POLICY "billing_settings_read" ON "billing_settings"
        FOR SELECT TO authenticated USING (true)
    `);
    await queryRunner.query(`DROP POLICY IF EXISTS "billing_settings_admin" ON "billing_settings"`);
    await queryRunner.query(`
      CREATE POLICY "billing_settings_admin" ON "billing_settings"
        FOR ALL TO authenticated
        USING (app_is_super_admin()) WITH CHECK (app_is_super_admin())
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP POLICY IF EXISTS "billing_settings_admin" ON "billing_settings"`);
    await queryRunner.query(`DROP POLICY IF EXISTS "billing_settings_read" ON "billing_settings"`);
    await queryRunner.query(`ALTER TABLE "billing_settings" NO FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`DROP POLICY IF EXISTS "payment_events_access" ON "payment_events"`);
    await queryRunner.query(`DROP POLICY IF EXISTS "super_admin_full_access" ON "payment_events"`);
    await queryRunner.query(`ALTER TABLE "payment_events" NO FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`DROP POLICY IF EXISTS "tenant_billing_state_access" ON "tenant_billing_state"`);
    await queryRunner.query(`DROP POLICY IF EXISTS "super_admin_full_access" ON "tenant_billing_state"`);
    await queryRunner.query(`ALTER TABLE "tenant_billing_state" NO FORCE ROW LEVEL SECURITY`);
  }
}
