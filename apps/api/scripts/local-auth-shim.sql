-- Supabase compatibility shim for local development
CREATE SCHEMA IF NOT EXISTS auth;

-- Extensions the migration chain relies on (Supabase has these by default).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create roles that Supabase normally provides
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
  END IF;
  -- NOBYPASSRLS application role; the RLS-hardening migrations GRANT to it.
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'musicos_app') THEN
    CREATE ROLE musicos_app NOLOGIN NOINHERIT NOBYPASSRLS;
  END IF;
END $$;

GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role, musicos_app;
GRANT anon, authenticated, service_role, musicos_app TO musicos360;
-- App role inherits the `authenticated`-scoped RLS policies (Supabase convention).
GRANT authenticated TO musicos_app;

CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claims', true), '')::jsonb,
    '{}'::jsonb
  );
$$;

CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(auth.jwt()->>'sub', '')::uuid;
$$;

CREATE OR REPLACE FUNCTION auth.role() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(auth.jwt()->>'role', 'anon');
$$;

GRANT EXECUTE ON FUNCTION auth.jwt(), auth.uid(), auth.role() TO anon, authenticated, service_role;
