import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Enables standard tenant RLS for skill and workflow execution records.
 *
 * This migration intentionally does not FORCE RLS and does not change columns,
 * constraints, foreign keys, grants, or indexes.
 */
export class RlsPoliciesSkillRunsWorkflowExecutions20260613000012 implements MigrationInterface {
  name = 'RlsPoliciesSkillRunsWorkflowExecutions20260613000012';

  private static readonly TABLES = [
    'skill_runs',
    'workflow_executions',
  ] as const;

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of RlsPoliciesSkillRunsWorkflowExecutions20260613000012.TABLES) {
      await queryRunner.query(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`);
      await queryRunner.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
              FROM pg_policy
             WHERE polname = 'tenant_isolation'
               AND polrelid = 'public.${table}'::regclass
          ) THEN
            CREATE POLICY "tenant_isolation"
              ON "${table}"
              USING (tenant_id = private_get_tenant_id())
              WITH CHECK (tenant_id = private_get_tenant_id());
          END IF;
        END $$;
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of RlsPoliciesSkillRunsWorkflowExecutions20260613000012.TABLES) {
      await queryRunner.query(`DROP POLICY IF EXISTS "tenant_isolation" ON "${table}"`);
      await queryRunner.query(`ALTER TABLE "${table}" DISABLE ROW LEVEL SECURITY`);
    }
  }
}
