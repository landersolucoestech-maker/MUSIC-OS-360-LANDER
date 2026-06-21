import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Registry (ABRAMUS/ECAD) — Phase 3: Society Integration gateway.
 *
 * Six NEW tables, no existing table touched. Submission status is enforced both
 * by a code-level state machine and a DB CHECK. Payload snapshots are immutable
 * (insert-only, hashed). Idempotent up / reversible down.
 */
export class SocietyIntegration20260601000003 implements MigrationInterface {
  name = 'SocietyIntegration20260601000003';

  private readonly SUBMISSION_STATUSES = [
    'DRAFT', 'VALIDATING', 'VALID', 'INVALID', 'READY', 'EXPORTED', 'SUBMITTED',
    'PROCESSING', 'APPROVED', 'REJECTED', 'REQUIRES_CORRECTION', 'FAILED', 'CANCELLED',
  ];

  async up(qr: QueryRunner): Promise<void> {
    const subStatuses = this.SUBMISSION_STATUSES.map((s) => `'${s}'`).join(', ');

    await qr.query(`
      CREATE TABLE IF NOT EXISTS society_accounts (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id       UUID NOT NULL,
        society         VARCHAR(50) NOT NULL,
        driver          VARCHAR(30) NOT NULL,
        account_name    VARCHAR(255) NOT NULL,
        member_code     VARCHAR(100),
        credentials_ref VARCHAR(255),
        status          VARCHAR(30) NOT NULL DEFAULT 'PENDING',
        metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
        deleted_at      TIMESTAMP,
        created_by      VARCHAR(255),
        updated_by      VARCHAR(255),
        CONSTRAINT chk_society_accounts_driver CHECK (driver IN ('MANUAL_EXPORT','PARTNER_API','PORTAL_RPA')),
        CONSTRAINT chk_society_accounts_status CHECK (status IN ('ACTIVE','INACTIVE','PENDING','ERROR'))
      );
      CREATE INDEX IF NOT EXISTS idx_society_accounts_tenant  ON society_accounts (tenant_id);
      CREATE INDEX IF NOT EXISTS idx_society_accounts_society ON society_accounts (tenant_id, society);
    `);

    await qr.query(`
      CREATE TABLE IF NOT EXISTS society_submissions (
        id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id                   UUID NOT NULL,
        account_id                  UUID,
        society                     VARCHAR(50) NOT NULL,
        driver                      VARCHAR(30) NOT NULL,
        entity_type                 VARCHAR(30) NOT NULL,
        entity_id                   UUID NOT NULL,
        status                      VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
        protocol                    VARCHAR(100),
        external_id                 VARCHAR(255),
        current_payload_snapshot_id UUID,
        submitted_by                VARCHAR(255),
        submitted_at                TIMESTAMP,
        approved_at                 TIMESTAMP,
        rejected_at                 TIMESTAMP,
        failure_reason              TEXT,
        metadata                    JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at                  TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at                  TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT chk_society_submissions_driver CHECK (driver IN ('MANUAL_EXPORT','PARTNER_API','PORTAL_RPA')),
        CONSTRAINT chk_society_submissions_entity CHECK (entity_type IN ('WORK','RECORDING','RIGHTS_HOLDER','RELEASE','SUBMISSION')),
        CONSTRAINT chk_society_submissions_status CHECK (status IN (${subStatuses}))
      );
      CREATE INDEX IF NOT EXISTS idx_society_submissions_tenant ON society_submissions (tenant_id);
      CREATE INDEX IF NOT EXISTS idx_society_submissions_status ON society_submissions (tenant_id, status);
      CREATE INDEX IF NOT EXISTS idx_society_submissions_entity ON society_submissions (tenant_id, entity_type, entity_id);
      -- A protocol, once assigned, is unique within a society/tenant.
      CREATE UNIQUE INDEX IF NOT EXISTS uq_society_submissions_protocol
        ON society_submissions (tenant_id, society, protocol)
        WHERE protocol IS NOT NULL;
    `);

    await qr.query(`
      CREATE TABLE IF NOT EXISTS society_submission_events (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id     UUID NOT NULL,
        submission_id UUID NOT NULL REFERENCES society_submissions(id) ON DELETE CASCADE,
        from_status   VARCHAR(30),
        to_status     VARCHAR(30),
        event_type    VARCHAR(40) NOT NULL,
        message       TEXT,
        metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_by    VARCHAR(255),
        created_at    TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_society_events_tenant     ON society_submission_events (tenant_id);
      CREATE INDEX IF NOT EXISTS idx_society_events_submission ON society_submission_events (submission_id);
    `);

    await qr.query(`
      CREATE TABLE IF NOT EXISTS society_payload_snapshots (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id     UUID NOT NULL,
        submission_id UUID NOT NULL REFERENCES society_submissions(id) ON DELETE CASCADE,
        version       INTEGER NOT NULL,
        payload       JSONB NOT NULL,
        payload_hash  VARCHAR(64) NOT NULL,
        created_by    VARCHAR(255),
        created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_society_snapshot_version UNIQUE (submission_id, version)
      );
      CREATE INDEX IF NOT EXISTS idx_society_snapshots_tenant     ON society_payload_snapshots (tenant_id);
      CREATE INDEX IF NOT EXISTS idx_society_snapshots_submission ON society_payload_snapshots (submission_id);
    `);

    await qr.query(`
      CREATE TABLE IF NOT EXISTS society_validation_errors (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id     UUID NOT NULL,
        submission_id UUID,
        entity_type   VARCHAR(30) NOT NULL,
        entity_id     UUID NOT NULL,
        severity      VARCHAR(20) NOT NULL,
        field_path    VARCHAR(255),
        code          VARCHAR(100) NOT NULL,
        message       TEXT NOT NULL,
        created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT chk_society_validation_severity CHECK (severity IN ('ERROR','WARNING','INFO'))
      );
      CREATE INDEX IF NOT EXISTS idx_society_valerr_tenant     ON society_validation_errors (tenant_id);
      CREATE INDEX IF NOT EXISTS idx_society_valerr_entity     ON society_validation_errors (tenant_id, entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS idx_society_valerr_submission ON society_validation_errors (submission_id);
    `);

    await qr.query(`
      CREATE TABLE IF NOT EXISTS society_sync_jobs (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id     UUID NOT NULL,
        society       VARCHAR(50) NOT NULL,
        driver        VARCHAR(30) NOT NULL,
        status        VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        started_at    TIMESTAMP,
        finished_at   TIMESTAMP,
        error_message TEXT,
        metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_by    VARCHAR(255),
        created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT chk_society_sync_status CHECK (status IN ('PENDING','RUNNING','SUCCESS','FAILED','CANCELLED'))
      );
      CREATE INDEX IF NOT EXISTS idx_society_sync_tenant ON society_sync_jobs (tenant_id);
      CREATE INDEX IF NOT EXISTS idx_society_sync_status ON society_sync_jobs (tenant_id, status);
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS society_sync_jobs;`);
    await qr.query(`DROP TABLE IF EXISTS society_validation_errors;`);
    await qr.query(`DROP TABLE IF EXISTS society_payload_snapshots;`);
    await qr.query(`DROP TABLE IF EXISTS society_submission_events;`);
    await qr.query(`DROP TABLE IF EXISTS society_submissions;`);
    await qr.query(`DROP TABLE IF EXISTS society_accounts;`);
  }
}
