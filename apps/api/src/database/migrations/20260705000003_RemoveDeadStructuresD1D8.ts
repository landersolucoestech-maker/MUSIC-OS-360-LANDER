import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 20260705000003_RemoveDeadStructuresD1D8
 *
 * Migração destrutiva forward-only cobrindo os achados D1–D8 da auditoria
 * completa de banco (2026-07-05, `docs/AUDITORIA_DB_2026-07-05.md`). Cada
 * estrutura removida aqui foi confirmada com 0 referências de código vivo
 * (fora de migrations/entities órfãs) antes desta migração ser escrita.
 *
 * NÃO EXECUTAR contra produção sem Go explícito (ver runbook de release).
 *
 * D1: cluster CRM legado 0-linhas (crm_companies, crm_contacts, crm_tags,
 *     crm_contact_tags, crm_timeline_events) — substituído por contacts/leads.
 * D2: crm_tasks (4 linhas) — migradas para operational_tasks (mesmo shape,
 *     já é a tabela real por trás de CrmTaskEntity) antes do DROP.
 * D3: 13 tabelas conversation_* de configuração (CustomerCareConversationExtensions),
 *     0 linhas, 0 referências vivas. conversations/conversation_messages/
 *     conversation_notes NÃO são afetadas (essas ficam).
 * D4: organization_members — criada fora do fluxo de migrations, sem entidade,
 *     sem RLS/policies, 0 linhas, duplica org_members (esta é a oficial).
 * D5: financial_category_templates — 0 linhas, 0 referências.
 * D7: colunas flat legadas de financial_category_rules (transaction_type,
 *     counterparty_type, category, subcategory, links, sort_order) — modelo
 *     substituído por conditions/actions (jsonb); entity atual já não as mapeia.
 * D8: financial_centers (22 linhas seedadas, nunca lidas/escritas pelo código)
 *     + coluna/FK financial_category_centers.center_id.
 *
 * Nota de correção da auditoria: o item D6 (colunas artists.spotify_url/
 * youtube_url/instagram_url/tiktok_url) NÃO está incluído aqui — na
 * verificação desta migração, spotify_url e youtube_url continuam sendo
 * escritos/lidos ativamente por CreateArtistDto/ArtistsService/
 * ArtistaEvolucaoSection, e instagram_url/tiktok_url nunca existiram como
 * colunas de `artists` (o relatório estava desatualizado nesse ponto).
 */
export class RemoveDeadStructuresD1D8_20260705000003 implements MigrationInterface {
  name = 'RemoveDeadStructuresD1D8_20260705000003';

  public async up(qr: QueryRunner): Promise<void> {
    // ── D2: migrar crm_tasks → operational_tasks antes do DROP (mesmo shape) ──
    await qr.query(`
      INSERT INTO operational_tasks (
        id, tenant_id, title, description, status, priority, type,
        contact_id, company_id, assigned_to, due_date, completed_at,
        created_by, created_at, updated_at
      )
      SELECT
        id, tenant_id, title, description, status, priority, type,
        contact_id, company_id, assigned_to, due_date, completed_at,
        created_by, created_at, updated_at
      FROM crm_tasks
      ON CONFLICT (id) DO NOTHING
    `);

    // ── D1 + D2: drop do cluster CRM legado (ordem respeita FKs) ──────────────
    for (const table of [
      'crm_timeline_events',
      'crm_tasks',
      'crm_contact_tags',
      'crm_tags',
      'crm_contacts',
      'crm_companies',
    ]) {
      await qr.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
    }

    // ── D3: 13 tabelas conversation_* de configuração, 0 uso vivo ─────────────
    for (const table of [
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
    ]) {
      await qr.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
    }

    // ── D4: organization_members (duplicata de org_members, fora de migrations) ─
    await qr.query(`DROP TABLE IF EXISTS organization_members CASCADE`);

    // ── D5: financial_category_templates, 0 uso vivo ──────────────────────────
    await qr.query(`DROP TABLE IF EXISTS financial_category_templates CASCADE`);

    // ── D7: colunas flat legadas de financial_category_rules ──────────────────
    await qr.query(`
      DROP INDEX IF EXISTS idx_financial_category_rules_dynamic_lookup;
      ALTER TABLE financial_category_rules
        DROP COLUMN IF EXISTS transaction_type,
        DROP COLUMN IF EXISTS counterparty_type,
        DROP COLUMN IF EXISTS category,
        DROP COLUMN IF EXISTS subcategory,
        DROP COLUMN IF EXISTS links,
        DROP COLUMN IF EXISTS sort_order
    `);

    // ── D8: financial_centers + coluna/FK financial_category_centers.center_id ─
    await qr.query(`
      ALTER TABLE financial_category_centers
        DROP COLUMN IF EXISTS center_id CASCADE
    `);
    await qr.query(`DROP TABLE IF EXISTS financial_centers CASCADE`);
  }

  public async down(qr: QueryRunner): Promise<void> {
    // Reversão de schema (best-effort). Dados das tabelas dropadas em D1/D3/D4/D5
    // e das linhas seedadas de financial_centers (D8) NÃO são restaurados — só a
    // migração de crm_tasks→operational_tasks (D2) é reversível com dado real.

    await qr.query(`
      CREATE TABLE IF NOT EXISTS financial_centers (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id       UUID NOT NULL,
        type            VARCHAR(30) NOT NULL,
        name            VARCHAR(255) NOT NULL,
        slug            VARCHAR(255) NOT NULL,
        code            VARCHAR(80) NOT NULL,
        description     TEXT,
        color           VARCHAR(40),
        icon            VARCHAR(80),
        active          BOOLEAN NOT NULL DEFAULT true,
        system_center   BOOLEAN NOT NULL DEFAULT false,
        metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_by      VARCHAR(255),
        updated_by      VARCHAR(255),
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at      TIMESTAMPTZ,
        CONSTRAINT chk_financial_centers_type CHECK (type IN ('COST_CENTER','REVENUE_CENTER'))
      );
      CREATE UNIQUE INDEX IF NOT EXISTS uq_financial_centers_code_active ON financial_centers (tenant_id, code) WHERE deleted_at IS NULL;
      CREATE INDEX IF NOT EXISTS idx_financial_centers_type ON financial_centers (tenant_id, type, active, deleted_at);
    `);

    await qr.query(`
      ALTER TABLE financial_category_centers
        ADD COLUMN IF NOT EXISTS center_id UUID REFERENCES financial_centers(id) ON DELETE CASCADE
    `);
    await qr.query(`
      CREATE INDEX IF NOT EXISTS idx_financial_category_centers_center ON financial_category_centers (tenant_id, center_id)
    `);

    await qr.query(`
      ALTER TABLE financial_category_rules
        ADD COLUMN IF NOT EXISTS transaction_type VARCHAR(40),
        ADD COLUMN IF NOT EXISTS counterparty_type VARCHAR(80),
        ADD COLUMN IF NOT EXISTS category VARCHAR(255),
        ADD COLUMN IF NOT EXISTS subcategory VARCHAR(255),
        ADD COLUMN IF NOT EXISTS links JSONB,
        ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
      CREATE INDEX IF NOT EXISTS idx_financial_category_rules_dynamic_lookup
        ON financial_category_rules (tenant_id, transaction_type, counterparty_type, category, subcategory, active, sort_order);
    `);

    await qr.query(`
      CREATE TABLE IF NOT EXISTS financial_category_templates (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id       UUID NOT NULL,
        name            VARCHAR(255) NOT NULL,
        description     TEXT,
        template_kind   VARCHAR(80) NOT NULL DEFAULT 'operational',
        payload         JSONB NOT NULL DEFAULT '{}'::jsonb,
        system_template BOOLEAN NOT NULL DEFAULT false,
        active          BOOLEAN NOT NULL DEFAULT true,
        created_by      VARCHAR(255),
        updated_by      VARCHAR(255),
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at      TIMESTAMPTZ
      );
    `);

    await qr.query(`
      CREATE TABLE IF NOT EXISTS organization_members (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id       UUID NOT NULL,
        user_id         UUID,
        role            VARCHAR(100),
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    for (const table of [
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
    ]) {
      await qr.query(`CREATE TABLE IF NOT EXISTS ${table} (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL)`);
    }

    await qr.query(`
      CREATE TABLE IF NOT EXISTS crm_companies (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL);
      CREATE TABLE IF NOT EXISTS crm_contacts (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL, company_id UUID REFERENCES crm_companies(id) ON DELETE SET NULL);
      CREATE TABLE IF NOT EXISTS crm_tags (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL);
      CREATE TABLE IF NOT EXISTS crm_contact_tags (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL, contact_id UUID NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE, tag_id UUID NOT NULL REFERENCES crm_tags(id) ON DELETE CASCADE);
      CREATE TABLE IF NOT EXISTS crm_timeline_events (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL, contact_id UUID NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE);
      CREATE TABLE IF NOT EXISTS crm_tasks (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL, contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL, company_id UUID REFERENCES crm_companies(id) ON DELETE SET NULL);
    `);
  }
}
