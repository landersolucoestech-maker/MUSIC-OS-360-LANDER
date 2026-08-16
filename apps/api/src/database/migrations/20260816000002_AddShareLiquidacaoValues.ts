import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Task T (continuidade) — "Registrar Recebimento"/"Registrar Envio" em
 * GestaoShares.tsx já chamava updateShare({ status, valor_liquidado, ... }),
 * mas `valor_liquidado` (e o `valor_total` do qual seu quick-action deriva)
 * nunca existiram como coluna: a mudança de status persistia, o valor
 * liquidado era descartado silenciosamente pelo DTO. Mesma regra de produto
 * de 20260712000004 — coluna física por campo do formulário.
 */
export class AddShareLiquidacaoValues20260816000002 implements MigrationInterface {
  name = 'AddShareLiquidacaoValues20260816000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "shares"
        ADD COLUMN IF NOT EXISTS "valor_total" decimal(12,2),
        ADD COLUMN IF NOT EXISTS "valor_liquidado" decimal(12,2)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "shares"
        DROP COLUMN IF EXISTS "valor_total",
        DROP COLUMN IF EXISTS "valor_liquidado"
    `);
  }
}
