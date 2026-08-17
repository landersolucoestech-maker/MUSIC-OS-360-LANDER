import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Corrige RLS de `webhook_events` para o mesmo modelo de sistema já aplicado
 * a `payment_events`/`tenant_billing_state` em 20260701000003_BillingRlsHardening.
 *
 * PROBLEMA (reproduzido em homologação real): `webhook_events` ainda usa a
 * policy genérica `tenant_isolation` (20260520000020_RLSPolicies), que exige
 * `tenant_id = private_get_tenant_id()`. O webhook Stripe é `@Public()` e
 * nunca seta app.current_tenant_id (não há sessão de tenant nesse caminho) —
 * então `tenant_id = NULL` avalia NULL, a policy nega o INSERT em
 * BillingService.recordLegacyWebhook(), e a chamada quebra com 500 mesmo com
 * assinatura Stripe válida. Autentique/external-data não sofrem o mesmo
 * problema porque bootstrapam contexto de tenant antes de escrever; o webhook
 * Stripe não faz isso e não deveria precisar fazer — o modelo de sistema
 * (payment_events) já resolve isso corretamente.
 *
 * CORREÇÃO: mesma policy de "caminho de sistema" que payment_events já tem —
 * app_current_tenant_id() IS NULL libera (webhook/scheduler sem sessão),
 * senão exige tenant_id = app_current_tenant_id() (sessão de tenant normal).
 */
export class WebhookEventsRlsSystemPath20260817000002 implements MigrationInterface {
  name = 'WebhookEventsRlsSystemPath20260817000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "webhook_events" ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE "webhook_events" FORCE ROW LEVEL SECURITY`);

    await queryRunner.query(`DROP POLICY IF EXISTS "tenant_isolation" ON "webhook_events"`);
    await queryRunner.query(`DROP POLICY IF EXISTS "super_admin_full_access" ON "webhook_events"`);
    await queryRunner.query(`
      CREATE POLICY "super_admin_full_access" ON "webhook_events"
        FOR ALL TO authenticated
        USING (app_is_super_admin()) WITH CHECK (app_is_super_admin())
    `);
    await queryRunner.query(`DROP POLICY IF EXISTS "webhook_events_access" ON "webhook_events"`);
    await queryRunner.query(`
      CREATE POLICY "webhook_events_access" ON "webhook_events"
        FOR ALL TO authenticated
        USING (app_current_tenant_id() IS NULL OR tenant_id IS NULL OR tenant_id = app_current_tenant_id())
        WITH CHECK (app_current_tenant_id() IS NULL OR tenant_id IS NULL OR tenant_id = app_current_tenant_id())
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP POLICY IF EXISTS "webhook_events_access" ON "webhook_events"`);
    await queryRunner.query(`DROP POLICY IF EXISTS "super_admin_full_access" ON "webhook_events"`);
    await queryRunner.query(`
      CREATE POLICY "super_admin_full_access" ON "webhook_events"
        FOR ALL TO authenticated
        USING ((auth.jwt()->'app_metadata'->>'role')::text = 'super_admin')
        WITH CHECK ((auth.jwt()->'app_metadata'->>'role')::text = 'super_admin')
    `);
    await queryRunner.query(`
      CREATE POLICY "tenant_isolation" ON "webhook_events"
        FOR ALL TO authenticated
        USING (tenant_id = private_get_tenant_id())
        WITH CHECK (tenant_id = private_get_tenant_id())
    `);
  }
}
