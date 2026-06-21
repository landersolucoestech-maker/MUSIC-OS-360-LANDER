import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * FASE 2B — Reconciliação leads: adiciona a coluna `pipeline_stage` que a
 * `LeadEntity`, o `LeadsService` (SELECT via repositório) e a automação de CRM
 * (`crm-followup.automation.ts`, raw SQL `SELECT ... pipeline_stage ... FROM leads`)
 * já assumem, mas que NUNCA existiu no banco. Sem a coluna, todo `list()`/`findById()`
 * de leads e a automação quebram em runtime ("column l.pipeline_stage does not exist").
 *
 * Mudança puramente ADITIVA e reversível: coluna nullable, sem default, sem backfill,
 * sem alteração de coluna existente, sem perda de dados. Idempotente via IF NOT EXISTS.
 */
export class AddLeadsPipelineStage20260613000003 implements MigrationInterface {
  name = 'AddLeadsPipelineStage20260613000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "pipeline_stage" varchar(100) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverte apenas a coluna adicionada por esta migration.
    await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN IF EXISTS "pipeline_stage"`);
  }
}
