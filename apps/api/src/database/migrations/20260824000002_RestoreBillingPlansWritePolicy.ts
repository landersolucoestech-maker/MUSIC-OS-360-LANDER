import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 20260824000002_RestoreBillingPlansWritePolicy
 *
 * `billing_plans` está com RLS ativa e APENAS uma policy de SELECT
 * (`billing_plans_read_public`) — que não existe em nenhuma migration deste
 * repositório, ou seja, foi aplicada fora do toolchain.
 *
 * Efeito real, reproduzido: sob RLS, um comando sem policy correspondente
 * enxerga zero linhas. Todo UPDATE em billing_plans afeta 0 linhas e NÃO gera
 * erro — a escrita falha em silêncio. Isso quebra qualquer edição de plano pela
 * aplicação, não só os entitlements desta wave.
 *
 * Correção mínima: policies de escrita para o papel da aplicação, preservando a
 * leitura pública existente. Mesmo padrão de config global já usado por
 * platform_integrations/integration_categories neste repo. RLS continua ATIVA e
 * a autorização real permanece na camada RBAC (`@RequireRole('super_admin')`)
 * — nenhuma tabela com dimensão de tenant é afetada.
 */
export class RestoreBillingPlansWritePolicy20260824000002 implements MigrationInterface {
  name = 'RestoreBillingPlansWritePolicy20260824000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies
           WHERE tablename='billing_plans' AND policyname='billing_plans_admin_write'
        ) THEN
          CREATE POLICY "billing_plans_admin_write" ON "billing_plans"
            FOR UPDATE USING (true) WITH CHECK (true);
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies
           WHERE tablename='billing_plans' AND policyname='billing_plans_admin_insert'
        ) THEN
          CREATE POLICY "billing_plans_admin_insert" ON "billing_plans"
            FOR INSERT WITH CHECK (true);
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP POLICY IF EXISTS "billing_plans_admin_insert" ON "billing_plans"`);
    await queryRunner.query(`DROP POLICY IF EXISTS "billing_plans_admin_write" ON "billing_plans"`);
  }
}
