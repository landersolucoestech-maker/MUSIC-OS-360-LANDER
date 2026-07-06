import type { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveArtistBannerVideoFields20260705000002
  implements MigrationInterface
{
  name = 'RemoveArtistBannerVideoFields20260705000002';

  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE public."artists"
        DROP COLUMN IF EXISTS "banner_url",
        DROP COLUMN IF EXISTS "video_apresentacao_url"
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE public."artists"
        ADD COLUMN IF NOT EXISTS "banner_url" TEXT,
        ADD COLUMN IF NOT EXISTS "video_apresentacao_url" TEXT
    `);
  }
}
