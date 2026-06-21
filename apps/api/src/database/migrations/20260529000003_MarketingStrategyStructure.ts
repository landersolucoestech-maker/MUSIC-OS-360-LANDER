import type { MigrationInterface, QueryRunner } from 'typeorm';

export class MarketingStrategyStructure20260529000003 implements MigrationInterface {
  name = 'MarketingStrategyStructure20260529000003';

  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE IF NOT EXISTS marketing_strategies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        marketing_project_id UUID NOT NULL,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        responsible_id VARCHAR(255),
        priority VARCHAR(20) NOT NULL DEFAULT 'normal',
        due_date TIMESTAMPTZ,
        status VARCHAR(50) NOT NULL DEFAULT 'draft',
        dependencies JSONB NOT NULL DEFAULT '[]'::jsonb,
        metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_by VARCHAR(255),
        updated_by VARCHAR(255),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS marketing_strategy_objectives (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        marketing_project_id UUID NOT NULL,
        strategy_id UUID NOT NULL,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        responsible_id VARCHAR(255),
        priority VARCHAR(20) NOT NULL DEFAULT 'normal',
        due_date TIMESTAMPTZ,
        status VARCHAR(50) NOT NULL DEFAULT 'planned',
        dependencies JSONB NOT NULL DEFAULT '[]'::jsonb,
        metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_by VARCHAR(255),
        updated_by VARCHAR(255),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS marketing_strategy_initiatives (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        marketing_project_id UUID NOT NULL,
        objective_id UUID NOT NULL,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        responsible_id VARCHAR(255),
        priority VARCHAR(20) NOT NULL DEFAULT 'normal',
        due_date TIMESTAMPTZ,
        status VARCHAR(50) NOT NULL DEFAULT 'planned',
        dependencies JSONB NOT NULL DEFAULT '[]'::jsonb,
        metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_by VARCHAR(255),
        updated_by VARCHAR(255),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS marketing_strategy_actions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        marketing_project_id UUID NOT NULL,
        initiative_id UUID NOT NULL,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        responsible_id VARCHAR(255),
        priority VARCHAR(20) NOT NULL DEFAULT 'normal',
        due_date TIMESTAMPTZ,
        status VARCHAR(50) NOT NULL DEFAULT 'planned',
        dependencies JSONB NOT NULL DEFAULT '[]'::jsonb,
        metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_by VARCHAR(255),
        updated_by VARCHAR(255),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      );

      CREATE INDEX IF NOT EXISTS idx_mkt_strategies_project ON marketing_strategies (tenant_id, marketing_project_id);
      CREATE INDEX IF NOT EXISTS idx_mkt_strategies_status ON marketing_strategies (tenant_id, status);
      CREATE INDEX IF NOT EXISTS idx_mkt_objectives_strategy ON marketing_strategy_objectives (tenant_id, strategy_id);
      CREATE INDEX IF NOT EXISTS idx_mkt_objectives_project ON marketing_strategy_objectives (tenant_id, marketing_project_id);
      CREATE INDEX IF NOT EXISTS idx_mkt_initiatives_objective ON marketing_strategy_initiatives (tenant_id, objective_id);
      CREATE INDEX IF NOT EXISTS idx_mkt_initiatives_project ON marketing_strategy_initiatives (tenant_id, marketing_project_id);
      CREATE INDEX IF NOT EXISTS idx_mkt_actions_initiative ON marketing_strategy_actions (tenant_id, initiative_id);
      CREATE INDEX IF NOT EXISTS idx_mkt_actions_project ON marketing_strategy_actions (tenant_id, marketing_project_id);
      CREATE INDEX IF NOT EXISTS idx_mkt_actions_status ON marketing_strategy_actions (tenant_id, status);

      ALTER TABLE marketing_strategies ENABLE ROW LEVEL SECURITY;
      ALTER TABLE marketing_strategy_objectives ENABLE ROW LEVEL SECURITY;
      ALTER TABLE marketing_strategy_initiatives ENABLE ROW LEVEL SECURITY;
      ALTER TABLE marketing_strategy_actions ENABLE ROW LEVEL SECURITY;

      CREATE POLICY tenant_isolation ON marketing_strategies
        USING (tenant_id::text = current_setting('app.current_tenant_id', true))
        WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true));
      CREATE POLICY tenant_isolation ON marketing_strategy_objectives
        USING (tenant_id::text = current_setting('app.current_tenant_id', true))
        WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true));
      CREATE POLICY tenant_isolation ON marketing_strategy_initiatives
        USING (tenant_id::text = current_setting('app.current_tenant_id', true))
        WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true));
      CREATE POLICY tenant_isolation ON marketing_strategy_actions
        USING (tenant_id::text = current_setting('app.current_tenant_id', true))
        WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true));
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS marketing_strategy_actions;`);
    await qr.query(`DROP TABLE IF EXISTS marketing_strategy_initiatives;`);
    await qr.query(`DROP TABLE IF EXISTS marketing_strategy_objectives;`);
    await qr.query(`DROP TABLE IF EXISTS marketing_strategies;`);
  }
}
