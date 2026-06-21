import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Customer care extensions for MusicChat.
 *
 * Adds operational support tables around the existing conversations inbox.
 * The base conversations, messages and notes tables remain unchanged.
 */
export class CustomerCareConversationExtensions20260604000001 implements MigrationInterface {
  name = 'CustomerCareConversationExtensions20260604000001';

  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'conversation_channel') THEN
          ALTER TYPE conversation_channel ADD VALUE IF NOT EXISTS 'facebook';
          ALTER TYPE conversation_channel ADD VALUE IF NOT EXISTS 'tiktok';
          ALTER TYPE conversation_channel ADD VALUE IF NOT EXISTS 'custom';
        END IF;
      END $$;
    `);

    await qr.query(`
      CREATE TABLE IF NOT EXISTS conversation_channel_accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        channel TEXT NOT NULL,
        name TEXT NOT NULL,
        external_account_id TEXT,
        status TEXT NOT NULL DEFAULT 'disconnected',
        credentials JSONB NOT NULL DEFAULT '{}',
        settings JSONB NOT NULL DEFAULT '{}',
        metadata JSONB NOT NULL DEFAULT '{}',
        created_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS conversation_sectors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        settings JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS conversation_queues (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        sector_id UUID REFERENCES conversation_sectors(id) ON DELETE SET NULL,
        channel_account_id UUID REFERENCES conversation_channel_accounts(id) ON DELETE SET NULL,
        name TEXT NOT NULL,
        description TEXT,
        distribution_mode TEXT NOT NULL DEFAULT 'manual',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        settings JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS conversation_service_statuses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        key TEXT NOT NULL,
        label TEXT NOT NULL,
        color TEXT,
        sort_order INT NOT NULL DEFAULT 0,
        is_final BOOLEAN NOT NULL DEFAULT FALSE,
        is_system BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ,
        UNIQUE (tenant_id, key)
      );

      CREATE TABLE IF NOT EXISTS conversation_tags (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        color TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ,
        UNIQUE (tenant_id, name)
      );

      CREATE TABLE IF NOT EXISTS conversation_transfers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        from_queue_id UUID REFERENCES conversation_queues(id) ON DELETE SET NULL,
        to_queue_id UUID REFERENCES conversation_queues(id) ON DELETE SET NULL,
        from_sector_id UUID REFERENCES conversation_sectors(id) ON DELETE SET NULL,
        to_sector_id UUID REFERENCES conversation_sectors(id) ON DELETE SET NULL,
        from_assignee TEXT,
        to_assignee TEXT,
        reason TEXT,
        transferred_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS conversation_closures (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        reason TEXT NOT NULL,
        service_status TEXT NOT NULL DEFAULT 'resolvida',
        crm_actions JSONB NOT NULL DEFAULT '{}',
        closed_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS conversation_audit_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
        event_type TEXT NOT NULL,
        actor_id TEXT,
        before JSONB,
        after JSONB,
        metadata JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS conversation_quick_replies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        sector_id UUID REFERENCES conversation_sectors(id) ON DELETE SET NULL,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        tags JSONB NOT NULL DEFAULT '[]',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS conversation_auto_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        queue_id UUID REFERENCES conversation_queues(id) ON DELETE SET NULL,
        trigger_key TEXT NOT NULL,
        body TEXT NOT NULL,
        variables JSONB NOT NULL DEFAULT '[]',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS conversation_sla_policies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        queue_id UUID REFERENCES conversation_queues(id) ON DELETE SET NULL,
        name TEXT NOT NULL,
        first_response_minutes INT NOT NULL DEFAULT 60,
        resolution_minutes INT NOT NULL DEFAULT 1440,
        warning_threshold_percent INT NOT NULL DEFAULT 80,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS conversation_business_hours (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        queue_id UUID REFERENCES conversation_queues(id) ON DELETE SET NULL,
        name TEXT NOT NULL,
        timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
        schedule JSONB NOT NULL DEFAULT '{}',
        holidays JSONB NOT NULL DEFAULT '[]',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS conversation_protocol_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        prefix TEXT NOT NULL DEFAULT 'MC',
        next_number BIGINT NOT NULL DEFAULT 1,
        padding INT NOT NULL DEFAULT 6,
        reset_mode TEXT NOT NULL DEFAULT 'yearly',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (tenant_id)
      );
    `);

    await qr.query(`
      CREATE INDEX IF NOT EXISTS idx_conv_channel_accounts_tenant ON conversation_channel_accounts (tenant_id) WHERE deleted_at IS NULL;
      CREATE INDEX IF NOT EXISTS idx_conv_sectors_tenant ON conversation_sectors (tenant_id) WHERE deleted_at IS NULL;
      CREATE INDEX IF NOT EXISTS idx_conv_queues_tenant ON conversation_queues (tenant_id) WHERE deleted_at IS NULL;
      CREATE INDEX IF NOT EXISTS idx_conv_queues_sector ON conversation_queues (sector_id) WHERE deleted_at IS NULL;
      CREATE INDEX IF NOT EXISTS idx_conv_tags_tenant ON conversation_tags (tenant_id) WHERE deleted_at IS NULL;
      CREATE INDEX IF NOT EXISTS idx_conv_transfers_conversation ON conversation_transfers (conversation_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_conv_closures_conversation ON conversation_closures (conversation_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_conv_audit_conversation ON conversation_audit_events (conversation_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_conv_quick_replies_tenant ON conversation_quick_replies (tenant_id) WHERE deleted_at IS NULL;
      CREATE INDEX IF NOT EXISTS idx_conv_auto_messages_tenant ON conversation_auto_messages (tenant_id) WHERE deleted_at IS NULL;
      CREATE INDEX IF NOT EXISTS idx_conv_sla_tenant ON conversation_sla_policies (tenant_id) WHERE deleted_at IS NULL;
      CREATE INDEX IF NOT EXISTS idx_conv_business_hours_tenant ON conversation_business_hours (tenant_id) WHERE deleted_at IS NULL;
    `);

    await qr.query(`
      ALTER TABLE conversation_channel_accounts ENABLE ROW LEVEL SECURITY;
      ALTER TABLE conversation_sectors ENABLE ROW LEVEL SECURITY;
      ALTER TABLE conversation_queues ENABLE ROW LEVEL SECURITY;
      ALTER TABLE conversation_service_statuses ENABLE ROW LEVEL SECURITY;
      ALTER TABLE conversation_tags ENABLE ROW LEVEL SECURITY;
      ALTER TABLE conversation_transfers ENABLE ROW LEVEL SECURITY;
      ALTER TABLE conversation_closures ENABLE ROW LEVEL SECURITY;
      ALTER TABLE conversation_audit_events ENABLE ROW LEVEL SECURITY;
      ALTER TABLE conversation_quick_replies ENABLE ROW LEVEL SECURITY;
      ALTER TABLE conversation_auto_messages ENABLE ROW LEVEL SECURITY;
      ALTER TABLE conversation_sla_policies ENABLE ROW LEVEL SECURITY;
      ALTER TABLE conversation_business_hours ENABLE ROW LEVEL SECURITY;
      ALTER TABLE conversation_protocol_settings ENABLE ROW LEVEL SECURITY;
    `);

    const tables = [
      'conversation_channel_accounts',
      'conversation_sectors',
      'conversation_queues',
      'conversation_service_statuses',
      'conversation_tags',
      'conversation_transfers',
      'conversation_closures',
      'conversation_audit_events',
      'conversation_quick_replies',
      'conversation_auto_messages',
      'conversation_sla_policies',
      'conversation_business_hours',
      'conversation_protocol_settings',
    ];

    for (const table of tables) {
      await qr.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
              AND tablename = '${table}'
              AND policyname = 'tenant_isolation'
          ) THEN
            CREATE POLICY tenant_isolation ON ${table}
              USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);
          END IF;
        END $$;
      `);
    }
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      DROP TABLE IF EXISTS conversation_protocol_settings CASCADE;
      DROP TABLE IF EXISTS conversation_business_hours CASCADE;
      DROP TABLE IF EXISTS conversation_sla_policies CASCADE;
      DROP TABLE IF EXISTS conversation_auto_messages CASCADE;
      DROP TABLE IF EXISTS conversation_quick_replies CASCADE;
      DROP TABLE IF EXISTS conversation_audit_events CASCADE;
      DROP TABLE IF EXISTS conversation_closures CASCADE;
      DROP TABLE IF EXISTS conversation_transfers CASCADE;
      DROP TABLE IF EXISTS conversation_tags CASCADE;
      DROP TABLE IF EXISTS conversation_service_statuses CASCADE;
      DROP TABLE IF EXISTS conversation_queues CASCADE;
      DROP TABLE IF EXISTS conversation_sectors CASCADE;
      DROP TABLE IF EXISTS conversation_channel_accounts CASCADE;
    `);
  }
}
