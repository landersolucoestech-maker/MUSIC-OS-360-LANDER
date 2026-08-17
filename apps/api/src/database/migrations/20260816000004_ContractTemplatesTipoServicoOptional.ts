import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Task X — achado via validação de runtime real (OBJETIVO 1).
 *
 * A migration 20260816000003 renomeou `contract_templates.tipo` para
 * `tipo_servico`, mas manteve a constraint NOT NULL herdada da coluna
 * antiga. `CreateContractTemplateDto.tipo_servico` é `@IsOptional()` (o
 * único formulário ativo, ContractImportWorkspace.tsx, não exige o campo) —
 * toda criação de template sem tipo_servico quebrava em runtime com
 * "null value in column tipo_servico violates not-null constraint",
 * nunca coberto pelos testes (mocks não validam NOT NULL). Relaxa a
 * constraint para alinhar com o contrato real do formulário.
 */
export class ContractTemplatesTipoServicoOptional20260816000004
  implements MigrationInterface
{
  name = 'ContractTemplatesTipoServicoOptional20260816000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "contract_templates" ALTER COLUMN "tipo_servico" DROP NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "contract_templates" ALTER COLUMN "tipo_servico" SET NOT NULL
    `);
  }
}
