import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * FASE 3V-A — Harmoniza as 21 policies `tenant_isolation` legadas que usavam
 * `tenant_id = current_setting('app.current_tenant_id', true)::uuid` SEM WITH CHECK
 * explícito (classificadas RISCO_ALTO na FASE 3U):
 *
 *   - cast `::uuid` quebra quando o GUC custom volta a '' numa conexão reusada;
 *   - ignora o fallback JWT do padrão portável;
 *   - WITH CHECK só existia implicitamente (= USING).
 *
 * Substitui pelo padrão oficial, idêntico funcionalmente (mesmo tenant_id),
 * porém portável e null-safe, com WITH CHECK EXPLÍCITO:
 *
 *   USING      (tenant_id = private_get_tenant_id())
 *   WITH CHECK (tenant_id = private_get_tenant_id())
 *
 * NÃO altera schema, dados, RLS habilitado nem FORCE. NÃO toca em outras policies
 * (super_admin_full_access, org_isolation, roles_visibility) nem nos lotes 3V-B
 * (financial_*, marketing_projects/strategies/tasks…). Idempotente (DROP+CREATE)
 * e reversível (down recria a forma RAW ::uuid original, sem WITH CHECK).
 */
export class HarmonizeRawUuidPolicies20260613000014 implements MigrationInterface {
  name = 'HarmonizeRawUuidPolicies20260613000014';

  private static readonly TABLES = [
    'conversations', 'conversation_messages', 'conversation_notes',
    'conversation_audit_events', 'conversation_auto_messages', 'conversation_business_hours',
    'conversation_channel_accounts', 'conversation_closures', 'conversation_protocol_settings',
    'conversation_queues', 'conversation_quick_replies', 'conversation_sectors',
    'conversation_service_statuses', 'conversation_sla_policies', 'conversation_tags',
    'conversation_transfers',
    'forms', 'form_submissions',
    'marketing_assets', 'marketing_asset_versions', 'marketing_asset_approvals',
  ] as const;
  private static readonly POLICY = 'tenant_isolation';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of HarmonizeRawUuidPolicies20260613000014.TABLES) {
      await queryRunner.query(
        `DROP POLICY IF EXISTS "${HarmonizeRawUuidPolicies20260613000014.POLICY}" ON "${table}"`,
      );
      await queryRunner.query(
        `CREATE POLICY "${HarmonizeRawUuidPolicies20260613000014.POLICY}" ON "${table}" ` +
        `USING (tenant_id = private_get_tenant_id()) ` +
        `WITH CHECK (tenant_id = private_get_tenant_id())`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverte para a forma RAW ::uuid original (USING apenas, sem WITH CHECK).
    for (const table of HarmonizeRawUuidPolicies20260613000014.TABLES) {
      await queryRunner.query(
        `DROP POLICY IF EXISTS "${HarmonizeRawUuidPolicies20260613000014.POLICY}" ON "${table}"`,
      );
      await queryRunner.query(
        `CREATE POLICY "${HarmonizeRawUuidPolicies20260613000014.POLICY}" ON "${table}" ` +
        `USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid)`,
      );
    }
  }
}
