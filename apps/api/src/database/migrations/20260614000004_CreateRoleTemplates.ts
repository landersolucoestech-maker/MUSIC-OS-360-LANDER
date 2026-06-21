import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * PASSO 2 / Migration 004 - global role template catalog.
 *
 * These tables are platform-owned catalogs: no tenant_id and no RLS.
 */
export class CreateRoleTemplates20260614000004 implements MigrationInterface {
  name = 'CreateRoleTemplates20260614000004';

  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE IF NOT EXISTS "role_templates" (
        "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "key"         VARCHAR(64)  NOT NULL,
        "name"        VARCHAR(160) NOT NULL,
        "description" TEXT,
        "version"     INTEGER      NOT NULL DEFAULT 1,
        "is_system"   BOOLEAN      NOT NULL DEFAULT true,
        "created_at"  TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "deleted_at"  TIMESTAMPTZ,
        CONSTRAINT "uq_role_templates_key" UNIQUE ("key"),
        CONSTRAINT "chk_role_templates_version" CHECK ("version" >= 1)
      )
    `);
    await qr.query(`
      CREATE INDEX IF NOT EXISTS "idx_role_templates_deleted_at"
        ON "role_templates" ("deleted_at")
    `);

    await qr.query(`
      CREATE TABLE IF NOT EXISTS "role_template_permissions" (
        "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "template_id"   UUID        NOT NULL,
        "permission_id" UUID        NOT NULL,
        "created_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "uq_role_template_permissions_template_permission"
          UNIQUE ("template_id", "permission_id"),
        CONSTRAINT "fk_role_template_permissions_template"
          FOREIGN KEY ("template_id") REFERENCES "role_templates" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_role_template_permissions_permission"
          FOREIGN KEY ("permission_id") REFERENCES "permissions" ("id") ON DELETE RESTRICT
      )
    `);
    await qr.query(`
      CREATE INDEX IF NOT EXISTS "idx_role_template_permissions_template_id"
        ON "role_template_permissions" ("template_id")
    `);
    await qr.query(`
      CREATE INDEX IF NOT EXISTS "idx_role_template_permissions_permission_id"
        ON "role_template_permissions" ("permission_id")
    `);
    await qr.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'musicos_app') THEN
          GRANT SELECT ON "role_templates", "role_template_permissions" TO "musicos_app";
        END IF;
      END $$;
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS "role_template_permissions"`);
    await qr.query(`DROP TABLE IF EXISTS "role_templates"`);
  }
}
