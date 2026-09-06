import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 20260905000007_RenameTipoToType
 *
 * Naming-normalization mandate (Batch 5, second generic-noun sub-concept):
 * `tipo` (Portuguese) was the "type" column name across 18 tables that
 * each have their own independent type field (works, phonograms,
 * contracts, transactions, invoices, lead_interactions, campaigns, events,
 * projects, releases, shares, takedowns, artist_goals, content_detections,
 * ecad_reports, leave_requests, licenses, financial_rules) — not a shared
 * FK, so no cross-table relationship is affected.
 *
 * contract-legacy-alias.util.ts's TYPE_SPEC (contracts only) had canonical
 * PT `tipo`, legacy-accepted alias EN `type`; roles swapped in the same
 * commit — `type` is now canonical (matches this physical rename), `tipo`
 * is the still-accepted legacy alias. Every other table listed here never
 * had a dual PT/EN alias mechanism for this field — plain 1:1 rename.
 *
 * `RENAME COLUMN` is metadata-only in Postgres (no rewrite, no data
 * movement). Guarded with `IF EXISTS` so this is safe to re-run and a
 * no-op if a table doesn't have the column.
 */
export class RenameTipoToType20260905000007 implements MigrationInterface {
  name = 'RenameTipoToType20260905000007';

  private readonly tables = [
    'works', 'phonograms', 'contracts', 'transactions', 'invoices',
    'lead_interactions', 'campaigns', 'events', 'projects', 'releases',
    'shares', 'takedowns', 'artist_goals', 'content_detections',
    'ecad_reports', 'leave_requests', 'licenses', 'financial_rules',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of this.tables) {
      await queryRunner.query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = '${table}' AND column_name = 'tipo'
          ) THEN
            ALTER TABLE "${table}" RENAME COLUMN "tipo" TO "type";
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
            WHERE table_name = '${table}' AND column_name = 'type'
          ) THEN
            ALTER TABLE "${table}" RENAME COLUMN "type" TO "tipo";
          END IF;
        END $$;
      `);
    }
  }
}
