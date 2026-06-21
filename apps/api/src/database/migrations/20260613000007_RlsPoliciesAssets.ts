import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * FASE 3B — Sub-lote B (piloto): habilita RLS e cria a policy padrão portável
 * nas 5 tabelas de Assets/Storage (auditoria 3A: tenant_id NOT NULL, indexado,
 * sem RLS, sem policy).
 *
 *   assets, asset_versions, project_assets, task_assets, asset_usage_logs
 *
 * Aplica APENAS:  ENABLE ROW LEVEL SECURITY  +  policy padrão
 *   USING      (tenant_id = private_get_tenant_id())
 *   WITH CHECK (tenant_id = private_get_tenant_id())
 *
 * NÃO ativa FORCE RLS neste lote (decisão da auditoria — validar antes).
 * Idempotente: ENABLE RLS é no-op se já ativo; a policy só é criada se ausente.
 */
export class RlsPoliciesAssets20260613000007 implements MigrationInterface {
  name = 'RlsPoliciesAssets20260613000007';

  private static readonly TABLES = [
    'assets', 'asset_versions', 'project_assets', 'task_assets', 'asset_usage_logs',
  ] as const;
  private static readonly POLICY = 'tenant_isolation';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of RlsPoliciesAssets20260613000007.TABLES) {
      await queryRunner.query(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`);
      await queryRunner.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policy
            WHERE polname = '${RlsPoliciesAssets20260613000007.POLICY}'
              AND polrelid = 'public.${table}'::regclass
          ) THEN
            CREATE POLICY "${RlsPoliciesAssets20260613000007.POLICY}"
              ON "${table}"
              USING (tenant_id = private_get_tenant_id())
              WITH CHECK (tenant_id = private_get_tenant_id());
          END IF;
        END $$;
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverte policy + desabilita RLS (estado original: sem RLS, sem policy).
    for (const table of RlsPoliciesAssets20260613000007.TABLES) {
      await queryRunner.query(
        `DROP POLICY IF EXISTS "${RlsPoliciesAssets20260613000007.POLICY}" ON "${table}"`,
      );
      await queryRunner.query(`ALTER TABLE "${table}" DISABLE ROW LEVEL SECURITY`);
    }
  }
}
