import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * PASSO 5 / Migration 007 - physical role inheritance graph.
 *
 * This migration creates only the persistence layer. Runtime permission
 * resolution and the legacy role hierarchy remain unchanged.
 */
export class CreateRoleInheritance20260614000007 implements MigrationInterface {
  name = 'CreateRoleInheritance20260614000007';

  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE IF NOT EXISTS "role_inheritance" (
        "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id"      UUID,
        "child_role_id"  UUID        NOT NULL,
        "parent_role_id" UUID        NOT NULL,
        "created_by"     UUID,
        "updated_by"     UUID,
        "created_at"     TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"     TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at"     TIMESTAMPTZ,
        CONSTRAINT "chk_role_inheritance_distinct_roles"
          CHECK ("child_role_id" <> "parent_role_id"),
        CONSTRAINT "fk_role_inheritance_tenant"
          FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_role_inheritance_child_role"
          FOREIGN KEY ("child_role_id") REFERENCES "roles" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_role_inheritance_parent_role"
          FOREIGN KEY ("parent_role_id") REFERENCES "roles" ("id") ON DELETE RESTRICT
      )
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
          WHERE conname = 'fk_role_inheritance_created_by'
            AND conrelid = 'public.role_inheritance'::regclass
        ) THEN
          EXECUTE format(
            'ALTER TABLE public.role_inheritance
             ADD CONSTRAINT fk_role_inheritance_created_by
             FOREIGN KEY (created_by) REFERENCES %s (id) ON DELETE SET NULL',
            user_table
          );
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_role_inheritance_updated_by'
            AND conrelid = 'public.role_inheritance'::regclass
        ) THEN
          EXECUTE format(
            'ALTER TABLE public.role_inheritance
             ADD CONSTRAINT fk_role_inheritance_updated_by
             FOREIGN KEY (updated_by) REFERENCES %s (id) ON DELETE SET NULL',
            user_table
          );
        END IF;
      END $$;
    `);

    await qr.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_role_inheritance_active_pair"
        ON "role_inheritance" ("child_role_id", "parent_role_id")
        WHERE "deleted_at" IS NULL
    `);
    await qr.query(`
      CREATE INDEX IF NOT EXISTS "idx_role_inheritance_tenant_id"
        ON "role_inheritance" ("tenant_id")
    `);
    await qr.query(`
      CREATE INDEX IF NOT EXISTS "idx_role_inheritance_child_role_id"
        ON "role_inheritance" ("child_role_id")
    `);
    await qr.query(`
      CREATE INDEX IF NOT EXISTS "idx_role_inheritance_parent_role_id"
        ON "role_inheritance" ("parent_role_id")
    `);
    await qr.query(`
      CREATE INDEX IF NOT EXISTS "idx_role_inheritance_active_tenant_child"
        ON "role_inheritance" ("tenant_id", "child_role_id")
        WHERE "deleted_at" IS NULL
    `);
    await qr.query(`
      CREATE INDEX IF NOT EXISTS "idx_role_inheritance_active_tenant_parent"
        ON "role_inheritance" ("tenant_id", "parent_role_id")
        WHERE "deleted_at" IS NULL
    `);

    await qr.query(`
      CREATE OR REPLACE FUNCTION public.validate_role_inheritance()
      RETURNS trigger
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public, pg_catalog
      AS $$
      DECLARE
        child_tenant_id  UUID;
        parent_tenant_id UUID;
        child_canonical  UUID;
        parent_canonical UUID;
        child_archived   TIMESTAMPTZ;
        parent_archived  TIMESTAMPTZ;
        child_deleted    TIMESTAMPTZ;
        parent_deleted   TIMESTAMPTZ;
        creates_cycle    BOOLEAN;
        can_write_global BOOLEAN := false;
      BEGIN
        IF NEW.child_role_id = NEW.parent_role_id THEN
          RAISE EXCEPTION USING
            ERRCODE = '23514',
            MESSAGE = 'role inheritance cannot reference the same role';
        END IF;

        -- Serialize mutations touching the same roles before checking the graph.
        PERFORM 1
          FROM public.roles
         WHERE id IN (NEW.child_role_id, NEW.parent_role_id)
         ORDER BY id
         FOR UPDATE;

        SELECT tenant_id, canonical_role_id, archived_at, deleted_at
          INTO child_tenant_id, child_canonical, child_archived, child_deleted
          FROM public.roles
         WHERE id = NEW.child_role_id;

        IF NOT FOUND THEN
          RAISE EXCEPTION USING
            ERRCODE = '23503',
            MESSAGE = 'child role does not exist';
        END IF;

        SELECT tenant_id, canonical_role_id, archived_at, deleted_at
          INTO parent_tenant_id, parent_canonical, parent_archived, parent_deleted
          FROM public.roles
         WHERE id = NEW.parent_role_id;

        IF NOT FOUND THEN
          RAISE EXCEPTION USING
            ERRCODE = '23503',
            MESSAGE = 'parent role does not exist';
        END IF;

        IF child_deleted IS NOT NULL OR parent_deleted IS NOT NULL THEN
          RAISE EXCEPTION USING
            ERRCODE = '23514',
            MESSAGE = 'soft-deleted roles cannot participate in inheritance';
        END IF;

        IF child_archived IS NOT NULL OR parent_archived IS NOT NULL THEN
          RAISE EXCEPTION USING
            ERRCODE = '23514',
            MESSAGE = 'archived roles cannot participate in inheritance';
        END IF;

        IF child_canonical IS NOT NULL OR parent_canonical IS NOT NULL THEN
          RAISE EXCEPTION USING
            ERRCODE = '23514',
            MESSAGE = 'role aliases cannot participate in inheritance';
        END IF;

        IF child_tenant_id IS NULL THEN
          SELECT COALESCE(
                   role_row.rolsuper
                   OR role_row.rolbypassrls
                   OR session_user = pg_get_userbyid(table_row.relowner),
                   false
                 )
            INTO can_write_global
            FROM pg_catalog.pg_roles role_row
            CROSS JOIN pg_catalog.pg_class table_row
           WHERE role_row.rolname = session_user
             AND table_row.oid = 'public.role_inheritance'::regclass;

          IF NOT can_write_global THEN
            RAISE EXCEPTION USING
              ERRCODE = '42501',
              MESSAGE = 'global role inheritance is writable only by the platform owner';
          END IF;

          IF parent_tenant_id IS NOT NULL OR NEW.tenant_id IS NOT NULL THEN
            RAISE EXCEPTION USING
              ERRCODE = '23514',
              MESSAGE = 'global role inheritance must connect global roles and have null tenant_id';
          END IF;
        ELSE
          IF NEW.tenant_id IS DISTINCT FROM child_tenant_id THEN
            RAISE EXCEPTION USING
              ERRCODE = '23514',
              MESSAGE = 'role inheritance tenant_id must match the child role tenant';
          END IF;

          IF parent_tenant_id IS NOT NULL
             AND parent_tenant_id IS DISTINCT FROM child_tenant_id THEN
            RAISE EXCEPTION USING
              ERRCODE = '23514',
              MESSAGE = 'tenant role can inherit only from a global role or a role in the same tenant';
          END IF;
        END IF;

        IF NEW.deleted_at IS NULL THEN
          WITH RECURSIVE ancestors(role_id, path) AS (
            SELECT NEW.parent_role_id, ARRAY[NEW.parent_role_id]::UUID[]
            UNION ALL
            SELECT ri.parent_role_id, ancestors.path || ri.parent_role_id
              FROM public.role_inheritance ri
              JOIN ancestors ON ri.child_role_id = ancestors.role_id
             WHERE ri.deleted_at IS NULL
               AND ri.id IS DISTINCT FROM NEW.id
               AND NOT ri.parent_role_id = ANY(ancestors.path)
          )
          SELECT EXISTS (
            SELECT 1 FROM ancestors WHERE role_id = NEW.child_role_id
          )
          INTO creates_cycle;

          IF creates_cycle THEN
            RAISE EXCEPTION USING
              ERRCODE = '23514',
              MESSAGE = 'role inheritance cycle detected';
          END IF;
        END IF;

        NEW.updated_at := now();
        RETURN NEW;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE;
      END;
      $$;
    `);

    await qr.query(`
      CREATE OR REPLACE FUNCTION public.guard_role_inheritance_global_delete()
      RETURNS trigger
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public, pg_catalog
      AS $$
      DECLARE
        can_write_global BOOLEAN := false;
      BEGIN
        IF OLD.tenant_id IS NULL THEN
          SELECT COALESCE(
                   role_row.rolsuper
                   OR role_row.rolbypassrls
                   OR session_user = pg_get_userbyid(table_row.relowner),
                   false
                 )
            INTO can_write_global
            FROM pg_catalog.pg_roles role_row
            CROSS JOIN pg_catalog.pg_class table_row
           WHERE role_row.rolname = session_user
             AND table_row.oid = 'public.role_inheritance'::regclass;

          IF NOT can_write_global THEN
            RAISE EXCEPTION USING
              ERRCODE = '42501',
              MESSAGE = 'global role inheritance is writable only by the platform owner';
          END IF;
        END IF;

        RETURN OLD;
      END;
      $$;
    `);

    await qr.query(`
      CREATE OR REPLACE FUNCTION public.bump_role_inheritance_version()
      RETURNS trigger
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public, pg_catalog
      AS $$
      BEGIN
        IF TG_OP = 'INSERT' THEN
          IF NEW.deleted_at IS NULL THEN
            UPDATE public.roles
               SET current_version = current_version + 1,
                   updated_at = now()
             WHERE id = NEW.child_role_id;
          END IF;
          RETURN NEW;
        END IF;

        IF OLD.child_role_id IS DISTINCT FROM NEW.child_role_id THEN
          UPDATE public.roles
             SET current_version = current_version + 1,
                 updated_at = now()
           WHERE id = OLD.child_role_id;
        END IF;

        IF OLD.child_role_id IS DISTINCT FROM NEW.child_role_id
           OR OLD.parent_role_id IS DISTINCT FROM NEW.parent_role_id
           OR OLD.deleted_at IS DISTINCT FROM NEW.deleted_at THEN
          UPDATE public.roles
             SET current_version = current_version + 1,
                 updated_at = now()
           WHERE id = NEW.child_role_id;
        END IF;

        RETURN NEW;
      END;
      $$;
    `);

    await qr.query(`
      DROP TRIGGER IF EXISTS "trg_validate_role_inheritance" ON "role_inheritance"
    `);
    await qr.query(`
      CREATE TRIGGER "trg_validate_role_inheritance"
      BEFORE INSERT OR UPDATE ON "role_inheritance"
      FOR EACH ROW EXECUTE FUNCTION public.validate_role_inheritance()
    `);
    await qr.query(`
      DROP TRIGGER IF EXISTS "trg_guard_role_inheritance_global_delete" ON "role_inheritance"
    `);
    await qr.query(`
      CREATE TRIGGER "trg_guard_role_inheritance_global_delete"
      BEFORE DELETE ON "role_inheritance"
      FOR EACH ROW EXECUTE FUNCTION public.guard_role_inheritance_global_delete()
    `);
    await qr.query(`
      DROP TRIGGER IF EXISTS "trg_bump_role_inheritance_version" ON "role_inheritance"
    `);
    await qr.query(`
      CREATE TRIGGER "trg_bump_role_inheritance_version"
      AFTER INSERT OR UPDATE OF "child_role_id", "parent_role_id", "deleted_at"
      ON "role_inheritance"
      FOR EACH ROW EXECUTE FUNCTION public.bump_role_inheritance_version()
    `);

    await qr.query(`ALTER TABLE "role_inheritance" ENABLE ROW LEVEL SECURITY`);
    await qr.query(`ALTER TABLE "role_inheritance" FORCE ROW LEVEL SECURITY`);
    await qr.query(`
      DROP POLICY IF EXISTS "role_inheritance_read" ON "role_inheritance"
    `);
    await qr.query(`
      CREATE POLICY "role_inheritance_read" ON "role_inheritance"
        FOR SELECT TO PUBLIC
        USING (
          "tenant_id" IS NULL
          OR "tenant_id" = private_get_tenant_id()
        )
    `);
    await qr.query(`
      DROP POLICY IF EXISTS "role_inheritance_tenant_insert" ON "role_inheritance"
    `);
    await qr.query(`
      CREATE POLICY "role_inheritance_tenant_insert" ON "role_inheritance"
        FOR INSERT TO PUBLIC
        WITH CHECK (
          "tenant_id" IS NOT NULL
          AND "tenant_id" = private_get_tenant_id()
        )
    `);
    await qr.query(`
      DROP POLICY IF EXISTS "role_inheritance_tenant_update" ON "role_inheritance"
    `);
    await qr.query(`
      CREATE POLICY "role_inheritance_tenant_update" ON "role_inheritance"
        FOR UPDATE TO PUBLIC
        USING (
          "tenant_id" IS NOT NULL
          AND "tenant_id" = private_get_tenant_id()
        )
        WITH CHECK (
          "tenant_id" IS NOT NULL
          AND "tenant_id" = private_get_tenant_id()
        )
    `);
    await qr.query(`
      DROP POLICY IF EXISTS "role_inheritance_tenant_update_scope" ON "role_inheritance"
    `);
    await qr.query(`
      CREATE POLICY "role_inheritance_tenant_update_scope" ON "role_inheritance"
        AS RESTRICTIVE FOR UPDATE TO PUBLIC
        USING (
          "tenant_id" IS NOT NULL
          AND "tenant_id" = private_get_tenant_id()
        )
        WITH CHECK (
          "tenant_id" IS NOT NULL
          AND "tenant_id" = private_get_tenant_id()
        )
    `);
    await qr.query(`
      DROP POLICY IF EXISTS "role_inheritance_tenant_delete" ON "role_inheritance"
    `);
    await qr.query(`
      CREATE POLICY "role_inheritance_tenant_delete" ON "role_inheritance"
        FOR DELETE TO PUBLIC
        USING (
          "tenant_id" IS NOT NULL
          AND "tenant_id" = private_get_tenant_id()
        )
    `);
    await qr.query(`
      DROP POLICY IF EXISTS "role_inheritance_tenant_delete_scope" ON "role_inheritance"
    `);
    await qr.query(`
      CREATE POLICY "role_inheritance_tenant_delete_scope" ON "role_inheritance"
        AS RESTRICTIVE FOR DELETE TO PUBLIC
        USING (
          "tenant_id" IS NOT NULL
          AND "tenant_id" = private_get_tenant_id()
        )
    `);

    await qr.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'musicos_app') THEN
          GRANT SELECT, INSERT, UPDATE, DELETE ON "role_inheritance" TO "musicos_app";
        END IF;
      END $$;
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP POLICY IF EXISTS "role_inheritance_tenant_delete_scope" ON "role_inheritance"`);
    await qr.query(`DROP POLICY IF EXISTS "role_inheritance_tenant_delete" ON "role_inheritance"`);
    await qr.query(`DROP POLICY IF EXISTS "role_inheritance_tenant_update_scope" ON "role_inheritance"`);
    await qr.query(`DROP POLICY IF EXISTS "role_inheritance_tenant_update" ON "role_inheritance"`);
    await qr.query(`DROP POLICY IF EXISTS "role_inheritance_tenant_insert" ON "role_inheritance"`);
    await qr.query(`DROP POLICY IF EXISTS "role_inheritance_read" ON "role_inheritance"`);

    await qr.query(`DROP TRIGGER IF EXISTS "trg_bump_role_inheritance_version" ON "role_inheritance"`);
    await qr.query(`DROP TRIGGER IF EXISTS "trg_guard_role_inheritance_global_delete" ON "role_inheritance"`);
    await qr.query(`DROP TRIGGER IF EXISTS "trg_validate_role_inheritance" ON "role_inheritance"`);
    await qr.query(`DROP FUNCTION IF EXISTS public.bump_role_inheritance_version()`);
    await qr.query(`DROP FUNCTION IF EXISTS public.guard_role_inheritance_global_delete()`);
    await qr.query(`DROP FUNCTION IF EXISTS public.validate_role_inheritance()`);

    await qr.query(`DROP INDEX IF EXISTS "idx_role_inheritance_active_tenant_parent"`);
    await qr.query(`DROP INDEX IF EXISTS "idx_role_inheritance_active_tenant_child"`);
    await qr.query(`DROP INDEX IF EXISTS "idx_role_inheritance_parent_role_id"`);
    await qr.query(`DROP INDEX IF EXISTS "idx_role_inheritance_child_role_id"`);
    await qr.query(`DROP INDEX IF EXISTS "idx_role_inheritance_tenant_id"`);
    await qr.query(`DROP INDEX IF EXISTS "uq_role_inheritance_active_pair"`);
    await qr.query(`DROP TABLE IF EXISTS "role_inheritance"`);
  }
}
