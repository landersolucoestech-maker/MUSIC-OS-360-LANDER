import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fase 13A / M9 — pontes operacionais → projeto financeiro (Fase 12 §2.11;
 * decisões Q6/Q7).
 *
 * `projects` é o projeto financeiro UNIVERSAL. Projetos de marketing e
 * audiovisual podem apontar OPCIONALMENTE para um projeto financeiro via
 * financial_project_id (FK composta, RESTRICT). NENHUMA associação automática
 * é feita — a coluna nasce NULL para todas as linhas e o preenchimento é
 * sempre decisão explícita do usuário (a UI deve indicar ausência de vínculo).
 */
export class FinancialOperationalBridges20260718000009 implements MigrationInterface {
  name = 'FinancialOperationalBridges20260718000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "marketing_projects"
        ADD COLUMN "financial_project_id" uuid NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "marketing_projects"
        ADD CONSTRAINT "fk_marketing_projects_financial_project"
        FOREIGN KEY ("tenant_id", "financial_project_id")
        REFERENCES "projects" ("tenant_id", "id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_marketing_projects_financial_project"
        ON "marketing_projects" ("tenant_id", "financial_project_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "audiovisual_projects"
        ADD COLUMN "financial_project_id" uuid NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "audiovisual_projects"
        ADD CONSTRAINT "fk_audiovisual_projects_financial_project"
        FOREIGN KEY ("tenant_id", "financial_project_id")
        REFERENCES "projects" ("tenant_id", "id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_audiovisual_projects_financial_project"
        ON "audiovisual_projects" ("tenant_id", "financial_project_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_audiovisual_projects_financial_project"`);
    await queryRunner.query(`
      ALTER TABLE "audiovisual_projects"
        DROP CONSTRAINT "fk_audiovisual_projects_financial_project"
    `);
    await queryRunner.query(`ALTER TABLE "audiovisual_projects" DROP COLUMN "financial_project_id"`);
    await queryRunner.query(`DROP INDEX "idx_marketing_projects_financial_project"`);
    await queryRunner.query(`
      ALTER TABLE "marketing_projects"
        DROP CONSTRAINT "fk_marketing_projects_financial_project"
    `);
    await queryRunner.query(`ALTER TABLE "marketing_projects" DROP COLUMN "financial_project_id"`);
  }
}
