import { MigrationInterface, QueryRunner } from 'typeorm';

export class BillingEnforcement20260701000001 implements MigrationInterface {
  name = 'BillingEnforcement20260701000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "billing_subscriptions" ADD COLUMN IF NOT EXISTS "tenant_id" uuid`);
    await queryRunner.query(`ALTER TABLE "billing_subscriptions" ADD COLUMN IF NOT EXISTS "stripe_subscription_id" varchar(255)`);
    await queryRunner.query(`ALTER TABLE "billing_subscriptions" ADD COLUMN IF NOT EXISTS "stripe_price_id" varchar(255)`);
    await queryRunner.query(`ALTER TABLE "billing_subscriptions" ADD COLUMN IF NOT EXISTS "current_period_start" timestamptz`);
    await queryRunner.query(`ALTER TABLE "billing_subscriptions" ADD COLUMN IF NOT EXISTS "cancel_at_period_end" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "billing_subscriptions" ADD COLUMN IF NOT EXISTS "grace_until" timestamptz`);
    await queryRunner.query(`ALTER TABLE "billing_subscriptions" ADD COLUMN IF NOT EXISTS "suspended_at" timestamptz`);
    await queryRunner.query(`ALTER TABLE "billing_subscriptions" ADD COLUMN IF NOT EXISTS "resumed_at" timestamptz`);
    await queryRunner.query(`
      UPDATE "billing_subscriptions" s
      SET tenant_id = t.id,
          stripe_subscription_id = COALESCE(s.stripe_subscription_id, s.stripe_sub_id)
      FROM "tenants" t
      WHERE s.org_id = t.org_id
        AND (s.tenant_id IS NULL OR s.stripe_subscription_id IS NULL)
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "uq_billing_subscriptions_tenant" ON "billing_subscriptions" ("tenant_id") WHERE "tenant_id" IS NOT NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "uq_billing_subscriptions_stripe_subscription" ON "billing_subscriptions" ("stripe_subscription_id") WHERE "stripe_subscription_id" IS NOT NULL`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_billing_subscriptions_status" ON "billing_subscriptions" ("status")`);
    await queryRunner.query(`
      ALTER TABLE "billing_subscriptions"
      DROP CONSTRAINT IF EXISTS "chk_billing_subscriptions_status"
    `);
    await queryRunner.query(`
      ALTER TABLE "billing_subscriptions"
      ADD CONSTRAINT "chk_billing_subscriptions_status"
      CHECK ("status" IN ('trialing','trial','active','past_due','unpaid','cancelled','canceled','incomplete','incomplete_expired'))
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tenant_billing_state" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL UNIQUE REFERENCES "tenants"("id") ON DELETE CASCADE,
        "status" varchar(50) NOT NULL DEFAULT 'trial',
        "last_payment_at" timestamptz,
        "next_payment_at" timestamptz,
        "grace_until" timestamptz,
        "suspended_at" timestamptz,
        "manual_override" boolean NOT NULL DEFAULT false,
        "manual_override_reason" text,
        "manual_override_until" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "chk_tenant_billing_state_status"
          CHECK ("status" IN ('active','trial','payment_grace','read_only','suspended','cancelled'))
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_tenant_billing_state_status" ON "tenant_billing_state" ("status")`);

    await queryRunner.query(`
      INSERT INTO "tenant_billing_state" ("tenant_id", "status", "next_payment_at")
      SELECT
        t.id,
        CASE
          WHEN COALESCE(o.billing_status, 'trial') IN ('active') THEN 'active'
          WHEN COALESCE(o.billing_status, 'trial') IN ('cancelled','canceled') THEN 'cancelled'
          WHEN COALESCE(o.billing_status, 'trial') IN ('suspended') THEN 'suspended'
          ELSE 'trial'
        END,
        s.current_period_end
      FROM "tenants" t
      LEFT JOIN "organizations" o ON o.id = t.org_id
      LEFT JOIN "billing_subscriptions" s ON s.tenant_id = t.id OR s.org_id = t.org_id
      ON CONFLICT ("tenant_id") DO NOTHING
    `);

    await queryRunner.query(`ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "stripe_invoice_id" varchar(255)`);
    await queryRunner.query(`ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "amount_due" integer`);
    await queryRunner.query(`ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "amount_paid" integer`);
    await queryRunner.query(`ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "currency" varchar(10)`);
    await queryRunner.query(`ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "due_date" timestamptz`);
    await queryRunner.query(`ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "hosted_invoice_url" text`);
    await queryRunner.query(`ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "invoice_pdf" text`);
    await queryRunner.query(`ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "attempt_count" integer NOT NULL DEFAULT 0`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "uq_invoices_stripe_invoice" ON "invoices" ("stripe_invoice_id") WHERE "stripe_invoice_id" IS NOT NULL`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payment_events" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "stripe_event_id" varchar(255) NOT NULL,
        "tenant_id" uuid REFERENCES "tenants"("id") ON DELETE SET NULL,
        "event_type" varchar(100) NOT NULL,
        "payload" jsonb NOT NULL,
        "processed_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_payment_events_stripe_event_id" UNIQUE ("stripe_event_id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_payment_events_tenant" ON "payment_events" ("tenant_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_payment_events_type" ON "payment_events" ("event_type")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "billing_settings" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "key" varchar(120) NOT NULL UNIQUE,
        "value" jsonb NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      INSERT INTO "billing_settings" ("key", "value")
      VALUES ('default_enforcement', '{
        "grace_period_days": 3,
        "read_only_after_days": 4,
        "suspend_after_days": 15,
        "billing_warning_emails": true,
        "billing_retry_emails": true,
        "max_payment_attempts": 4,
        "manual_override_allowed": true,
        "manual_override_max_days": 30
      }'::jsonb)
      ON CONFLICT ("key") DO NOTHING
    `);

    await queryRunner.query(`ALTER TABLE "tenant_billing_state" ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE "payment_events" ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE "billing_settings" ENABLE ROW LEVEL SECURITY`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "billing_settings"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payment_events"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tenant_billing_state"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_invoices_stripe_invoice"`);
    await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN IF EXISTS "attempt_count"`);
    await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN IF EXISTS "invoice_pdf"`);
    await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN IF EXISTS "hosted_invoice_url"`);
    await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN IF EXISTS "due_date"`);
    await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN IF EXISTS "currency"`);
    await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN IF EXISTS "amount_paid"`);
    await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN IF EXISTS "amount_due"`);
    await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN IF EXISTS "stripe_invoice_id"`);
    await queryRunner.query(`ALTER TABLE "billing_subscriptions" DROP CONSTRAINT IF EXISTS "chk_billing_subscriptions_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_billing_subscriptions_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_billing_subscriptions_stripe_subscription"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_billing_subscriptions_tenant"`);
    await queryRunner.query(`ALTER TABLE "billing_subscriptions" DROP COLUMN IF EXISTS "resumed_at"`);
    await queryRunner.query(`ALTER TABLE "billing_subscriptions" DROP COLUMN IF EXISTS "suspended_at"`);
    await queryRunner.query(`ALTER TABLE "billing_subscriptions" DROP COLUMN IF EXISTS "grace_until"`);
    await queryRunner.query(`ALTER TABLE "billing_subscriptions" DROP COLUMN IF EXISTS "cancel_at_period_end"`);
    await queryRunner.query(`ALTER TABLE "billing_subscriptions" DROP COLUMN IF EXISTS "current_period_start"`);
    await queryRunner.query(`ALTER TABLE "billing_subscriptions" DROP COLUMN IF EXISTS "stripe_price_id"`);
    await queryRunner.query(`ALTER TABLE "billing_subscriptions" DROP COLUMN IF EXISTS "stripe_subscription_id"`);
    await queryRunner.query(`ALTER TABLE "billing_subscriptions" DROP COLUMN IF EXISTS "tenant_id"`);
  }
}
