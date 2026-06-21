import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * PASSO 12-D - least-privilege ACLs before the Enterprise RBAC migrations.
 *
 * The application role keeps only the privileges exercised by the current
 * resolver/mutation services. Supabase Data API roles do not access RBAC
 * catalogs directly. Default privileges stop granting CRUD to future tables.
 */
export class HardenRbacAclDefaults20260613000017 implements MigrationInterface {
  name = 'HardenRbacAclDefaults20260613000017';

  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      DO $$
      DECLARE
        table_name TEXT;
        role_name  TEXT;
      BEGIN
        FOREACH table_name IN ARRAY ARRAY[
          'roles',
          'permissions',
          'role_permissions'
        ]
        LOOP
          IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
            EXECUTE format(
              'REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC',
              table_name
            );

            FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated']
            LOOP
              IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
                EXECUTE format(
                  'REVOKE ALL PRIVILEGES ON TABLE public.%I FROM %I',
                  table_name,
                  role_name
                );
              END IF;
            END LOOP;
          END IF;
        END LOOP;

        -- Tenant memberships remain available through their existing RLS
        -- policies. Only anonymous/public access is removed here.
        IF to_regclass('public.org_members') IS NOT NULL THEN
          REVOKE ALL PRIVILEGES ON TABLE public.org_members FROM PUBLIC;
          IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
            REVOKE ALL PRIVILEGES ON TABLE public.org_members FROM anon;
          END IF;
        END IF;

        -- The local identity projection stays owner-only.
        IF to_regclass('public.users') IS NOT NULL THEN
          REVOKE ALL PRIVILEGES ON TABLE public.users FROM PUBLIC;
          FOREACH role_name IN ARRAY ARRAY[
            'anon',
            'authenticated',
            'musicos_app'
          ]
          LOOP
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
              EXECUTE format(
                'REVOKE ALL PRIVILEGES ON TABLE public.users FROM %I',
                role_name
              );
            END IF;
          END LOOP;
        END IF;

        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'musicos_app') THEN
          IF to_regclass('public.permissions') IS NOT NULL THEN
            REVOKE ALL PRIVILEGES ON TABLE public.permissions FROM musicos_app;
            GRANT SELECT ON TABLE public.permissions TO musicos_app;
          END IF;

          IF to_regclass('public.roles') IS NOT NULL THEN
            REVOKE ALL PRIVILEGES ON TABLE public.roles FROM musicos_app;
            GRANT SELECT, INSERT, UPDATE, DELETE
              ON TABLE public.roles TO musicos_app;
          END IF;

          IF to_regclass('public.role_permissions') IS NOT NULL THEN
            REVOKE ALL PRIVILEGES
              ON TABLE public.role_permissions FROM musicos_app;
            GRANT SELECT, INSERT, DELETE
              ON TABLE public.role_permissions TO musicos_app;
          END IF;
        END IF;
      END $$;
    `);

    await qr.query(`
      DO $$
      DECLARE
        owner_name TEXT;
        role_name  TEXT;
      BEGIN
        FOR owner_name IN
          SELECT DISTINCT candidate.owner_name
          FROM (
            SELECT current_user::TEXT AS owner_name
            UNION ALL
            SELECT pg_get_userbyid(c.relowner)
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public'
              AND c.relname IN (
                'roles',
                'permissions',
                'role_permissions',
                'org_members',
                'users'
              )
          ) candidate
        LOOP
          EXECUTE format(
            'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public
             REVOKE ALL PRIVILEGES ON TABLES FROM PUBLIC',
            owner_name
          );
          EXECUTE format(
            'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public
             REVOKE ALL PRIVILEGES ON SEQUENCES FROM PUBLIC',
            owner_name
          );

          FOREACH role_name IN ARRAY ARRAY[
            'anon',
            'authenticated',
            'musicos_app'
          ]
          LOOP
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
              EXECUTE format(
                'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public
                 REVOKE ALL PRIVILEGES ON TABLES FROM %I',
                owner_name,
                role_name
              );
              EXECUTE format(
                'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public
                 REVOKE ALL PRIVILEGES ON SEQUENCES FROM %I',
                owner_name,
                role_name
              );
            END IF;
          END LOOP;
        END LOOP;
      END $$;
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      DO $$
      DECLARE
        role_name TEXT;
      BEGIN
        FOREACH role_name IN ARRAY ARRAY['authenticated', 'musicos_app']
        LOOP
          IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
            IF to_regclass('public.roles') IS NOT NULL THEN
              EXECUTE format(
                'GRANT SELECT, INSERT, UPDATE, DELETE
                 ON TABLE public.roles TO %I',
                role_name
              );
            END IF;
            IF to_regclass('public.permissions') IS NOT NULL THEN
              EXECUTE format(
                'GRANT SELECT, INSERT, UPDATE, DELETE
                 ON TABLE public.permissions TO %I',
                role_name
              );
            END IF;
            IF to_regclass('public.role_permissions') IS NOT NULL THEN
              EXECUTE format(
                'GRANT SELECT, INSERT, UPDATE, DELETE
                 ON TABLE public.role_permissions TO %I',
                role_name
              );
            END IF;
          END IF;
        END LOOP;
      END $$;
    `);

    await qr.query(`
      DO $$
      DECLARE
        owner_name TEXT;
        role_name  TEXT;
      BEGIN
        FOR owner_name IN
          SELECT DISTINCT candidate.owner_name
          FROM (
            SELECT current_user::TEXT AS owner_name
            UNION ALL
            SELECT pg_get_userbyid(c.relowner)
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public'
              AND c.relname IN (
                'roles',
                'permissions',
                'role_permissions',
                'org_members',
                'users'
              )
          ) candidate
        LOOP
          FOREACH role_name IN ARRAY ARRAY['authenticated', 'musicos_app']
          LOOP
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
              EXECUTE format(
                'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public
                 GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO %I',
                owner_name,
                role_name
              );
              EXECUTE format(
                'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public
                 GRANT SELECT, USAGE ON SEQUENCES TO %I',
                owner_name,
                role_name
              );
            END IF;
          END LOOP;
        END LOOP;
      END $$;
    `);
  }
}
