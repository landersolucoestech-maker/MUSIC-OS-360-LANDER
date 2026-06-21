import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * FASE 3F — RLS por HERANÇA DE FK em release_works (tabela de junção N:N sem
 * tenant_id próprio; PK composta release_id+work_id).
 *
 * Isolamento herdado dos DOIS pais já tenantizados e protegidos por RLS:
 *   release_works.release_id → releases.id   (releases.tenant_id NOT NULL, RLS ON)
 *   release_works.work_id    → works.id      (works.tenant_id    NOT NULL, RLS ON)
 *
 * A policy exige que AMBOS os pais pertençam ao tenant atual (AND), fechando o
 * caso teórico release.tenant ≠ work.tenant. Usa o padrão portável
 * private_get_tenant_id() — sem current_setting, sem auth.uid, sem cast ::text.
 *
 * Aplica APENAS: ENABLE ROW LEVEL SECURITY + policy. NÃO ativa FORCE RLS.
 * Não altera releases/works nem qualquer outra tabela. Idempotente (ENABLE é
 * no-op se já ativo; policy só criada se ausente). Reversível.
 */
export class RlsPolicyReleaseWorks20260613000009 implements MigrationInterface {
  name = 'RlsPolicyReleaseWorks20260613000009';

  private static readonly EXPR =
    `EXISTS (SELECT 1 FROM releases r WHERE r.id = release_works.release_id AND r.tenant_id = private_get_tenant_id())` +
    ` AND ` +
    `EXISTS (SELECT 1 FROM works w WHERE w.id = release_works.work_id AND w.tenant_id = private_get_tenant_id())`;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "release_works" ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policy
          WHERE polname = 'tenant_isolation'
            AND polrelid = 'public.release_works'::regclass
        ) THEN
          CREATE POLICY "tenant_isolation"
            ON "release_works"
            USING (${RlsPolicyReleaseWorks20260613000009.EXPR})
            WITH CHECK (${RlsPolicyReleaseWorks20260613000009.EXPR});
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP POLICY IF EXISTS "tenant_isolation" ON "release_works"`);
    await queryRunner.query(`ALTER TABLE "release_works" DISABLE ROW LEVEL SECURITY`);
  }
}
