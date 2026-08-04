import { MigrationInterface, QueryRunner } from 'typeorm';

/** Adds the canonical percentage field used by the licensing form. */
export class AddLicensePercentage20260804000001 implements MigrationInterface {
  name = 'AddLicensePercentage20260804000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "licenses"
      ADD COLUMN IF NOT EXISTS "percentage" numeric(7,4)
    `);

    // Some legacy databases stored the value inside a JSON/JSONB metadata
    // column, while clean installations do not have that column. Dynamic SQL
    // avoids resolving a missing column and preserves valid legacy values when
    // the column is available.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'licenses'
            AND column_name = 'metadata'
            AND data_type IN ('json', 'jsonb')
        ) THEN
          EXECUTE $backfill$
            UPDATE "licenses"
            SET "percentage" = TRIM(("metadata"::jsonb)->>'percentage')::numeric
            WHERE "percentage" IS NULL
              AND "metadata" IS NOT NULL
              AND ("metadata"::jsonb) ? 'percentage'
              AND TRIM(("metadata"::jsonb)->>'percentage') ~ '^[0-9]+([.][0-9]+)?$'
              AND TRIM(("metadata"::jsonb)->>'percentage')::numeric BETWEEN 0 AND 100
          $backfill$;
        END IF;
      END $$
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'CHK_licenses_percentage_range'
            AND conrelid = 'licenses'::regclass
        ) THEN
          ALTER TABLE "licenses"
          ADD CONSTRAINT "CHK_licenses_percentage_range"
          CHECK ("percentage" IS NULL OR ("percentage" >= 0 AND "percentage" <= 100));
        END IF;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "licenses"
      DROP CONSTRAINT IF EXISTS "CHK_licenses_percentage_range"
    `);
    await queryRunner.query(`
      ALTER TABLE "licenses"
      DROP COLUMN IF EXISTS "percentage"
    `);
  }
}
