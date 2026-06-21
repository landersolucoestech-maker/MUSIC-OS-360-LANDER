import type { MigrationInterface, QueryRunner } from 'typeorm';

export class NotificationSettings20260613000016 implements MigrationInterface {
  name = 'NotificationSettings20260613000016';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notification_settings" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" UUID NOT NULL REFERENCES "tenants" ("id") ON DELETE CASCADE,
        "notification_key" VARCHAR(100) NOT NULL,
        "enabled" BOOLEAN NOT NULL DEFAULT true,
        "config_json" JSONB NOT NULL DEFAULT '{}'::jsonb,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "uq_notification_settings_tenant_key"
          UNIQUE ("tenant_id", "notification_key")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_notification_settings_tenant_id"
        ON "notification_settings" ("tenant_id")
    `);
    await queryRunner.query(`ALTER TABLE "notification_settings" ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_policy
          WHERE polname = 'tenant_isolation'
            AND polrelid = 'public.notification_settings'::regclass
        ) THEN
          CREATE POLICY "tenant_isolation"
            ON "notification_settings"
            USING (tenant_id = private_get_tenant_id())
            WITH CHECK (tenant_id = private_get_tenant_id());
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'musicos_app') THEN
          GRANT SELECT, INSERT, UPDATE, DELETE ON "notification_settings" TO "musicos_app";
        END IF;
      END $$;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "notification_settings"`);
  }
}
