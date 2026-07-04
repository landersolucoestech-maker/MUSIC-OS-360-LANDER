-- ============================================================================
-- create-app-db-user.sql  ·  P2-2
--
-- Provisions an APPLICATION database role WITHOUT BYPASSRLS so that Row-Level
-- Security (migration 20260612000001_PortableRlsTenantContext) actually applies
-- to the API's own traffic — turning RLS into effective defense-in-depth.
--
-- This script is NON-DESTRUCTIVE and IDEMPOTENT. It does NOT touch the existing
-- owner/superuser role and does NOT hard-code any password.
--
-- USAGE (password supplied at call time, never committed):
--   psql "$DATABASE_URL" \
--     -v app_user=musicos_app \
--     -v app_password="$(openssl rand -base64 24)" \
--     -v db_name=musicos360 \
--     -f scripts/create-app-db-user.sql
--
-- Then point APP_DATABASE_URL at this role and set
-- DATABASE_SESSION_CONTEXT_ENABLED=true to enable enforcement (see rollout plan).
--
-- Managed-Postgres note: on Supabase/RDS/Cloud SQL you may not have CREATE ROLE
-- as superuser; run this as the project owner or adapt GRANTs to your provider.
-- ============================================================================

\set ON_ERROR_STOP on

-- 1. Create the role only if absent (password passed via -v app_password).
--    NOTE: psql variables are NOT interpolated inside dollar-quoted DO blocks,
--    so we build the statement with format() in a plain SELECT and run it via
--    \gexec (the idiomatic, portable way to use psql vars in dynamic DDL).
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'app_user', :'app_password')
 WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'app_user')
\gexec
-- Rotate/ensure the password without leaking it into the repo (idempotent).
SELECT format('ALTER ROLE %I LOGIN PASSWORD %L', :'app_user', :'app_password')
\gexec

-- 2. Hardening: the application role must NEVER bypass RLS and must NOT be
--    superuser / createrole / createdb.
ALTER ROLE :"app_user" NOBYPASSRLS NOSUPERUSER NOCREATEROLE NOCREATEDB;

-- 3. Connection + schema usage.
GRANT CONNECT ON DATABASE :"db_name" TO :"app_user";
GRANT USAGE ON SCHEMA public TO :"app_user";

-- 3b. The RLS policies created by the migrations target the `authenticated` role
--     (Supabase convention). The application role must be a MEMBER of it so the
--     tenant_isolation / super_admin policies actually apply (otherwise FORCE RLS
--     with no applicable policy = deny-all). Skipped if the role is absent.
SELECT format('GRANT authenticated TO %I', :'app_user')
 WHERE EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated')
\gexec

-- 4. CRUD on existing tables + sequence access (no DDL, no TRUNCATE).
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO :"app_user";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO :"app_user";

-- 5. Same privileges for tables/sequences created by future migrations.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO :"app_user";
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO :"app_user";

-- 6. Allow executing the portable RLS helper functions used inside policies
--    (only those that exist — built with format()+\gexec for psql-var support).
SELECT format('GRANT EXECUTE ON FUNCTION %s TO %I', p.fn, :'app_user')
  FROM (VALUES
    ('public.app_current_tenant_id()'),
    ('public.app_current_org_id()'),
    ('public.app_is_super_admin()'),
    ('public.app_jwt()'),
    ('public.private_get_tenant_id()')
  ) AS p(fn)
 WHERE to_regprocedure(p.fn) IS NOT NULL
\gexec

-- 6b. Supabase-only: if the `auth` schema exists, the app role needs USAGE +
--     EXECUTE on auth.jwt() so the portable helpers (app_jwt → auth.jwt) do not
--     hit "permission denied for schema auth" during RLS policy evaluation.
--     On vanilla PostgreSQL there is no `auth` schema → this is skipped.
SELECT format('GRANT USAGE ON SCHEMA auth TO %I', :'app_user')
 WHERE EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth')
\gexec
SELECT format('GRANT EXECUTE ON FUNCTION auth.jwt() TO %I', :'app_user')
 WHERE to_regprocedure('auth.jwt()') IS NOT NULL
\gexec

-- 7. Verification (should print rolbypassrls = f, rolsuper = f).
SELECT rolname, rolsuper, rolbypassrls, rolcanlogin
  FROM pg_roles
 WHERE rolname = :'app_user';
