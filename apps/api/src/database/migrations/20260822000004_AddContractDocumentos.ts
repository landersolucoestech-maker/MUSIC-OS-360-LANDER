import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 20260822000004_AddContractDocumentos
 *
 * REM-01/REM-02 (Remaining Product Completion Backlog) — "Documentos Anexos"
 * no ContratoFormModal fazia upload real para o R2 (via FileUpload/useUploadToR2,
 * já existente), mas o array resultante nunca era incluído no payload salvo —
 * falso sucesso: o upload funcionava, mas a referência nunca sobrevivia a um
 * reload. Adiciona `documentos` como coluna jsonb dedicada em `contracts`,
 * seguindo o mesmo padrão já usado por `versoes`/`signers` na mesma tabela
 * (1 array jsonb por campo estruturado — não reaproveita a coluna `metadata`).
 *
 * ADITIVA e NÃO-DESTRUTIVA: apenas ADD COLUMN com DEFAULT, IF NOT EXISTS.
 */
export class AddContractDocumentos20260822000004 implements MigrationInterface {
  name = 'AddContractDocumentos20260822000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "documentos" jsonb NOT NULL DEFAULT '[]'::jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "contracts" DROP COLUMN IF EXISTS "documentos"`);
  }
}
