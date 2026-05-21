import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Performance indexes for tenant-scoped list queries.
 *
 * Pattern: (tenant_id, deleted_at, created_at DESC) on every tenant table
 * covers: list with soft-delete filter ordered by created_at (most common query).
 *
 * Additional indexes for high-cardinality filters (status, category, etc.).
 * All indexes are created CONCURRENTLY to avoid locking production tables.
 *
 * Estimated impact: 5–50× speedup on list queries against tables with >10k rows.
 */
export class PerformanceIndexes20260521000030 implements MigrationInterface {
  name = 'PerformanceIndexes20260521000030';

  // Tables that follow the (tenant_id, deleted_at, created_at) pattern
  private readonly SOFT_DELETE_TABLES = [
    'artists', 'works', 'phonograms', 'contracts', 'contract_templates',
    'transactions', 'invoices', 'clients', 'leads', 'campaigns',
    'briefings', 'events', 'projects', 'releases', 'support_tickets',
    'uploads', 'notifications',
  ];

  async up(queryRunner: QueryRunner): Promise<void> {
    // ── Composite tenant + soft-delete indexes ────────────────────────────────
    for (const table of this.SOFT_DELETE_TABLES) {
      await queryRunner.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_${table}_tenant_active"
        ON "${table}" (tenant_id, deleted_at, created_at DESC)
        WHERE deleted_at IS NULL
      `);
    }

    // ── Status filters ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_artists_status"
      ON "artists" (tenant_id, status) WHERE deleted_at IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_contracts_status"
      ON "contracts" (tenant_id, status) WHERE deleted_at IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_transactions_type"
      ON "transactions" (tenant_id, type) WHERE deleted_at IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_leads_status"
      ON "leads" (tenant_id, status) WHERE deleted_at IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_support_tickets_status"
      ON "support_tickets" (tenant_id, status) WHERE deleted_at IS NULL
    `);

    // ── Audit / event log (append-only, no deleted_at) ────────────────────────
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_audit_logs_tenant_ts"
      ON "audit_logs" (tenant_id, created_at DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_activity_logs_tenant_ts"
      ON "activity_logs" (tenant_id, created_at DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_domain_event_log_aggregate"
      ON "domain_event_log" (aggregate_type, aggregate_id, created_at DESC)
    `);

    // ── Webhook events (provider + status for retry workers) ──────────────────
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_webhook_events_pending"
      ON "webhook_events" (provider, status, created_at)
      WHERE status IN ('pending', 'failed')
    `);

    // ── Billing subscription lookup ───────────────────────────────────────────
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_billing_subs_org"
      ON "billing_subscriptions" (org_id)
    `);
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_billing_subs_stripe_customer"
      ON "billing_subscriptions" (stripe_customer_id)
    `);

    // ── OAuth connections ────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_oauth_tenant_user_provider"
      ON "oauth_connections" (tenant_id, user_id, provider)
    `);

    // ── Full-text search on artist name ──────────────────────────────────────
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_artists_name_trgm"
      ON "artists" USING gin (nome_artistico gin_trgm_ops)
    `).catch(() => {
      // pg_trgm extension may not be available — skip silently
    });
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const indexes = [
      ...this.SOFT_DELETE_TABLES.map(t => `idx_${t}_tenant_active`),
      'idx_artists_status', 'idx_contracts_status', 'idx_transactions_type',
      'idx_leads_status', 'idx_support_tickets_status',
      'idx_audit_logs_tenant_ts', 'idx_activity_logs_tenant_ts',
      'idx_domain_event_log_aggregate', 'idx_webhook_events_pending',
      'idx_billing_subs_org', 'idx_billing_subs_stripe_customer',
      'idx_oauth_tenant_user_provider', 'idx_artists_name_trgm',
    ];

    for (const idx of indexes) {
      await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "${idx}"`);
    }
  }
}
