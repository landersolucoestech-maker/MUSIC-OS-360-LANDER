import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGenreToPhonograms20260605000001 implements MigrationInterface {
  name = 'AddGenreToPhonograms20260605000001';

  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE phonograms
        ADD COLUMN IF NOT EXISTS genero_musical VARCHAR(100);
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE phonograms
        DROP COLUMN IF EXISTS genero_musical;
    `);
  }
}
