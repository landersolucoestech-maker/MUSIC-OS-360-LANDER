import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * PASSO 2 / Migration 005 - global permission dependency and SoD catalogs.
 *
 * Conflict pairs are stored in canonical UUID order so (A,B) and (B,A) cannot
 * coexist. These tables have no tenant_id and no RLS.
 */
export class CreatePermissionDependenciesAndConflicts20260614000005
implements MigrationInterface {
  name = 'CreatePermissionDependenciesAndConflicts20260614000005';

  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE IF NOT EXISTS "permission_dependencies" (
        "id"                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "permission_id"            UUID        NOT NULL,
        "depends_on_permission_id" UUID        NOT NULL,
        "created_at"               TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "uq_permission_dependencies_pair"
          UNIQUE ("permission_id", "depends_on_permission_id"),
        CONSTRAINT "chk_permission_dependencies_distinct"
          CHECK ("permission_id" <> "depends_on_permission_id"),
        CONSTRAINT "fk_permission_dependencies_permission"
          FOREIGN KEY ("permission_id") REFERENCES "permissions" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_permission_dependencies_depends_on"
          FOREIGN KEY ("depends_on_permission_id") REFERENCES "permissions" ("id") ON DELETE CASCADE
      )
    `);
    await qr.query(`
      CREATE INDEX IF NOT EXISTS "idx_permission_dependencies_permission_id"
        ON "permission_dependencies" ("permission_id")
    `);
    await qr.query(`
      CREATE INDEX IF NOT EXISTS "idx_permission_dependencies_depends_on_permission_id"
        ON "permission_dependencies" ("depends_on_permission_id")
    `);

    await qr.query(`
      CREATE TABLE IF NOT EXISTS "permission_conflicts" (
        "id"                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "permission_id"                UUID        NOT NULL,
        "conflicts_with_permission_id" UUID        NOT NULL,
        "created_at"                   TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "uq_permission_conflicts_normalized_pair"
          UNIQUE ("permission_id", "conflicts_with_permission_id"),
        CONSTRAINT "chk_permission_conflicts_normalized"
          CHECK ("permission_id" < "conflicts_with_permission_id"),
        CONSTRAINT "fk_permission_conflicts_permission"
          FOREIGN KEY ("permission_id") REFERENCES "permissions" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_permission_conflicts_conflicts_with"
          FOREIGN KEY ("conflicts_with_permission_id") REFERENCES "permissions" ("id") ON DELETE CASCADE
      )
    `);
    await qr.query(`
      CREATE INDEX IF NOT EXISTS "idx_permission_conflicts_permission_id"
        ON "permission_conflicts" ("permission_id")
    `);
    await qr.query(`
      CREATE INDEX IF NOT EXISTS "idx_permission_conflicts_conflicts_with_permission_id"
        ON "permission_conflicts" ("conflicts_with_permission_id")
    `);
    await qr.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'musicos_app') THEN
          GRANT SELECT ON "permission_dependencies", "permission_conflicts" TO "musicos_app";
        END IF;
      END $$;
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS "permission_conflicts"`);
    await qr.query(`DROP TABLE IF EXISTS "permission_dependencies"`);
  }
}
