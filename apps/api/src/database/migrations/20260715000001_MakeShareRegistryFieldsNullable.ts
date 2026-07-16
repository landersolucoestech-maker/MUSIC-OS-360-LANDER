import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fase 5 / C6 — corrige a contaminação entre campos financeiros (detentor,
 * artista_externo, pagador, destinatario) e os campos de titularidade usados
 * pela submissão ABRAMUS/ECAD (titular_nome, percentual).
 *
 * `titular_nome`/`percentual` eram NOT NULL sem default, o que forçava
 * shares.service.ts::create() a derivar `titular_nome` de um campo financeiro
 * não relacionado (ou usar o literal 'N/D') sempre que o formulário
 * financeiro (SharePendenteFormModal) criava uma share sem dado registral.
 * Isso contaminava o payload de submissão a sociedades de direitos autorais.
 *
 * Esta migration apenas relaxa a constraint NOT NULL — não altera tipo,
 * precision, scale nem qualquer outro comportamento da coluna `percentual`
 * (numeric(7,4), sem transformer, retornado como string pelo TypeORM).
 */
export class MakeShareRegistryFieldsNullable20260715000001 implements MigrationInterface {
  name = 'MakeShareRegistryFieldsNullable20260715000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "shares"
        ALTER COLUMN "titular_nome" DROP NOT NULL,
        ALTER COLUMN "percentual" DROP NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const [{ bad_count: badCount }] = await queryRunner.query(`
      SELECT count(*)::int AS bad_count
      FROM "shares"
      WHERE "titular_nome" IS NULL OR "percentual" IS NULL
    `);

    if (badCount > 0) {
      throw new Error(
        `Rollback abortado: ${badCount} linha(s) em "shares" possuem titular_nome ` +
        `ou percentual NULL. Restaurar NOT NULL exigiria inventar dado nessas ` +
        `linhas (o que esta migration foi feita para eliminar). Resolva ` +
        `manualmente os registros afetados antes de reverter — nenhuma alteração foi feita.`,
      );
    }

    await queryRunner.query(`
      ALTER TABLE "shares"
        ALTER COLUMN "titular_nome" SET NOT NULL,
        ALTER COLUMN "percentual" SET NOT NULL
    `);
  }
}
