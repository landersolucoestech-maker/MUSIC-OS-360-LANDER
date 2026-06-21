import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * PASSO 3 / Migration 006 - additive enterprise metadata for roles.
 *
 * is_system, created_by and updated_by already exist in the legacy roles
 * migration. They remain untouched and receive only the approved constraints,
 * foreign keys and indexes. This migration adds archived_at/current_version.
 */
export class ExtendRolesForEnterpriseRbac20260614000006 implements MigrationInterface {
  name = 'ExtendRolesForEnterpriseRbac20260614000006';

  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE "roles"
        ADD COLUMN IF NOT EXISTS "is_system"      BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "archived_at"    TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS "current_version" INTEGER NOT NULL DEFAULT 1,
        ADD COLUMN IF NOT EXISTS "created_by"     UUID,
        ADD COLUMN IF NOT EXISTS "updated_by"     UUID
    `);

    await qr.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'chk_roles_current_version'
            AND conrelid = 'public.roles'::regclass
        ) THEN
          ALTER TABLE "roles"
            ADD CONSTRAINT "chk_roles_current_version"
            CHECK ("current_version" >= 1);
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'chk_roles_system_global'
            AND conrelid = 'public.roles'::regclass
        ) THEN
          ALTER TABLE "roles"
            ADD CONSTRAINT "chk_roles_system_global"
            CHECK (NOT "is_system" OR "tenant_id" IS NULL);
        END IF;
      END $$;
    `);

    await qr.query(`
      DO $$
      DECLARE
        user_table REGCLASS;
      BEGIN
        user_table := COALESCE(
          to_regclass('public.users'),
          to_regclass('auth.users')
        );

        IF user_table IS NULL THEN
          RAISE EXCEPTION 'users table not found (expected public.users or auth.users)';
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_roles_created_by'
            AND conrelid = 'public.roles'::regclass
        ) THEN
          EXECUTE format(
            'ALTER TABLE public.roles ADD CONSTRAINT fk_roles_created_by
             FOREIGN KEY (created_by) REFERENCES %s (id) ON DELETE SET NULL',
            user_table
          );
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_roles_updated_by'
            AND conrelid = 'public.roles'::regclass
        ) THEN
          EXECUTE format(
            'ALTER TABLE public.roles ADD CONSTRAINT fk_roles_updated_by
             FOREIGN KEY (updated_by) REFERENCES %s (id) ON DELETE SET NULL',
            user_table
          );
        END IF;
      END $$;
    `);

    await qr.query(`CREATE INDEX IF NOT EXISTS "idx_roles_is_system" ON "roles" ("is_system")`);
    await qr.query(`CREATE INDEX IF NOT EXISTS "idx_roles_archived_at" ON "roles" ("archived_at")`);
    await qr.query(`CREATE INDEX IF NOT EXISTS "idx_roles_created_by" ON "roles" ("created_by")`);
    await qr.query(`CREATE INDEX IF NOT EXISTS "idx_roles_updated_by" ON "roles" ("updated_by")`);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP INDEX IF EXISTS "idx_roles_is_system"`);
    await qr.query(`DROP INDEX IF EXISTS "idx_roles_archived_at"`);
    await qr.query(`DROP INDEX IF EXISTS "idx_roles_created_by"`);
    await qr.query(`DROP INDEX IF EXISTS "idx_roles_updated_by"`);

    await qr.query(`ALTER TABLE "roles" DROP CONSTRAINT IF EXISTS "fk_roles_created_by"`);
    await qr.query(`ALTER TABLE "roles" DROP CONSTRAINT IF EXISTS "fk_roles_updated_by"`);
    await qr.query(`ALTER TABLE "roles" DROP CONSTRAINT IF EXISTS "chk_roles_current_version"`);
    await qr.query(`ALTER TABLE "roles" DROP CONSTRAINT IF EXISTS "chk_roles_system_global"`);

    await qr.query(`
      ALTER TABLE "roles"
        DROP COLUMN IF EXISTS "archived_at",
        DROP COLUMN IF EXISTS "current_version"
    `);
  }
}
