import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 20260905000001_PaymentEventsLifecycleStatus
 *
 * `payment_events.processed_at` was set unconditionally at INSERT time —
 * before BillingService.processEvent() actually ran. If processing then
 * threw (a transient DB/network error, not a business rejection), the row
 * was already there; Stripe's automatic retry of the same event.id hit the
 * ON CONFLICT DO NOTHING dedup path and the handler returned success
 * without ever reprocessing. The event's financial effect (subscription
 * activation, invoice upsert, etc.) was then permanently lost — Stripe
 * never retries an event it already got a 200 for.
 *
 * Adds an explicit lifecycle `status` so "seen" and "successfully applied"
 * are no longer the same fact: `processing` (row exists, being applied or
 * abandoned mid-processing by a crash) → `processed` (succeeded,
 * `processed_at` now means what its name says) or `failed` (threw — a
 * FAILED row can be reclaimed by a later delivery of the same event.id,
 * restoring genuine retry capability instead of a silent permanent drop).
 *
 * Existing rows: this bug means every historical row already has
 * `processed_at` set regardless of whether processing actually succeeded —
 * there is no way to retroactively distinguish success from failure for
 * past events, so they're backfilled as `processed` (this migration closes
 * the gap for events from now on, not a retroactive audit of history).
 */
export class PaymentEventsLifecycleStatus20260905000001 implements MigrationInterface {
  name = 'PaymentEventsLifecycleStatus20260905000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "payment_events"
        ADD COLUMN IF NOT EXISTS "status" varchar(20) NOT NULL DEFAULT 'processing'
    `);
    await queryRunner.query(`
      ALTER TABLE "payment_events"
        ADD CONSTRAINT "chk_payment_events_status"
        CHECK ("status" IN ('processing', 'processed', 'failed'))
    `);
    // Every existing row was stamped processed_at at insert time regardless
    // of real outcome (the bug this migration fixes) — backfill as
    // 'processed' since there's no way to know which ones actually failed.
    await queryRunner.query(`
      UPDATE "payment_events" SET "status" = 'processed' WHERE "processed_at" IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_payment_events_status" ON "payment_events" ("status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_payment_events_status"`);
    await queryRunner.query(`ALTER TABLE "payment_events" DROP CONSTRAINT IF EXISTS "chk_payment_events_status"`);
    await queryRunner.query(`ALTER TABLE "payment_events" DROP COLUMN IF EXISTS "status"`);
  }
}
