import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 20260905000003_RenameArtistaIdToArtistId
 *
 * Naming-normalization mandate: every technical identifier must be
 * English. The FK to `artists.id` was spelled two ways across the schema —
 * `artist_id` (English) in the artist's own module tables
 * (artist_platform_profiles, artist_metric_snapshots,
 * career_stage_snapshots, market_benchmark_snapshots) and `artista_id`
 * (Portuguese) in every cross-module table referencing artists from
 * outside their own module. Confirmed by two independent audits plus a
 * dedicated 4-way discovery pass over the whole entity file that this is
 * genuinely the same concept everywhere (never two different FKs sharing
 * a name coincidentally) — safe to canonicalize mechanically.
 *
 * `RENAME COLUMN` is a metadata-only operation in Postgres (no table
 * rewrite, no data movement, briefly held ACCESS EXCLUSIVE lock) — data is
 * fully preserved. Every dependent index/constraint automatically follows
 * the rename in its internal definition; only the index/constraint NAME
 * itself (a cosmetic label, e.g. `idx_works_artista_id`) is left as-is —
 * renaming those too is optional polish, not a correctness requirement,
 * and out of scope for this migration to keep the change minimal and
 * reviewable.
 *
 * Guarded with `IF EXISTS`/information_schema checks so this migration is
 * safe to run against a database that may have already had some of these
 * columns renamed by a prior partial run, and a no-op (not an error) if a
 * table doesn't have the column for any reason.
 */
export class RenameArtistaIdToArtistId20260905000003 implements MigrationInterface {
  name = 'RenameArtistaIdToArtistId20260905000003';

  private readonly tables = [
    'works', 'phonograms', 'contracts', 'transactions', 'campaigns',
    'briefings', 'events', 'projects', 'releases', 'shares', 'takedowns',
    'artist_goals', 'content_detections', 'licenses',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of this.tables) {
      await queryRunner.query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = '${table}' AND column_name = 'artista_id'
          ) THEN
            ALTER TABLE "${table}" RENAME COLUMN "artista_id" TO "artist_id";
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
            WHERE table_name = '${table}' AND column_name = 'artist_id'
          ) THEN
            ALTER TABLE "${table}" RENAME COLUMN "artist_id" TO "artista_id";
          END IF;
        END $$;
      `);
    }
  }
}
