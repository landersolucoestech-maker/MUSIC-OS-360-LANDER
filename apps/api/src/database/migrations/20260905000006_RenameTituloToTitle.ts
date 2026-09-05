import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 20260905000006_RenameTituloToTitle
 *
 * Naming-normalization mandate (Batch 5, first generic-noun family):
 * `titulo` (Portuguese) was the "title" column name across 10 tables that
 * each have their own independent title field (works, phonograms,
 * contracts, briefings, events, projects, releases, takedowns,
 * artist_goals, licenses) — not a single shared FK, so no cross-table
 * relationship is affected by this rename.
 *
 * contracts and phonograms additionally expose a dual PT/EN alias-resolver
 * (contract-legacy-alias.util.ts, phonogram-legacy-alias.util.ts) that used
 * to treat `titulo` as canonical and `title` as the legacy EN input alias.
 * Those resolvers were updated in the same commit to swap the roles:
 * `title` is now canonical (matches this physical rename), `titulo` is the
 * legacy alias still accepted for old callers.
 *
 * `RENAME COLUMN` is metadata-only in Postgres (no rewrite, no data
 * movement). Guarded with `IF EXISTS` so this is safe to re-run and a
 * no-op if a table doesn't have the column.
 */
export class RenameTituloToTitle20260905000006 implements MigrationInterface {
  name = 'RenameTituloToTitle20260905000006';

  private readonly tables = [
    'works', 'phonograms', 'contracts', 'briefings', 'events',
    'projects', 'releases', 'takedowns', 'artist_goals', 'licenses',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of this.tables) {
      await queryRunner.query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = '${table}' AND column_name = 'titulo'
          ) THEN
            ALTER TABLE "${table}" RENAME COLUMN "titulo" TO "title";
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
            WHERE table_name = '${table}' AND column_name = 'title'
          ) THEN
            ALTER TABLE "${table}" RENAME COLUMN "title" TO "titulo";
          END IF;
        END $$;
      `);
    }
  }
}
