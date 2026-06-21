import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Dedicated, auditable error sink for the RBAC pipeline. Each unexpected failure
 * in a guard, the permission resolver, the shadow comparison or the distributed
 * cache is recorded as its own row (no inference, no proxy metrics). Tenant-scoped
 * with RLS so error rows respect the same isolation as the rest of the system.
 */
export class CreateRbacErrorLogs20260621000001 implements MigrationInterface {
  name = 'CreateRbacErrorLogs20260621000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "rbac_error_logs" (
        "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "created_at"     timestamptz NOT NULL DEFAULT now(),
        "request_id"     varchar(128),
        "trace_id"       varchar(128),
        "tenant_id"      uuid,
        "user_id"        uuid,
        "error_type"     varchar(64)  NOT NULL,
        "error_source"   varchar(64)  NOT NULL,
        "message"        text,
        "stack"          text,
        "authority_mode" varchar(32),
        "metadata"       jsonb NOT NULL DEFAULT '{}'::jsonb
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_rbac_error_logs_type_time" ON "rbac_error_logs" ("error_type", "created_at" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_rbac_error_logs_tenant" ON "rbac_error_logs" ("tenant_id", "created_at" DESC)`,
    );
    // RLS: tenant isolation (same posture as the rest of the schema). System
    // inserts (no tenant context) are allowed via the service-role/owner path.
    await queryRunner.query(`ALTER TABLE "rbac_error_logs" ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE schemaname='public'
            AND tablename='rbac_error_logs' AND policyname='tenant_isolation'
        ) THEN
          EXECUTE 'CREATE POLICY "tenant_isolation" ON "rbac_error_logs" FOR ALL TO authenticated
                   USING ("tenant_id" IS NULL OR "tenant_id" = public.private_get_tenant_id())
                   WITH CHECK (true)';
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'musicos_app') THEN
          EXECUTE 'GRANT SELECT, INSERT ON TABLE public."rbac_error_logs" TO musicos_app';
        END IF;
      END $$;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "rbac_error_logs"`);
  }
}
