import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTenantInvitations20260620000001
  implements MigrationInterface
{
  name = 'CreateTenantInvitations20260620000001';

  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE IF NOT EXISTS "tenant_invitations" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" UUID NOT NULL REFERENCES "tenants" ("id") ON DELETE CASCADE,
        "org_id" UUID NOT NULL REFERENCES "organizations" ("id") ON DELETE CASCADE,
        "email" VARCHAR(255) NOT NULL,
        "role_id" UUID NOT NULL REFERENCES "roles" ("id") ON DELETE RESTRICT,
        "auth_user_id" VARCHAR(255),
        "invited_by" VARCHAR(255) NOT NULL,
        "status" VARCHAR(20) NOT NULL DEFAULT 'pending'
          CHECK ("status" IN ('pending', 'accepted', 'cancelled', 'expired')),
        "expires_at" TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
        "accepted_at" TIMESTAMPTZ,
        "cancelled_at" TIMESTAMPTZ,
        "last_sent_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await qr.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_tenant_invitations_pending_email"
        ON "tenant_invitations" ("tenant_id", lower("email"))
        WHERE "status" = 'pending'
    `);
    await qr.query(`
      CREATE INDEX IF NOT EXISTS "idx_tenant_invitations_tenant_status"
        ON "tenant_invitations" ("tenant_id", "status", "created_at" DESC)
    `);
    await qr.query(`ALTER TABLE "tenant_invitations" ENABLE ROW LEVEL SECURITY`);
    await qr.query(`ALTER TABLE "tenant_invitations" FORCE ROW LEVEL SECURITY`);
    await qr.query(`
      DROP POLICY IF EXISTS "tenant_invitations_isolation" ON "tenant_invitations"
    `);
    await qr.query(`
      CREATE POLICY "tenant_invitations_isolation"
        ON "tenant_invitations"
        USING ("tenant_id" = private_get_tenant_id())
        WITH CHECK ("tenant_id" = private_get_tenant_id())
    `);
    await qr.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'musicos_app') THEN
          GRANT SELECT, INSERT, UPDATE, DELETE ON "tenant_invitations" TO "musicos_app";
        END IF;
      END $$;
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS "tenant_invitations"`);
  }
}
