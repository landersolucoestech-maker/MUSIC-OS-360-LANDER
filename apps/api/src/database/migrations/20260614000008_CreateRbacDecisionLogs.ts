import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRbacDecisionLogs20260614000008
  implements MigrationInterface
{
  name = 'CreateRbacDecisionLogs20260614000008';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "rbac_decision_logs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "request_id" varchar(128) NOT NULL,
        "trace_id" varchar(128) NOT NULL,
        "tenant_id" uuid,
        "workspace_id" uuid,
        "user_id" varchar(255),
        "membership_id" uuid,
        "role_id" uuid,
        "role_slug" varchar(100),
        "resource" varchar(100) NOT NULL,
        "action" varchar(100) NOT NULL,
        "permission" varchar(255) NOT NULL,
        "endpoint" text NOT NULL,
        "method" varchar(10) NOT NULL,
        "active_decision" varchar(10) NOT NULL
          CHECK ("active_decision" IN ('ALLOW', 'DENY')),
        "shadow_decision" varchar(10) NOT NULL
          CHECK ("shadow_decision" IN ('ALLOW', 'DENY')),
        "comparison_result" varchar(20) NOT NULL
          CHECK ("comparison_result" IN (
            'ALLOW_MATCH', 'DENY_MATCH', 'WOULD_ALLOW', 'WOULD_DENY'
          )),
        "decision_source" varchar(160) NOT NULL,
        "resolver_reason" varchar(100),
        "would_allow" boolean NOT NULL DEFAULT false,
        "would_deny" boolean NOT NULL DEFAULT false,
        "latency_ms" double precision NOT NULL DEFAULT 0,
        "cache_hit" boolean NOT NULL DEFAULT false,
        "authority_mode" varchar(10) NOT NULL
          CHECK ("authority_mode" IN ('OFF', 'SHADOW', 'ON')),
        CONSTRAINT "PK_rbac_decision_logs"
          PRIMARY KEY ("id", "created_at")
      ) PARTITION BY RANGE ("created_at")
    `);
    await queryRunner.query(`
      DO $$
      DECLARE
        month_start timestamptz;
        month_end timestamptz;
        partition_name text;
      BEGIN
        FOR month_start IN
          SELECT generate_series(
            date_trunc('month', now()) - interval '1 month',
            date_trunc('month', now()) + interval '2 months',
            interval '1 month'
          )
        LOOP
          month_end := month_start + interval '1 month';
          partition_name :=
            'rbac_decision_logs_' || to_char(month_start, 'YYYY_MM');
          EXECUTE format(
            'CREATE TABLE IF NOT EXISTS %I PARTITION OF "rbac_decision_logs"
             FOR VALUES FROM (%L) TO (%L)',
            partition_name,
            month_start,
            month_end
          );
        END LOOP;
      END
      $$
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "rbac_decision_logs_default"
      PARTITION OF "rbac_decision_logs" DEFAULT
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_rbac_decision_created_at"
        ON "rbac_decision_logs" ("created_at")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_rbac_decision_tenant"
        ON "rbac_decision_logs" ("tenant_id", "created_at")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_rbac_decision_user"
        ON "rbac_decision_logs" ("user_id", "created_at")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_rbac_decision_role"
        ON "rbac_decision_logs" ("role_id", "created_at")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_rbac_decision_request"
        ON "rbac_decision_logs" ("request_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_rbac_decision_resource_action"
        ON "rbac_decision_logs" ("resource", "action", "created_at")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_rbac_decision_comparison"
        ON "rbac_decision_logs" ("comparison_result", "created_at")
    `);
    await queryRunner.query(
      `ALTER TABLE "rbac_decision_logs" ENABLE ROW LEVEL SECURITY`,
    );
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
          REVOKE ALL ON TABLE "rbac_decision_logs" FROM anon;
        END IF;
        IF EXISTS (
          SELECT 1 FROM pg_roles WHERE rolname = 'authenticated'
        ) THEN
          REVOKE ALL ON TABLE "rbac_decision_logs" FROM authenticated;
        END IF;
      END
      $$
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS "rbac_decision_logs" CASCADE`,
    );
  }
}
