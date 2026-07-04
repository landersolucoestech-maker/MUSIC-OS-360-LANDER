import { MigrationInterface, QueryRunner } from 'typeorm';

export class PublicArtistRegistration20260630000001 implements MigrationInterface {
  name = 'PublicArtistRegistration20260630000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tenants"
        ADD COLUMN IF NOT EXISTS "allow_public_registration" boolean NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS "public_registration_blocked" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "public_registration_revoked_at" timestamptz,
        ADD COLUMN IF NOT EXISTS "public_registration_access_count" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "public_registration_conversion_count" integer NOT NULL DEFAULT 0
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tenants"
        DROP COLUMN IF EXISTS "public_registration_conversion_count",
        DROP COLUMN IF EXISTS "public_registration_access_count",
        DROP COLUMN IF EXISTS "public_registration_revoked_at",
        DROP COLUMN IF EXISTS "public_registration_blocked",
        DROP COLUMN IF EXISTS "allow_public_registration"
    `);
  }
}
