import type { MigrationInterface, QueryRunner } from 'typeorm';

export class MarketingProjects20260529000001 implements MigrationInterface {
  name = 'MarketingProjects20260529000001';

  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE IF NOT EXISTS marketing_projects (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id           UUID NOT NULL,
        organization_id     UUID,
        type                VARCHAR(40) NOT NULL,
        title               VARCHAR(500) NOT NULL,
        description         TEXT,
        status              VARCHAR(30) NOT NULL DEFAULT 'draft',
        priority            VARCHAR(20) NOT NULL DEFAULT 'normal',
        source_project_id   UUID,
        artist_id           UUID,
        company_id          UUID,
        label_id            UUID,
        publisher_id        UUID,
        studio_id           UUID,
        event_id            UUID,
        campaign_id         UUID,
        starts_at           DATE,
        ends_at             DATE,
        goals               JSONB NOT NULL DEFAULT '{}'::jsonb,
        metrics             JSONB NOT NULL DEFAULT '{}'::jsonb,
        context             JSONB NOT NULL DEFAULT '{}'::jsonb,
        metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_by          VARCHAR(255),
        updated_by          VARCHAR(255),
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at          TIMESTAMPTZ,
        CONSTRAINT chk_marketing_projects_type CHECK (
          type IN (
            'MUSIC_PROJECT','ARTIST','COMPANY','LABEL','PUBLISHER','STUDIO',
            'EVENT','CONTENT','CAMPAIGN','BRANDING','CORPORATE','PRODUCT','CUSTOM'
          )
        ),
        CONSTRAINT chk_marketing_projects_status CHECK (
          status IN ('draft','planning','active','paused','completed','cancelled','archived')
        ),
        CONSTRAINT chk_marketing_projects_priority CHECK (
          priority IN ('low','normal','high','urgent')
        )
      );

      CREATE INDEX IF NOT EXISTS idx_marketing_projects_tenant
        ON marketing_projects (tenant_id);
      CREATE INDEX IF NOT EXISTS idx_marketing_projects_tenant_type
        ON marketing_projects (tenant_id, type);
      CREATE INDEX IF NOT EXISTS idx_marketing_projects_tenant_status
        ON marketing_projects (tenant_id, status);
      CREATE INDEX IF NOT EXISTS idx_marketing_projects_artist
        ON marketing_projects (tenant_id, artist_id);
      CREATE INDEX IF NOT EXISTS idx_marketing_projects_campaign
        ON marketing_projects (tenant_id, campaign_id);
      CREATE INDEX IF NOT EXISTS idx_marketing_projects_deleted
        ON marketing_projects (tenant_id, deleted_at);
      CREATE UNIQUE INDEX IF NOT EXISTS uq_marketing_projects_source_project
        ON marketing_projects (tenant_id, source_project_id)
        WHERE source_project_id IS NOT NULL AND deleted_at IS NULL;

      ALTER TABLE marketing_projects ENABLE ROW LEVEL SECURITY;
      CREATE POLICY tenant_isolation ON marketing_projects
        USING (tenant_id::text = current_setting('app.current_tenant_id', true))
        WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true));
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS marketing_projects;`);
  }
}
