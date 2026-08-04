import { MigrationInterface, QueryRunner } from 'typeorm';

/** Adds the canonical percentage field used by the licensing form. */
export class AddLicensePercentage20260804000001 implements MigrationInterface {
  name = 'AddLicensePercentage20260804000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "licenses"
      ADD COLUMN IF NOT EXISTS "percentage" numeric(7,4)
    `);

    // Preserve values written by the legacy implementation in metadata.
    // Invalid, non-numeric or out-of-range values remain untouched in metadata
    // instead of aborting the migration.
    await queryRunner.query(`
      UPDATE "licenses"
      SET "percentage" = TRIM("metadata"->>'percentage')::numeric
      WHERE "percentage" IS NULL
        AND "metadata" IS NOT NULL
        AND "metadata" ? 'percentage'
        AND TRIM("metadata"->>'percentage') ~ '^[0-9]+([.][0-9]+)?$'
        AND TRIM("metadata"->>'percentage')::numeric BETWEEN 0 AND 100
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
