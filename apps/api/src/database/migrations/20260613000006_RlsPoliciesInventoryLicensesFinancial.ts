import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * FASE 3B — Sub-lote A (corretivo): cria a policy padrão portável nas três
 * tabelas que a auditoria 3A apontou com RLS=ENABLED, FORCE RLS=ENABLED e
 * ZERO policies — ou seja, hoje em DENY TOTAL para o role da aplicação
 * (musicos_app, NOBYPASSRLS).
 *
 *   inventory_items, licenses, financial_rules
 *
 * Padrão obrigatório do projeto (portável, NUNCA auth.jwt direto):
 *   USING      (tenant_id = private_get_tenant_id())
 *   WITH CHECK (tenant_id = private_get_tenant_id())
 *
 * Idempotente: a policy só é criada se ainda não existir (consulta pg_policy).
 * NÃO altera ENABLE/FORCE RLS (já ativos), NÃO remove objetos existentes.
 */
export class RlsPoliciesInventoryLicensesFinancial20260613000006 implements MigrationInterface {
  name = 'RlsPoliciesInventoryLicensesFinancial20260613000006';

  private static readonly TABLES = ['inventory_items', 'licenses', 'financial_rules'] as const;
  private static readonly POLICY = 'tenant_isolation';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of RlsPoliciesInventoryLicensesFinancial20260613000006.TABLES) {
      await queryRunner.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policy
            WHERE polname = '${RlsPoliciesInventoryLicensesFinancial20260613000006.POLICY}'
              AND polrelid = 'public.${table}'::regclass
          ) THEN
            CREATE POLICY "${RlsPoliciesInventoryLicensesFinancial20260613000006.POLICY}"
              ON "${table}"
              USING (tenant_id = private_get_tenant_id())
              WITH CHECK (tenant_id = private_get_tenant_id());
          END IF;
        END $$;
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverte apenas a policy criada por esta migration (ENABLE/FORCE preservados).
    for (const table of RlsPoliciesInventoryLicensesFinancial20260613000006.TABLES) {
      await queryRunner.query(
        `DROP POLICY IF EXISTS "${RlsPoliciesInventoryLicensesFinancial20260613000006.POLICY}" ON "${table}"`,
      );
    }
  }
}
