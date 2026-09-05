import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 20260905000004_RenameObraIdToWorkId
 *
 * Naming-normalization mandate: every technical identifier must be
 * English. The FK to `works.id` was spelled `obra_id` (Portuguese) in
 * every cross-module table referencing works from outside the works
 * module itself (works.id is the PK, never renamed here). Confirmed by
 * the same discovery pass used for `artista_id` → `artist_id`
 * (20260905000003) that this is genuinely the same concept everywhere.
 *
 * `RENAME COLUMN` is a metadata-only operation in Postgres (no table
 * rewrite, no data movement, briefly held ACCESS EXCLUSIVE lock) — data is
 * fully preserved. Index/constraint NAMES (e.g. `fk_phonograms_obra_id`)
 * are left as-is — cosmetic, out of scope for this migration.
 *
 * `takedowns.obra_id` is included defensively: the entity still declares
 * it, but the 2026-07-19 canonical-form-order rebuild for `takedowns`
 * already dropped this column from the live schema (confirmed orphaned,
 * no real data) — the guard makes this a no-op there.
 *
 * Guarded with `IF EXISTS`/information_schema checks so this migration is
 * safe to run against a database that may have already had some of these
 * columns renamed by a prior partial run, and a no-op (not an error) if a
 * table doesn't have the column for any reason.
 */
export class RenameObraIdToWorkId20260905000004 implements MigrationInterface {
  name = 'RenameObraIdToWorkId20260905000004';

  private readonly tables = [
    'phonograms', 'licenses', 'shares', 'takedowns',
    'content_detections', 'ecad_reports',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of this.tables) {
      await queryRunner.query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = '${table}' AND column_name = 'obra_id'
          ) THEN
            ALTER TABLE "${table}" RENAME COLUMN "obra_id" TO "work_id";
          END IF;
        END $$;
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of this.tables) {
      await queryRunner.query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = '${table}' AND column_name = 'work_id'
          ) THEN
            ALTER TABLE "${table}" RENAME COLUMN "work_id" TO "obra_id";
          END IF;
        END $$;
      `);
    }
  }
}
