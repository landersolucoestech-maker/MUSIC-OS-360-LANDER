import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateArtistPlatformProfiles20260612000003 implements MigrationInterface {
  name = 'CreateArtistPlatformProfiles20260612000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "artist_platform_profiles" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "artist_id" uuid NOT NULL,
        "platform" varchar NOT NULL,
        "external_id" text NULL,
        "external_url" text NULL,
        "display_name" text NULL,
        "username" text NULL,
        "profile_url" text NULL,
        "image_url" text NULL,
        "followers" integer NULL,
        "subscribers" integer NULL,
        "monthly_listeners" integer NULL,
        "popularity" integer NULL,
        "total_views" bigint NULL,
        "total_videos" integer NULL,
        "total_tracks" integer NULL,
        "total_albums" integer NULL,
        "raw_payload" jsonb NOT NULL DEFAULT '{}',
        "sync_status" varchar NOT NULL DEFAULT 'pending',
        "last_synced_at" timestamptz NULL,
        "last_error" text NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_artist_platform_profiles_tenant_artist_platform"
          UNIQUE ("tenant_id", "artist_id", "platform"),
        CONSTRAINT "FK_artist_platform_profiles_artist"
          FOREIGN KEY ("artist_id") REFERENCES "artists"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_artist_platform_profiles_tenant_artist"
      ON "artist_platform_profiles" ("tenant_id", "artist_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_artist_platform_profiles_tenant_platform"
      ON "artist_platform_profiles" ("tenant_id", "platform")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_artist_platform_profiles_tenant_status"
      ON "artist_platform_profiles" ("tenant_id", "sync_status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_artist_platform_profiles_tenant_status"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_artist_platform_profiles_tenant_platform"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_artist_platform_profiles_tenant_artist"');
    await queryRunner.query('DROP TABLE IF EXISTS "artist_platform_profiles"');
  }
}
