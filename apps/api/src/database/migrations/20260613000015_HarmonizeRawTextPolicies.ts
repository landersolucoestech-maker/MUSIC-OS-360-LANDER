import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * FASE 3V-B — Lote final de harmonização: migra as 15 policies legadas que usam
 * `(tenant_id)::text = current_setting('app.current_tenant_id', true)` (RISCO_MÉDIO
 * na FASE 3U — já possuem WITH CHECK e são ''-safe, porém não-portáveis) para o
 * padrão oficial:
 *
 *   USING      (tenant_id = private_get_tenant_id())
 *   WITH CHECK (tenant_id = private_get_tenant_id())
 *
 * Preserva o NOME EXATO de cada policy (financial_* usam tenant_isolation_<tabela>;
 * marketing_* usam tenant_isolation). NÃO altera schema, dados, RLS habilitado nem
 * FORCE. NÃO toca em outras policies nem nos lotes já concluídos (3V-A ::uuid).
 * Idempotente (DROP+CREATE) e reversível (down recria a forma RAW ::text original).
 */
export class HarmonizeRawTextPolicies20260613000015 implements MigrationInterface {
  name = 'HarmonizeRawTextPolicies20260613000015';

  // [tabela, nome_da_policy]
  private static readonly SPECS: ReadonlyArray<[string, string]> = [
    ['financial_categories', 'tenant_isolation_financial_categories'],
    ['financial_category_audit_logs', 'tenant_isolation_financial_category_audit_logs'],
    ['financial_category_centers', 'tenant_isolation_financial_category_centers'],
    ['financial_category_favorites', 'tenant_isolation_financial_category_favorites'],
    ['financial_category_links', 'tenant_isolation_financial_category_links'],
    ['financial_category_rule_runs', 'tenant_isolation_financial_category_rule_runs'],
    ['financial_category_rules', 'tenant_isolation_financial_category_rules'],
    ['financial_category_templates', 'tenant_isolation_financial_category_templates'],
    ['financial_centers', 'tenant_isolation_financial_centers'],
    ['marketing_projects', 'tenant_isolation'],
    ['marketing_strategies', 'tenant_isolation'],
    ['marketing_strategy_actions', 'tenant_isolation'],
    ['marketing_strategy_initiatives', 'tenant_isolation'],
    ['marketing_strategy_objectives', 'tenant_isolation'],
    ['marketing_tasks', 'tenant_isolation'],
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [table, policy] of HarmonizeRawTextPolicies20260613000015.SPECS) {
      await queryRunner.query(`DROP POLICY IF EXISTS "${policy}" ON "${table}"`);
      await queryRunner.query(
        `CREATE POLICY "${policy}" ON "${table}" ` +
        `USING (tenant_id = private_get_tenant_id()) ` +
        `WITH CHECK (tenant_id = private_get_tenant_id())`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverte para a forma RAW ::text original (USING + WITH CHECK).
    for (const [table, policy] of HarmonizeRawTextPolicies20260613000015.SPECS) {
      await queryRunner.query(`DROP POLICY IF EXISTS "${policy}" ON "${table}"`);
      await queryRunner.query(
        `CREATE POLICY "${policy}" ON "${table}" ` +
        `USING ((tenant_id)::text = current_setting('app.current_tenant_id', true)) ` +
        `WITH CHECK ((tenant_id)::text = current_setting('app.current_tenant_id', true))`,
      );
    }
  }
}
