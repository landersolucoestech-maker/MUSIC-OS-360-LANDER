import type { MigrationInterface, QueryRunner } from 'typeorm';

export class MarketingAssets20260529000004 implements MigrationInterface {
  name = 'MarketingAssets20260529000004';

  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE IF NOT EXISTS marketing_assets (
        id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id               UUID NOT NULL,
        marketing_project_id    UUID,
        artist_id               UUID,
        company_id              UUID,
        campaign_id             UUID,
        creative_request_id     UUID,
        audiovisual_project_id  UUID,
        source_upload_id        UUID,
        title                   VARCHAR(500) NOT NULL,
        description             TEXT,
        asset_type              VARCHAR(40) NOT NULL,
        status                  VARCHAR(30) NOT NULL DEFAULT 'draft',
        current_version         INTEGER NOT NULL DEFAULT 1,
        current_version_id      UUID,
        file_url                TEXT,
        thumbnail_url           TEXT,
        mime_type               VARCHAR(100),
        size_bytes              BIGINT,
        tags                    JSONB NOT NULL DEFAULT '[]'::jsonb,
        metadata                JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_by              VARCHAR(255),
        updated_by              VARCHAR(255),
        created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        approved_at             TIMESTAMPTZ,
        approved_by             VARCHAR(255),
        deleted_at              TIMESTAMPTZ,
        CONSTRAINT chk_marketing_assets_type CHECK (
          asset_type IN (
            'AUDIO','COVER','ARTWORK','PHOTO','REEL','TEASER','VISUALIZER','LYRIC_VIDEO',
            'MUSIC_VIDEO','PRESS_KIT','DOCUMENT','INSTITUTIONAL','AD_CREATIVE','LOGO',
            'CORPORATE_MATERIAL','OTHER'
          )
        ),
        CONSTRAINT chk_marketing_assets_status CHECK (
          status IN ('draft','in_review','approved','rejected','archived')
        ),
        CONSTRAINT chk_marketing_assets_current_version_positive CHECK (current_version > 0)
      );

      CREATE TABLE IF NOT EXISTS marketing_asset_versions (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id       UUID NOT NULL,
        asset_id        UUID NOT NULL REFERENCES marketing_assets(id) ON DELETE CASCADE,
        version         INTEGER NOT NULL,
        status          VARCHAR(30) NOT NULL DEFAULT 'draft',
        file_url        TEXT NOT NULL,
        thumbnail_url   TEXT,
        mime_type       VARCHAR(100),
        size_bytes      BIGINT,
        change_notes    TEXT,
        metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_by      VARCHAR(255),
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT chk_marketing_asset_versions_status CHECK (
          status IN ('draft','in_review','approved','rejected','archived')
        ),
        CONSTRAINT chk_marketing_asset_versions_version_positive CHECK (version > 0)
      );

      CREATE TABLE IF NOT EXISTS marketing_asset_approvals (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id       UUID NOT NULL,
        asset_id        UUID NOT NULL REFERENCES marketing_assets(id) ON DELETE CASCADE,
        version_id      UUID NOT NULL REFERENCES marketing_asset_versions(id) ON DELETE CASCADE,
        status          VARCHAR(30) NOT NULL DEFAULT 'pending',
        requested_by    VARCHAR(255),
        decided_by      VARCHAR(255),
        comments        TEXT,
        metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
        requested_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        decided_at      TIMESTAMPTZ,
        CONSTRAINT chk_marketing_asset_approvals_status CHECK (
          status IN ('pending','approved','rejected','revision_requested')
        )
      );

      ALTER TABLE marketing_assets
        ADD CONSTRAINT fk_marketing_assets_current_version
        FOREIGN KEY (current_version_id) REFERENCES marketing_asset_versions(id)
        DEFERRABLE INITIALLY DEFERRED;

      CREATE INDEX IF NOT EXISTS idx_marketing_assets_tenant ON marketing_assets (tenant_id);
      CREATE INDEX IF NOT EXISTS idx_marketing_assets_project ON marketing_assets (tenant_id, marketing_project_id);
      CREATE INDEX IF NOT EXISTS idx_marketing_assets_type ON marketing_assets (tenant_id, asset_type);
      CREATE INDEX IF NOT EXISTS idx_marketing_assets_status ON marketing_assets (tenant_id, status);
      CREATE INDEX IF NOT EXISTS idx_marketing_assets_artist ON marketing_assets (tenant_id, artist_id);
      CREATE INDEX IF NOT EXISTS idx_marketing_assets_company ON marketing_assets (tenant_id, company_id);
      CREATE INDEX IF NOT EXISTS idx_marketing_assets_deleted ON marketing_assets (tenant_id, deleted_at);
      CREATE UNIQUE INDEX IF NOT EXISTS uq_marketing_asset_versions_asset_version
        ON marketing_asset_versions (tenant_id, asset_id, version);
      CREATE INDEX IF NOT EXISTS idx_marketing_asset_versions_status
        ON marketing_asset_versions (tenant_id, status);
      CREATE INDEX IF NOT EXISTS idx_marketing_asset_approvals_asset
        ON marketing_asset_approvals (tenant_id, asset_id, requested_at DESC);
      CREATE INDEX IF NOT EXISTS idx_marketing_asset_approvals_version
        ON marketing_asset_approvals (tenant_id, version_id);
      CREATE INDEX IF NOT EXISTS idx_marketing_asset_approvals_status
        ON marketing_asset_approvals (tenant_id, status);

      ALTER TABLE marketing_assets ENABLE ROW LEVEL SECURITY;
      ALTER TABLE marketing_asset_versions ENABLE ROW LEVEL SECURITY;
      ALTER TABLE marketing_asset_approvals ENABLE ROW LEVEL SECURITY;

      CREATE POLICY tenant_isolation ON marketing_assets
        USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
      CREATE POLICY tenant_isolation ON marketing_asset_versions
        USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
      CREATE POLICY tenant_isolation ON marketing_asset_approvals
        USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      DROP TABLE IF EXISTS marketing_asset_approvals;
      ALTER TABLE IF EXISTS marketing_assets DROP CONSTRAINT IF EXISTS fk_marketing_assets_current_version;
      DROP TABLE IF EXISTS marketing_asset_versions;
      DROP TABLE IF EXISTS marketing_assets;
    `);
  }
}
