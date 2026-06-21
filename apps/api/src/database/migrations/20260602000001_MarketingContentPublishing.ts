import { MigrationInterface, QueryRunner } from 'typeorm';

export class MarketingContentPublishing20260602000001 implements MigrationInterface {
  name = 'MarketingContentPublishing20260602000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS marketing_content_posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        title VARCHAR(500) NOT NULL,
        target_type VARCHAR(40) NOT NULL,
        target_name VARCHAR(500) NOT NULL,
        channel VARCHAR(40) NOT NULL,
        content_type VARCHAR(40) NOT NULL,
        status VARCHAR(40) NOT NULL DEFAULT 'agendado',
        publication_status VARCHAR(40) NOT NULL DEFAULT 'pending',
        publish_date DATE NOT NULL,
        publish_time VARCHAR(10) NOT NULL,
        scheduled_for TIMESTAMPTZ NOT NULL,
        copy TEXT NOT NULL,
        notes TEXT,
        owner VARCHAR(255),
        campaign_id UUID,
        project_id UUID,
        format VARCHAR(120),
        files JSONB NOT NULL DEFAULT '[]'::jsonb,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        publish_job_id VARCHAR(255),
        provider_post_id VARCHAR(255),
        publication_error TEXT,
        published_at TIMESTAMPTZ,
        created_by VARCHAR(255),
        updated_by VARCHAR(255),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        deleted_at TIMESTAMPTZ
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_marketing_content_posts_tenant_status ON marketing_content_posts (tenant_id, status) WHERE deleted_at IS NULL`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_marketing_content_posts_tenant_publication ON marketing_content_posts (tenant_id, publication_status) WHERE deleted_at IS NULL`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_marketing_content_posts_tenant_scheduled ON marketing_content_posts (tenant_id, scheduled_for) WHERE deleted_at IS NULL`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_marketing_content_posts_tenant_project ON marketing_content_posts (tenant_id, project_id) WHERE deleted_at IS NULL`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_marketing_content_posts_tenant_campaign ON marketing_content_posts (tenant_id, campaign_id) WHERE deleted_at IS NULL`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_marketing_content_posts_tenant_campaign`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_marketing_content_posts_tenant_project`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_marketing_content_posts_tenant_scheduled`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_marketing_content_posts_tenant_publication`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_marketing_content_posts_tenant_status`);
    await queryRunner.query(`DROP TABLE IF EXISTS marketing_content_posts`);
  }
}
