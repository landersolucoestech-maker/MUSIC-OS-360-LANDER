import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Aligns workflow_executions with its tenant-scoped runtime contract.
 * No RLS policy, foreign key, or index is created by this migration.
 */
export class WorkflowExecutionTenantNotNull20260613000011 implements MigrationInterface {
  name = 'WorkflowExecutionTenantNotNull20260613000011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
            FROM workflow_executions
           WHERE tenant_id IS NULL
        ) THEN
          RAISE EXCEPTION
            'workflow_executions.tenant_id contains NULL rows; refusing SET NOT NULL';
        END IF;

        ALTER TABLE workflow_executions
          ALTER COLUMN tenant_id SET NOT NULL;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE workflow_executions
        ALTER COLUMN tenant_id DROP NOT NULL
    `);
  }
}
