import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Registry (ABRAMUS/ECAD) — Phase 1: extend existing entities, nullable-first.
 *
 * Safe & reversible: only ADD COLUMN IF NOT EXISTS (no NOT NULL, no rewrite, no
 * drop of legacy columns). Reuses the existing `works`, `phonograms` and
 * `shares` tables — nothing is renamed or removed. Backfill and tightening
 * (unique ISRC, FKs to rights_holders, NOT NULL) come in later phases.
 *
 * Idempotent: re-running is a no-op. `down()` removes exactly what `up()` added.
 */
export class RegistryFieldsPhase120260601000001 implements MigrationInterface {
  name = 'RegistryFieldsPhase120260601000001';

  private readonly REGISTRY_STATUSES = [
    'DRAFT', 'READY_FOR_VALIDATION', 'VALIDATED', 'READY_TO_SUBMIT', 'SUBMITTED',
    'PROCESSING', 'APPROVED', 'REJECTED', 'REQUIRES_CORRECTION', 'FAILED', 'ARCHIVED',
  ];

  async up(qr: QueryRunner): Promise<void> {
    const statusList = this.REGISTRY_STATUSES.map((s) => `'${s}'`).join(', ');

    // ── works (obra) ─────────────────────────────────────────────────────────
    await qr.query(`
      ALTER TABLE works
        ADD COLUMN IF NOT EXISTS alternative_titles JSONB,
        ADD COLUMN IF NOT EXISTS language            VARCHAR(10),
        ADD COLUMN IF NOT EXISTS lyrics              TEXT,
        ADD COLUMN IF NOT EXISTS is_instrumental     BOOLEAN,
        ADD COLUMN IF NOT EXISTS duration_seconds    INTEGER,
        ADD COLUMN IF NOT EXISTS registry_status     VARCHAR(50),
        ADD COLUMN IF NOT EXISTS external_reference  VARCHAR(255),
        ADD COLUMN IF NOT EXISTS abramus_protocol    VARCHAR(100),
        ADD COLUMN IF NOT EXISTS ai_used             BOOLEAN,
        ADD COLUMN IF NOT EXISTS ai_tools            JSONB,
        ADD COLUMN IF NOT EXISTS ai_prompts          JSONB;
    `);

    // ── phonograms (fonograma / recording) ───────────────────────────────────
    await qr.query(`
      ALTER TABLE phonograms
        ADD COLUMN IF NOT EXISTS version_title             VARCHAR(255),
        ADD COLUMN IF NOT EXISTS recording_date            TIMESTAMP,
        ADD COLUMN IF NOT EXISTS release_date              TIMESTAMP,
        ADD COLUMN IF NOT EXISTS phonographic_producer_id  UUID,
        ADD COLUMN IF NOT EXISTS main_artist_id            UUID,
        ADD COLUMN IF NOT EXISTS label_id                  UUID,
        ADD COLUMN IF NOT EXISTS copyright_year            INTEGER,
        ADD COLUMN IF NOT EXISTS copyright_owner           VARCHAR(255),
        ADD COLUMN IF NOT EXISTS country_of_recording      VARCHAR(2),
        ADD COLUMN IF NOT EXISTS audio_file_id             UUID,
        ADD COLUMN IF NOT EXISTS duration_seconds          INTEGER,
        ADD COLUMN IF NOT EXISTS registry_status           VARCHAR(50),
        ADD COLUMN IF NOT EXISTS external_reference        VARCHAR(255),
        ADD COLUMN IF NOT EXISTS abramus_protocol          VARCHAR(100);
    `);

    // ── shares (splits / contributors) ───────────────────────────────────────
    await qr.query(`
      ALTER TABLE shares
        ADD COLUMN IF NOT EXISTS rights_holder_id  UUID,
        ADD COLUMN IF NOT EXISTS publisher_id      UUID,
        ADD COLUMN IF NOT EXISTS role              VARCHAR(50),
        ADD COLUMN IF NOT EXISTS territory         VARCHAR(10),
        ADD COLUMN IF NOT EXISTS instrument        VARCHAR(100),
        ADD COLUMN IF NOT EXISTS credited_name     VARCHAR(255),
        ADD COLUMN IF NOT EXISTS is_primary        BOOLEAN,
        ADD COLUMN IF NOT EXISTS is_featured       BOOLEAN,
        ADD COLUMN IF NOT EXISTS start_date        TIMESTAMP,
        ADD COLUMN IF NOT EXISTS end_date          TIMESTAMP;
    `);

    // ── registry_status CHECK (idempotent; allows NULL) ──────────────────────
    await qr.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_works_registry_status') THEN
          ALTER TABLE works ADD CONSTRAINT chk_works_registry_status
            CHECK (registry_status IS NULL OR registry_status IN (${statusList}));
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_phonograms_registry_status') THEN
          ALTER TABLE phonograms ADD CONSTRAINT chk_phonograms_registry_status
            CHECK (registry_status IS NULL OR registry_status IN (${statusList}));
        END IF;
      END $$;
    `);

    // ── Helpful indexes for the new lookup/FK columns ────────────────────────
    await qr.query(`
      CREATE INDEX IF NOT EXISTS idx_works_registry_status       ON works (tenant_id, registry_status);
      CREATE INDEX IF NOT EXISTS idx_phonograms_registry_status  ON phonograms (tenant_id, registry_status);
      CREATE INDEX IF NOT EXISTS idx_phonograms_producer         ON phonograms (phonographic_producer_id);
      CREATE INDEX IF NOT EXISTS idx_phonograms_audio_file       ON phonograms (audio_file_id);
      CREATE INDEX IF NOT EXISTS idx_shares_rights_holder        ON shares (rights_holder_id);
      CREATE INDEX IF NOT EXISTS idx_shares_publisher            ON shares (publisher_id);
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      DROP INDEX IF EXISTS idx_works_registry_status;
      DROP INDEX IF EXISTS idx_phonograms_registry_status;
      DROP INDEX IF EXISTS idx_phonograms_producer;
      DROP INDEX IF EXISTS idx_phonograms_audio_file;
      DROP INDEX IF EXISTS idx_shares_rights_holder;
      DROP INDEX IF EXISTS idx_shares_publisher;
    `);
    await qr.query(`
      ALTER TABLE works       DROP CONSTRAINT IF EXISTS chk_works_registry_status;
      ALTER TABLE phonograms  DROP CONSTRAINT IF EXISTS chk_phonograms_registry_status;
    `);

    await qr.query(`
      ALTER TABLE works
        DROP COLUMN IF EXISTS alternative_titles,
        DROP COLUMN IF EXISTS language,
        DROP COLUMN IF EXISTS lyrics,
        DROP COLUMN IF EXISTS is_instrumental,
        DROP COLUMN IF EXISTS duration_seconds,
        DROP COLUMN IF EXISTS registry_status,
        DROP COLUMN IF EXISTS external_reference,
        DROP COLUMN IF EXISTS abramus_protocol,
        DROP COLUMN IF EXISTS ai_used,
        DROP COLUMN IF EXISTS ai_tools,
        DROP COLUMN IF EXISTS ai_prompts;
    `);
    await qr.query(`
      ALTER TABLE phonograms
        DROP COLUMN IF EXISTS version_title,
        DROP COLUMN IF EXISTS recording_date,
        DROP COLUMN IF EXISTS release_date,
        DROP COLUMN IF EXISTS phonographic_producer_id,
        DROP COLUMN IF EXISTS main_artist_id,
        DROP COLUMN IF EXISTS label_id,
        DROP COLUMN IF EXISTS copyright_year,
        DROP COLUMN IF EXISTS copyright_owner,
        DROP COLUMN IF EXISTS country_of_recording,
        DROP COLUMN IF EXISTS audio_file_id,
        DROP COLUMN IF EXISTS duration_seconds,
        DROP COLUMN IF EXISTS registry_status,
        DROP COLUMN IF EXISTS external_reference,
        DROP COLUMN IF EXISTS abramus_protocol;
    `);
    await qr.query(`
      ALTER TABLE shares
        DROP COLUMN IF EXISTS rights_holder_id,
        DROP COLUMN IF EXISTS publisher_id,
        DROP COLUMN IF EXISTS role,
        DROP COLUMN IF EXISTS territory,
        DROP COLUMN IF EXISTS instrument,
        DROP COLUMN IF EXISTS credited_name,
        DROP COLUMN IF EXISTS is_primary,
        DROP COLUMN IF EXISTS is_featured,
        DROP COLUMN IF EXISTS start_date,
        DROP COLUMN IF EXISTS end_date;
    `);
  }
}
