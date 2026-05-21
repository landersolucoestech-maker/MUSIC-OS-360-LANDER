import { MigrationInterface, QueryRunner } from 'typeorm';

export class ActivityLogs20260520000002 implements MigrationInterface {
  name = 'ActivityLogs20260520000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "activity_logs" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" UUID NOT NULL,
        "entity_type" VARCHAR(50) NOT NULL,
        "entity_id" UUID NOT NULL,
        "action" VARCHAR(100) NOT NULL,
        "description" TEXT NOT NULL,
        "metadata" JSONB NOT NULL DEFAULT '{}',
        "user_id" VARCHAR(255) NOT NULL,
        "user_name" VARCHAR(255),
        "user_avatar_url" TEXT,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_activity_logs_tenant_id" ON "activity_logs" ("tenant_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_activity_logs_entity" ON "activity_logs" ("entity_type", "entity_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_activity_logs_user_id" ON "activity_logs" ("user_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "activity_logs"`);
  }
}
