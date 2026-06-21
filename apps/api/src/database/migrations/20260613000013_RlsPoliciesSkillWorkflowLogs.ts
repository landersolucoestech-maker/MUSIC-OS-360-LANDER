import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * FASE 3T — Fecha a trilha principal de RLS: protege os logs-filhos por HERANÇA
 * de tenant via FK real ao parent já tenantizado e protegido (FASE 3R).
 *
 *   skill_run_logs.skill_run_id        → skill_runs.id          (RLS ON)
 *   workflow_execution_logs.execution_id → workflow_executions.id (RLS ON, tenant NOT NULL)
 *
 * Faz, por tabela:
 *   1. FK real ON DELETE CASCADE (logs são filhos do parent) — pré-check 3S = 0 órfãos;
 *      ADD ... NOT VALID + VALIDATE (lock curto), idempotente via guard em pg_constraint.
 *   2. ENABLE ROW LEVEL SECURITY (no-op se já ativo). NÃO ativa FORCE.
 *   3. policy `tenant_isolation` por EXISTS no parent, usando o padrão portável
 *      private_get_tenant_id() — sem current_setting, sem auth.uid, sem cast ::text.
 *
 * Idempotente e reversível. NÃO altera skill_runs/workflow_executions nem qualquer
 * outra tabela. Não harmoniza policies legadas.
 */
export class RlsPoliciesSkillWorkflowLogs20260613000013 implements MigrationInterface {
  name = 'RlsPoliciesSkillWorkflowLogs20260613000013';

  // [tabela, coluna_fk, parent, nome_fk]
  private static readonly SPECS: ReadonlyArray<[string, string, string, string]> = [
    ['skill_run_logs', 'skill_run_id', 'skill_runs', 'fk_skill_run_logs_skill_run'],
    ['workflow_execution_logs', 'execution_id', 'workflow_executions', 'fk_workflow_execution_logs_execution'],
  ];
  private static readonly POLICY = 'tenant_isolation';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [table, col, parent, fk] of RlsPoliciesSkillWorkflowLogs20260613000013.SPECS) {
      // 1. FK real ON DELETE CASCADE (idempotente).
      await queryRunner.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${fk}' AND conrelid = 'public.${table}'::regclass) THEN
            ALTER TABLE "${table}" ADD CONSTRAINT "${fk}"
              FOREIGN KEY ("${col}") REFERENCES "${parent}" ("id") ON DELETE CASCADE NOT VALID;
            ALTER TABLE "${table}" VALIDATE CONSTRAINT "${fk}";
          END IF;
        END $$;
      `);

      // 2. ENABLE RLS (sem FORCE).
      await queryRunner.query(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`);

      // 3. policy por EXISTS no parent tenantizado.
      const expr =
        `EXISTS (SELECT 1 FROM ${parent} p WHERE p.id = ${table}.${col} AND p.tenant_id = private_get_tenant_id())`;
      await queryRunner.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policy
            WHERE polname = '${RlsPoliciesSkillWorkflowLogs20260613000013.POLICY}'
              AND polrelid = 'public.${table}'::regclass
          ) THEN
            CREATE POLICY "${RlsPoliciesSkillWorkflowLogs20260613000013.POLICY}"
              ON "${table}"
              USING (${expr})
              WITH CHECK (${expr});
          END IF;
        END $$;
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const [table, , , fk] of RlsPoliciesSkillWorkflowLogs20260613000013.SPECS) {
      await queryRunner.query(
        `DROP POLICY IF EXISTS "${RlsPoliciesSkillWorkflowLogs20260613000013.POLICY}" ON "${table}"`,
      );
      await queryRunner.query(`ALTER TABLE "${table}" DISABLE ROW LEVEL SECURITY`);
      await queryRunner.query(`ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${fk}"`);
    }
  }
}
