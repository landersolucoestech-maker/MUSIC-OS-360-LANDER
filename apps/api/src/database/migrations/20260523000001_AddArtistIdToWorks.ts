import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddArtistIdToWorks20260523000001 implements MigrationInterface {
  name = 'AddArtistIdToWorks20260523000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "works"
      ADD COLUMN IF NOT EXISTS "artista_id" UUID
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_works_artista_id"
      ON "works" ("artista_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_works_artista_id"`);
    await queryRunner.query(`ALTER TABLE "works" DROP COLUMN IF EXISTS "artista_id"`);
  }
}
