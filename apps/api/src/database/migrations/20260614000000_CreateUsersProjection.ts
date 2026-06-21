import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * PASSO 12-C - local projection of Supabase Auth identities.
 *
 * This table does not authenticate users and does not generate identity IDs.
 * Rows will only be populated by a future, explicitly authorized sync step.
 */
export class CreateUsersProjection20260614000000 implements MigrationInterface {
  name = 'CreateUsersProjection20260614000000';

  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE IF NOT EXISTS public.users (
        id            UUID        PRIMARY KEY,
        auth_user_id  TEXT        NOT NULL,
        email         TEXT,
        display_name  TEXT,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT uq_users_auth_user_id UNIQUE (auth_user_id)
      )
    `);

    await qr.query(`REVOKE ALL PRIVILEGES ON TABLE public.users FROM PUBLIC`);
    await qr.query(`
      DO $$
      DECLARE
        role_name TEXT;
      BEGIN
        FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated', 'musicos_app']
        LOOP
          IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
            EXECUTE format(
              'REVOKE ALL PRIVILEGES ON TABLE public.users FROM %I',
              role_name
            );
          END IF;
        END LOOP;
      END $$;
    `);

    await qr.query(`ALTER TABLE public.users ENABLE ROW LEVEL SECURITY`);
    await qr.query(`ALTER TABLE public.users FORCE ROW LEVEL SECURITY`);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS public.users`);
  }
}
