import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 20260516000001_AuditLogEnterpriseColumns
 *
 * Task #4 — Auditoria Operacional Enterprise
 *
 * Adds 7 new columns to `audit_logs`:
 *   - org_id          : billing boundary (UUID, nullable)
 *   - actor_role      : role at time of action (VARCHAR 50, nullable)
 *   - diff            : JSONB — only the changed fields { key: { from, to } }
 *   - correlation_id  : links to domain_event_log via AsyncLocalStorage
 *   - session_id      : client session identifier (X-Session-Id header)
 *   - http_method     : HTTP verb (GET/POST/PATCH/DELETE)
 *   - http_path       : full URL path of the originating request
 *
 * Adds 2 new indices:
 *   - idx_audit_logs_correlation_id
 *   - idx_audit_logs_tenant_entity_id  (tenant_id, entity, entity_id)
 *
 * Adds append-only DB-level protection:
 *   - PostgreSQL trigger `trg_audit_logs_immutable` that raises an exception
 *     on any UPDATE or DELETE against `audit_logs`.
 *     This enforces the append-only guarantee at the DB layer, independent of
 *     application code.
 *
 * Rollback (down):
 *   - Removes the trigger + function
 *   - Drops new indices
 *   - Drops new columns (ALTER TABLE … DROP COLUMN)
 *   - Does NOT touch existing rows or original columns
 */
export class AuditLogEnterpriseColumns20260516000001 implements MigrationInterface {
  name = 'AuditLogEnterpriseColumns20260516000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. New columns ────────────────────────────────────────────────────────

    await queryRunner.query(`
      ALTER TABLE "audit_logs"
        ADD COLUMN IF NOT EXISTS "org_id"         UUID,
        ADD COLUMN IF NOT EXISTS "actor_role"     VARCHAR(50),
        ADD COLUMN IF NOT EXISTS "diff"           JSONB,
        ADD COLUMN IF NOT EXISTS "correlation_id" VARCHAR(255),
        ADD COLUMN IF NOT EXISTS "session_id"     VARCHAR(255),
        ADD COLUMN IF NOT EXISTS "http_method"    VARCHAR(10),
        ADD COLUMN IF NOT EXISTS "http_path"      TEXT
    `);

    // ── 2. New indices ────────────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_audit_logs_correlation_id"
        ON "audit_logs" ("correlation_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_audit_logs_tenant_entity_id"
        ON "audit_logs" ("tenant_id", "entity", "entity_id")
    `);

    // ── 3. Append-only trigger function ───────────────────────────────────────
    // Blocks any UPDATE or DELETE at the database level regardless of application code.

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION fn_audit_logs_immutable()
      RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        RAISE EXCEPTION
          'audit_logs is append-only — UPDATE and DELETE are forbidden. '
          'Attempted operation: %. Offending row id: %',
          TG_OP, OLD.id;
        RETURN NULL;
      END;
      $$
    `);

    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON "audit_logs"
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_audit_logs_immutable
        BEFORE UPDATE OR DELETE ON "audit_logs"
        FOR EACH ROW EXECUTE FUNCTION fn_audit_logs_immutable()
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // ── Remove trigger + function ─────────────────────────────────────────────
    await queryRunner.query(`DROP TRIGGER  IF EXISTS trg_audit_logs_immutable ON "audit_logs"`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS fn_audit_logs_immutable()`);

    // ── Remove indices ────────────────────────────────────────────────────────
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_audit_logs_tenant_entity_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_audit_logs_correlation_id"`);

    // ── Remove columns ────────────────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "audit_logs"
        DROP COLUMN IF EXISTS "http_path",
        DROP COLUMN IF EXISTS "http_method",
        DROP COLUMN IF EXISTS "session_id",
        DROP COLUMN IF EXISTS "correlation_id",
        DROP COLUMN IF EXISTS "diff",
        DROP COLUMN IF EXISTS "actor_role",
        DROP COLUMN IF EXISTS "org_id"
    `);
  }
}
