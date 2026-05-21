import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CrmPipelinesAnalytics20260521000050 implements MigrationInterface {
  name = 'CrmPipelinesAnalytics20260521000050';

  async up(qr: QueryRunner): Promise<void> {
    // ── CRM Companies ────────────────────────────────────────────────────────
    await qr.query(`
      CREATE TABLE IF NOT EXISTS crm_companies (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id     UUID NOT NULL,
        name          VARCHAR(255) NOT NULL,
        industry      VARCHAR(100),
        website       VARCHAR(255),
        email_encrypted TEXT,
        phone_encrypted TEXT,
        address       VARCHAR(255),
        city          VARCHAR(100),
        state         CHAR(2),
        contact_count INTEGER NOT NULL DEFAULT 0,
        metadata      JSONB NOT NULL DEFAULT '{}',
        created_by    VARCHAR(255),
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at    TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS idx_crm_companies_tenant ON crm_companies (tenant_id);
      CREATE INDEX IF NOT EXISTS idx_crm_companies_tenant_deleted ON crm_companies (tenant_id, deleted_at);
    `);

    // ── CRM Contacts ─────────────────────────────────────────────────────────
    await qr.query(`
      CREATE TABLE IF NOT EXISTS crm_contacts (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id         UUID NOT NULL,
        name              VARCHAR(255) NOT NULL,
        email_encrypted   TEXT,
        phone_encrypted   TEXT,
        job_title         VARCHAR(255),
        company_id        UUID REFERENCES crm_companies(id) ON DELETE SET NULL,
        source            VARCHAR(100),
        score             INTEGER NOT NULL DEFAULT 0,
        status            VARCHAR(50) NOT NULL DEFAULT 'active',
        lead_id           UUID,
        client_id         UUID,
        assigned_to       VARCHAR(255),
        last_contacted_at TIMESTAMPTZ,
        social_links      JSONB NOT NULL DEFAULT '{}',
        metadata          JSONB NOT NULL DEFAULT '{}',
        created_by        VARCHAR(255),
        updated_by        VARCHAR(255),
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at        TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS idx_crm_contacts_tenant ON crm_contacts (tenant_id);
      CREATE INDEX IF NOT EXISTS idx_crm_contacts_tenant_deleted ON crm_contacts (tenant_id, deleted_at);
      CREATE INDEX IF NOT EXISTS idx_crm_contacts_company ON crm_contacts (tenant_id, company_id);
    `);

    // ── CRM Tags ─────────────────────────────────────────────────────────────
    await qr.query(`
      CREATE TABLE IF NOT EXISTS crm_tags (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id  UUID NOT NULL,
        name       VARCHAR(100) NOT NULL,
        color      VARCHAR(50) NOT NULL DEFAULT '#6366f1',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (tenant_id, name)
      );
    `);

    // ── CRM Contact Tags ──────────────────────────────────────────────────────
    await qr.query(`
      CREATE TABLE IF NOT EXISTS crm_contact_tags (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id  UUID NOT NULL,
        contact_id UUID NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
        tag_id     UUID NOT NULL REFERENCES crm_tags(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (contact_id, tag_id)
      );
      CREATE INDEX IF NOT EXISTS idx_crm_contact_tags_tenant ON crm_contact_tags (tenant_id);
    `);

    // ── CRM Tasks ─────────────────────────────────────────────────────────────
    await qr.query(`
      CREATE TABLE IF NOT EXISTS crm_tasks (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id    UUID NOT NULL,
        title        VARCHAR(500) NOT NULL,
        description  TEXT,
        status       VARCHAR(50) NOT NULL DEFAULT 'pending',
        priority     VARCHAR(50) NOT NULL DEFAULT 'medium',
        type         VARCHAR(100),
        contact_id   UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
        company_id   UUID REFERENCES crm_companies(id) ON DELETE SET NULL,
        assigned_to  VARCHAR(255),
        due_date     TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        created_by   VARCHAR(255),
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_crm_tasks_contact ON crm_tasks (tenant_id, contact_id);
      CREATE INDEX IF NOT EXISTS idx_crm_tasks_due ON crm_tasks (tenant_id, due_date);
      CREATE INDEX IF NOT EXISTS idx_crm_tasks_assignee ON crm_tasks (assigned_to);
    `);

    // ── CRM Timeline Events ───────────────────────────────────────────────────
    await qr.query(`
      CREATE TABLE IF NOT EXISTS crm_timeline_events (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id   UUID NOT NULL,
        contact_id  UUID NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
        event_type  VARCHAR(100) NOT NULL,
        summary     VARCHAR(500),
        payload     JSONB NOT NULL DEFAULT '{}',
        actor_id    VARCHAR(255),
        occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_crm_timeline_contact ON crm_timeline_events (tenant_id, contact_id, occurred_at);
    `);

    // ── RLS for CRM tables ─────────────────────────────────────────────────────
    for (const tbl of ['crm_companies', 'crm_contacts', 'crm_tags', 'crm_contact_tags', 'crm_tasks', 'crm_timeline_events']) {
      await qr.query(`ALTER TABLE ${tbl} ENABLE ROW LEVEL SECURITY`);
      await qr.query(`
        CREATE POLICY tenant_isolation ON ${tbl}
          USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID)
      `);
    }

    // ── Pipelines ─────────────────────────────────────────────────────────────
    await qr.query(`
      CREATE TABLE IF NOT EXISTS pipelines (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id   UUID NOT NULL,
        name        VARCHAR(255) NOT NULL,
        type        VARCHAR(100) NOT NULL DEFAULT 'sales',
        description TEXT,
        is_active   BOOLEAN NOT NULL DEFAULT TRUE,
        created_by  VARCHAR(255),
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at  TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS idx_pipelines_tenant ON pipelines (tenant_id);
    `);

    // ── Pipeline Stages ───────────────────────────────────────────────────────
    await qr.query(`
      CREATE TABLE IF NOT EXISTS pipeline_stages (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id       UUID NOT NULL,
        pipeline_id     UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
        name            VARCHAR(255) NOT NULL,
        position        INTEGER NOT NULL DEFAULT 0,
        color           VARCHAR(50) NOT NULL DEFAULT '#6366f1',
        sla_days        INTEGER,
        win_probability DECIMAL(5,2),
        is_terminal     BOOLEAN NOT NULL DEFAULT FALSE,
        is_won          BOOLEAN NOT NULL DEFAULT FALSE,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_pipeline_stages_pipeline ON pipeline_stages (pipeline_id, position);
      CREATE INDEX IF NOT EXISTS idx_pipeline_stages_tenant ON pipeline_stages (tenant_id);
    `);

    // ── Pipeline Opportunities ────────────────────────────────────────────────
    await qr.query(`
      CREATE TABLE IF NOT EXISTS pipeline_opportunities (
        id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id          UUID NOT NULL,
        pipeline_id        UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
        stage_id           UUID REFERENCES pipeline_stages(id) ON DELETE SET NULL,
        title              VARCHAR(500) NOT NULL,
        contact_id         UUID,
        company_id         UUID,
        value              DECIMAL(15,2),
        status             VARCHAR(50) NOT NULL DEFAULT 'open',
        probability        DECIMAL(5,2),
        expected_close_date TIMESTAMPTZ,
        actual_close_date  TIMESTAMPTZ,
        sla_due_at         TIMESTAMPTZ,
        sla_breached       BOOLEAN NOT NULL DEFAULT FALSE,
        assigned_to        VARCHAR(255),
        notes              TEXT,
        stage_history      JSONB NOT NULL DEFAULT '[]',
        metadata           JSONB NOT NULL DEFAULT '{}',
        created_by         VARCHAR(255),
        updated_by         VARCHAR(255),
        created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at         TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS idx_opp_pipeline ON pipeline_opportunities (tenant_id, pipeline_id);
      CREATE INDEX IF NOT EXISTS idx_opp_stage ON pipeline_opportunities (tenant_id, stage_id);
      CREATE INDEX IF NOT EXISTS idx_opp_contact ON pipeline_opportunities (tenant_id, contact_id);
      CREATE INDEX IF NOT EXISTS idx_opp_deleted ON pipeline_opportunities (tenant_id, deleted_at);
    `);

    // ── RLS for Pipeline tables ────────────────────────────────────────────────
    for (const tbl of ['pipelines', 'pipeline_stages', 'pipeline_opportunities']) {
      await qr.query(`ALTER TABLE ${tbl} ENABLE ROW LEVEL SECURITY`);
      await qr.query(`
        CREATE POLICY tenant_isolation ON ${tbl}
          USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID)
      `);
    }

    // ── Campaign Tasks ────────────────────────────────────────────────────────
    await qr.query(`
      CREATE TABLE IF NOT EXISTS campaign_tasks (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id    UUID NOT NULL,
        campaign_id  UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        title        VARCHAR(500) NOT NULL,
        description  TEXT,
        status       VARCHAR(50) NOT NULL DEFAULT 'pending',
        priority     VARCHAR(50) NOT NULL DEFAULT 'medium',
        assigned_to  VARCHAR(255),
        due_date     TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        created_by   VARCHAR(255),
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_campaign_tasks_campaign ON campaign_tasks (tenant_id, campaign_id);
      CREATE INDEX IF NOT EXISTS idx_campaign_tasks_due ON campaign_tasks (tenant_id, due_date);
      CREATE INDEX IF NOT EXISTS idx_campaign_tasks_assignee ON campaign_tasks (assigned_to);
    `);

    // ── Campaign Assets ────────────────────────────────────────────────────────
    await qr.query(`
      CREATE TABLE IF NOT EXISTS campaign_assets (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id    UUID NOT NULL,
        campaign_id  UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        name         VARCHAR(500) NOT NULL,
        asset_type   VARCHAR(100) NOT NULL,
        file_url     TEXT NOT NULL,
        file_size    BIGINT,
        mime_type    VARCHAR(100),
        description  TEXT,
        metadata     JSONB NOT NULL DEFAULT '{}',
        created_by   VARCHAR(255),
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at   TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS idx_campaign_assets_campaign ON campaign_assets (tenant_id, campaign_id);
    `);

    // ── RLS for Campaign tables ────────────────────────────────────────────────
    for (const tbl of ['campaign_tasks', 'campaign_assets']) {
      await qr.query(`ALTER TABLE ${tbl} ENABLE ROW LEVEL SECURITY`);
      await qr.query(`
        CREATE POLICY tenant_isolation ON ${tbl}
          USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID)
      `);
    }

    // ── AI Usage Logs ──────────────────────────────────────────────────────────
    await qr.query(`
      CREATE TABLE IF NOT EXISTS ai_usage_logs (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id    UUID NOT NULL,
        job_id       UUID,
        model        VARCHAR(255) NOT NULL,
        feature      VARCHAR(100) NOT NULL,
        tokens_input  INTEGER NOT NULL DEFAULT 0,
        tokens_output INTEGER NOT NULL DEFAULT 0,
        cost_usd     DECIMAL(12,6) NOT NULL DEFAULT 0,
        latency_ms   INTEGER,
        outcome      VARCHAR(50) NOT NULL DEFAULT 'success',
        user_id      VARCHAR(255),
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_ai_usage_tenant ON ai_usage_logs (tenant_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_ai_usage_model ON ai_usage_logs (tenant_id, model);
      CREATE INDEX IF NOT EXISTS idx_ai_usage_job ON ai_usage_logs (job_id);
    `);

    await qr.query(`ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY`);
    await qr.query(`
      CREATE POLICY tenant_isolation ON ai_usage_logs
        USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID)
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    // Drop in reverse FK order
    for (const tbl of [
      'ai_usage_logs',
      'campaign_assets',
      'campaign_tasks',
      'pipeline_opportunities',
      'pipeline_stages',
      'pipelines',
      'crm_timeline_events',
      'crm_tasks',
      'crm_contact_tags',
      'crm_tags',
      'crm_contacts',
      'crm_companies',
    ]) {
      await qr.query(`DROP TABLE IF EXISTS ${tbl} CASCADE`);
    }
  }
}
