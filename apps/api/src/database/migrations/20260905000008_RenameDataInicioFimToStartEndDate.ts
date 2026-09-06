import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 20260905000008_RenameDataInicioFimToStartEndDate
 *
 * Naming-normalization mandate (Batch 5, third generic-noun sub-concept):
 * `data_inicio`/`data_fim` (Portuguese) -> `start_date`/`end_date` across 6
 * tables that each have their own independent date-range fields
 * (contracts, campaigns, events [end_date only — start is already
 * `starts_at`/`data`, unrelated to this rename], artist_goals, licenses,
 * leave_requests). Not a shared FK — no cross-table relationship affected.
 *
 * `contracts` needed special handling beyond a plain rename:
 * contract-legacy-alias.util.ts's date pair already had TWO accepted
 * spellings — the PT canonical `data_inicio`/`data_fim` and an EN legacy
 * alias `startsAt`/`expiresAt` that predates this migration and is
 * unrelated to it. After this rename, `start_date`/`end_date` are
 * canonical and BOTH `data_inicio`/`startsAt` (and `data_fim`/`expiresAt`)
 * remain accepted as legacy aliases — resolvePair() was generalized from a
 * 2-way to an N-way comparison to support this without dropping either
 * previously-accepted spelling.
 *
 * `RENAME COLUMN` is metadata-only in Postgres (no rewrite, no data
 * movement). Guarded with `IF EXISTS` so this is safe to re-run and a
 * no-op if a table doesn't have the column.
 */
export class RenameDataInicioFimToStartEndDate20260905000008 implements MigrationInterface {
  name = 'RenameDataInicioFimToStartEndDate20260905000008';

  private readonly startDateTables = [
    'contracts', 'campaigns', 'artist_goals', 'licenses', 'leave_requests',
  ];

  private readonly endDateTables = [
    'contracts', 'campaigns', 'events', 'artist_goals', 'licenses', 'leave_requests',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of this.startDateTables) {
      await queryRunner.query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = '${table}' AND column_name = 'data_inicio'
          ) THEN
            ALTER TABLE "${table}" RENAME COLUMN "data_inicio" TO "start_date";
          END IF;
        END $$;
      `);
    }
    for (const table of this.endDateTables) {
      await queryRunner.query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = '${table}' AND column_name = 'data_fim'
          ) THEN
            ALTER TABLE "${table}" RENAME COLUMN "data_fim" TO "end_date";
          END IF;
        END $$;
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of this.startDateTables) {
      await queryRunner.query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = '${table}' AND column_name = 'start_date'
          ) THEN
            ALTER TABLE "${table}" RENAME COLUMN "start_date" TO "data_inicio";
          END IF;
        END $$;
      `);
    }
    for (const table of this.endDateTables) {
      await queryRunner.query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = '${table}' AND column_name = 'end_date'
          ) THEN
            ALTER TABLE "${table}" RENAME COLUMN "end_date" TO "data_fim";
          END IF;
        END $$;
      `);
    }
  }
}
