import type { MigrationInterface, QueryRunner } from 'typeorm';

export class MarketingProjectAutomation20260529000002 implements MigrationInterface {
  name = 'MarketingProjectAutomation20260529000002';

  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE IF NOT EXISTS marketing_tasks (
        id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id            UUID NOT NULL,
        marketing_project_id UUID NOT NULL,
        task_key             VARCHAR(120) NOT NULL,
        title                VARCHAR(500) NOT NULL,
        description          TEXT,
        status               VARCHAR(50) NOT NULL DEFAULT 'pending',
        priority             VARCHAR(20) NOT NULL DEFAULT 'normal',
        kind                 VARCHAR(80),
        assigned_to          VARCHAR(255),
        due_date             TIMESTAMPTZ,
        dependencies         JSONB NOT NULL DEFAULT '[]'::jsonb,
        metrics              JSONB NOT NULL DEFAULT '{}'::jsonb,
        metadata             JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_by           VARCHAR(255),
        updated_by           VARCHAR(255),
        created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at         TIMESTAMPTZ,
        deleted_at           TIMESTAMPTZ,
        CONSTRAINT chk_marketing_tasks_status CHECK (
          status IN ('pending','in_progress','review','blocked','done','cancelled')
        ),
        CONSTRAINT chk_marketing_tasks_priority CHECK (
          priority IN ('low','normal','high','urgent')
        )
      );

      CREATE INDEX IF NOT EXISTS idx_marketing_tasks_tenant
        ON marketing_tasks (tenant_id);
      CREATE INDEX IF NOT EXISTS idx_marketing_tasks_project
        ON marketing_tasks (tenant_id, marketing_project_id);
      CREATE INDEX IF NOT EXISTS idx_marketing_tasks_status
        ON marketing_tasks (tenant_id, status);
      CREATE INDEX IF NOT EXISTS idx_marketing_tasks_due
        ON marketing_tasks (tenant_id, due_date);
      CREATE UNIQUE INDEX IF NOT EXISTS uq_marketing_tasks_project_key
        ON marketing_tasks (tenant_id, marketing_project_id, task_key);

      ALTER TABLE marketing_tasks ENABLE ROW LEVEL SECURITY;
      CREATE POLICY tenant_isolation ON marketing_tasks
        USING (tenant_id::text = current_setting('app.current_tenant_id', true))
        WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true));
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS marketing_tasks;`);
  }
}
