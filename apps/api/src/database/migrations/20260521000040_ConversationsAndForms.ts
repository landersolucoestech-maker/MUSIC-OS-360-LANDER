import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 20260521000040_ConversationsAndForms
 *
 * Phase 9 — Conversations/Inbox
 * Phase 12 — Forms & Submissions
 *
 * New tables:
 *   conversations         — inbox threads (multi-channel)
 *   conversation_messages — messages within a thread
 *   conversation_notes    — internal team notes (not visible to contact)
 *   forms                 — configurable capture forms
 *   form_submissions      — submitted form data linked to leads/CRM
 */
export class ConversationsAndForms20260521000040 implements MigrationInterface {
  name = 'ConversationsAndForms20260521000040';

  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TYPE conversation_status  AS ENUM ('open', 'pending', 'closed', 'spam');
      CREATE TYPE conversation_channel AS ENUM ('internal', 'email', 'whatsapp', 'telegram', 'instagram', 'sms', 'discord');
      CREATE TYPE message_sender_type  AS ENUM ('user', 'contact', 'system', 'ai');
      CREATE TYPE form_status          AS ENUM ('draft', 'active', 'archived');
    `);

    // ── conversations ─────────────────────────────────────────────────────────
    await qr.query(`
      CREATE TABLE conversations (
        id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        contact_id      UUID        REFERENCES leads(id)  ON DELETE SET NULL,
        subject         TEXT        NOT NULL DEFAULT '',
        status          conversation_status  NOT NULL DEFAULT 'open',
        channel         conversation_channel NOT NULL DEFAULT 'internal',
        assigned_to     TEXT,
        last_message_at TIMESTAMPTZ,
        metadata        JSONB       NOT NULL DEFAULT '{}',
        created_by      TEXT,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at      TIMESTAMPTZ
      );

      CREATE INDEX idx_conversations_tenant_status ON conversations (tenant_id, status) WHERE deleted_at IS NULL;
      CREATE INDEX idx_conversations_assigned      ON conversations (assigned_to)       WHERE deleted_at IS NULL;
      CREATE INDEX idx_conversations_contact       ON conversations (contact_id)        WHERE deleted_at IS NULL;
    `);

    // ── conversation_messages ─────────────────────────────────────────────────
    await qr.query(`
      CREATE TABLE conversation_messages (
        id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        tenant_id       UUID        NOT NULL,
        body            TEXT        NOT NULL DEFAULT '',
        sender_id       TEXT        NOT NULL,
        sender_type     message_sender_type NOT NULL DEFAULT 'user',
        attachments     JSONB       NOT NULL DEFAULT '[]',
        metadata        JSONB       NOT NULL DEFAULT '{}',
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX idx_conv_messages_conv   ON conversation_messages (conversation_id, created_at DESC);
      CREATE INDEX idx_conv_messages_tenant ON conversation_messages (tenant_id);
    `);

    // ── conversation_notes (internal only) ────────────────────────────────────
    await qr.query(`
      CREATE TABLE conversation_notes (
        id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        tenant_id       UUID        NOT NULL,
        body            TEXT        NOT NULL DEFAULT '',
        author_id       TEXT        NOT NULL,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX idx_conv_notes_conv ON conversation_notes (conversation_id, created_at DESC);
    `);

    // ── forms ─────────────────────────────────────────────────────────────────
    await qr.query(`
      CREATE TABLE forms (
        id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name        TEXT        NOT NULL,
        description TEXT,
        fields      JSONB       NOT NULL DEFAULT '[]',
        settings    JSONB       NOT NULL DEFAULT '{}',
        status      form_status NOT NULL DEFAULT 'draft',
        submission_count INT    NOT NULL DEFAULT 0,
        created_by  TEXT,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at  TIMESTAMPTZ
      );

      CREATE INDEX idx_forms_tenant_status ON forms (tenant_id, status) WHERE deleted_at IS NULL;
    `);

    // ── form_submissions ──────────────────────────────────────────────────────
    await qr.query(`
      CREATE TABLE form_submissions (
        id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        form_id   UUID        NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
        tenant_id UUID        NOT NULL,
        lead_id   UUID        REFERENCES leads(id) ON DELETE SET NULL,
        data      JSONB       NOT NULL DEFAULT '{}',
        origin    TEXT,
        ip        TEXT,
        metadata  JSONB       NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX idx_form_submissions_form   ON form_submissions (form_id, created_at DESC);
      CREATE INDEX idx_form_submissions_tenant ON form_submissions (tenant_id);
      CREATE INDEX idx_form_submissions_lead   ON form_submissions (lead_id) WHERE lead_id IS NOT NULL;
    `);

    // ── RLS policies ──────────────────────────────────────────────────────────
    await qr.query(`
      ALTER TABLE conversations         ENABLE ROW LEVEL SECURITY;
      ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;
      ALTER TABLE conversation_notes    ENABLE ROW LEVEL SECURITY;
      ALTER TABLE forms                 ENABLE ROW LEVEL SECURITY;
      ALTER TABLE form_submissions      ENABLE ROW LEVEL SECURITY;

      CREATE POLICY tenant_isolation ON conversations
        USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);

      CREATE POLICY tenant_isolation ON conversation_messages
        USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);

      CREATE POLICY tenant_isolation ON conversation_notes
        USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);

      CREATE POLICY tenant_isolation ON forms
        USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);

      CREATE POLICY tenant_isolation ON form_submissions
        USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      DROP TABLE IF EXISTS form_submissions      CASCADE;
      DROP TABLE IF EXISTS forms                 CASCADE;
      DROP TABLE IF EXISTS conversation_notes    CASCADE;
      DROP TABLE IF EXISTS conversation_messages CASCADE;
      DROP TABLE IF EXISTS conversations         CASCADE;
      DROP TYPE  IF EXISTS form_status;
      DROP TYPE  IF EXISTS message_sender_type;
      DROP TYPE  IF EXISTS conversation_channel;
      DROP TYPE  IF EXISTS conversation_status;
    `);
  }
}
