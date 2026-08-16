import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Task U — alinha `contract_templates` ao contrato real do único formulário
 * ativo (ContractImportWorkspace.tsx, via TemplatesContratos.tsx).
 *
 * Achado: `useTemplatesContratos()` grava via storage.create("templates_contratos", …)
 * → POST /contract-templates → CreateContractTemplateDto. O DTO antigo só
 * aceitava campos em inglês (title/type/content/variables/metadata); o
 * formulário real sempre enviou nome/tipo_servico/conteudo/ativo/descricao/
 * variables_manifest/header_image/footer_image — zero sobreposição. Com
 * forbidNonWhitelisted, toda criação/edição de template retornava 400. Mesmo
 * que o DTO antigo fosse contornado, o service fazia spread direto (`...dto`)
 * sobre a entity, cujas colunas físicas já eram `titulo`/`tipo` (não
 * `title`/`type`) — os campos do DTO antigo nunca teriam persistido de
 * qualquer forma. `descricao`/`variables_manifest`/`header_image`/
 * `footer_image` nunca tiveram coluna física alguma.
 *
 * `titulo`→`nome`, `tipo`→`tipo_servico` (contrato canônico exigido pelo
 * formulário ativo). DEV não possui dado de negócio real nesta tabela (o
 * fluxo esteve quebrado desde sempre) — RENAME COLUMN é seguro.
 */
export class ContractTemplatesFormFieldAlignment20260816000003
  implements MigrationInterface
{
  name = 'ContractTemplatesFormFieldAlignment20260816000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "contract_templates" RENAME COLUMN "titulo" TO "nome"
    `);
    await queryRunner.query(`
      ALTER TABLE "contract_templates" RENAME COLUMN "tipo" TO "tipo_servico"
    `);
    await queryRunner.query(`
      ALTER TABLE "contract_templates"
        ADD COLUMN IF NOT EXISTS "descricao" text,
        ADD COLUMN IF NOT EXISTS "variables_manifest" text,
        ADD COLUMN IF NOT EXISTS "header_image" text,
        ADD COLUMN IF NOT EXISTS "footer_image" text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "contract_templates"
        DROP COLUMN IF EXISTS "descricao",
        DROP COLUMN IF EXISTS "variables_manifest",
        DROP COLUMN IF EXISTS "header_image",
        DROP COLUMN IF EXISTS "footer_image"
    `);
    await queryRunner.query(`
      ALTER TABLE "contract_templates" RENAME COLUMN "tipo_servico" TO "tipo"
    `);
    await queryRunner.query(`
      ALTER TABLE "contract_templates" RENAME COLUMN "nome" TO "titulo"
    `);
  }
}
