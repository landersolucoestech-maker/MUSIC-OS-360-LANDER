import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 20260905000002_SharesPercentualRangeCheck
 *
 * `shares.percentual` (DECIMAL(7,4), NOT NULL) had no range validation
 * anywhere: not in SharesService.create/update (CreateShareDto.percentual
 * has no @Min/@Max, unlike the legacy EN alias `percentage` which does —
 * see shares.dto.ts), and not in the reports/import bulk-import path
 * (ImportCommitService writes shares via raw parameterized INSERT with
 * only FK-existence and duplicate-identity checks). A negative or >100
 * value could be persisted through either write path with no error.
 *
 * A per-row CHECK is the correct fix at this layer — it's a single-row
 * invariant (unlike "splits for a work sum to 100%", which is contextual
 * and enforced at the application layer in SharesService, since it can
 * only be evaluated with knowledge of sibling rows and is legitimately
 * incomplete while a work's shares are still being entered one at a time).
 * A single DB constraint protects both write paths at once, without
 * duplicating validation logic into the generic bulk-importer.
 *
 * NOT VALID: applies to every new INSERT/UPDATE from this migration
 * forward without requiring existing rows to already comply (unknown
 * production data cleanliness — a validating ADD CONSTRAINT could fail
 * migration deployment outright if any historical row already violates
 * it). Validate separately, later, once historical data has been
 * reviewed — VALIDATE CONSTRAINT can run without an exclusive lock issue
 * this migration would otherwise risk.
 */
export class SharesPercentualRangeCheck20260905000002 implements MigrationInterface {
  name = 'SharesPercentualRangeCheck20260905000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "shares"
        ADD CONSTRAINT "chk_shares_percentual_range"
        CHECK ("percentual" >= 0 AND "percentual" <= 100) NOT VALID
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "shares" DROP CONSTRAINT IF EXISTS "chk_shares_percentual_range"`);
  }
}
