import { MigrationInterface, QueryRunner } from 'typeorm';

export class LeadsContactsOperationalRefactor20260528000002 implements MigrationInterface {
  name = 'LeadsContactsOperationalRefactor20260528000002';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pg_trgm"`);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS leads
        ADD COLUMN IF NOT EXISTS nome_completo VARCHAR(255),
        ADD COLUMN IF NOT EXISTS nome_artistico VARCHAR(255),
        ADD COLUMN IF NOT EXISTS empresa VARCHAR(255),
        ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(50),
        ADD COLUMN IF NOT EXISTS instagram VARCHAR(255),
        ADD COLUMN IF NOT EXISTS cidade VARCHAR(120),
        ADD COLUMN IF NOT EXISTS estado VARCHAR(80),
        ADD COLUMN IF NOT EXISTS pais VARCHAR(80),
        ADD COLUMN IF NOT EXISTS tipo_cliente VARCHAR(80),
        ADD COLUMN IF NOT EXISTS "tipoServico" VARCHAR(120),
        ADD COLUMN IF NOT EXISTS payload_servico JSONB NOT NULL DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS dados_internos_crm JSONB NOT NULL DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS responsavel VARCHAR(255),
        ADD COLUMN IF NOT EXISTS prioridade VARCHAR(40),
        ADD COLUMN IF NOT EXISTS temperatura VARCHAR(40),
        ADD COLUMN IF NOT EXISTS "origemLead" VARCHAR(120),
        ADD COLUMN IF NOT EXISTS valor_estimado NUMERIC(15,2),
        ADD COLUMN IF NOT EXISTS "probabilidadeFechamento" NUMERIC(5,2),
        ADD COLUMN IF NOT EXISTS proximo_follow_up TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}'
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS lead_uploads (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
        file_name VARCHAR(500) NOT NULL,
        mime_type VARCHAR(120) NOT NULL,
        extension VARCHAR(20) NOT NULL,
        size BIGINT NOT NULL,
        url TEXT,
        metadata JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        name VARCHAR(255) NOT NULL,
        company_name VARCHAR(255),
        contact_type VARCHAR(80) NOT NULL,
        document_type VARCHAR(40),
        document_number VARCHAR(80),
        phone VARCHAR(50),
        whatsapp VARCHAR(50),
        email_encrypted TEXT,
        instagram VARCHAR(255),
        website VARCHAR(500),
        address VARCHAR(500),
        city VARCHAR(120),
        state VARCHAR(80),
        country VARCHAR(80),
        zip_code VARCHAR(30),
        responsible VARCHAR(255),
        notes TEXT,
        tags TEXT[] NOT NULL DEFAULT '{}',
        status VARCHAR(40) NOT NULL DEFAULT 'active',
        priority VARCHAR(40) NOT NULL DEFAULT 'medium',
        linked_artist_id UUID,
        payload_operacional JSONB NOT NULL DEFAULT '{}',
        created_by VARCHAR(255),
        updated_by VARCHAR(255),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS contact_timeline (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
        event_type VARCHAR(80) NOT NULL,
        summary VARCHAR(500),
        payload JSONB NOT NULL DEFAULT '{}',
        actor_id VARCHAR(255),
        occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS contact_attachments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
        file_name VARCHAR(500) NOT NULL,
        mime_type VARCHAR(120) NOT NULL,
        extension VARCHAR(20) NOT NULL,
        size BIGINT NOT NULL,
        url TEXT,
        metadata JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS contact_contracts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
        contract_id UUID NOT NULL,
        relation_type VARCHAR(80) NOT NULL DEFAULT 'related',
        metadata JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(contact_id, contract_id)
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_leads_tipoServico ON leads (tenant_id, "tipoServico")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_leads_status ON leads (tenant_id, status)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_leads_responsavel ON leads (tenant_id, responsavel)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_leads_origemLead ON leads (tenant_id, "origemLead")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_leads_cidade ON leads (tenant_id, cidade)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_leads_estado ON leads (tenant_id, estado)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_leads_tags ON leads USING GIN (tags)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_leads_payload_servico ON leads USING GIN (payload_servico)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_lead_uploads_lead ON lead_uploads (tenant_id, lead_id, created_at DESC)`);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_contacts_contact_type ON contacts (tenant_id, contact_type)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts (tenant_id, status)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_contacts_responsible ON contacts (tenant_id, responsible)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_contacts_city ON contacts (tenant_id, city)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_contacts_state ON contacts (tenant_id, state)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_contacts_tags ON contacts USING GIN (tags)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_contacts_payload_operacional ON contacts USING GIN (payload_operacional)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_contacts_name_trgm ON contacts USING GIN (name gin_trgm_ops)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_contact_timeline_contact ON contact_timeline (tenant_id, contact_id, occurred_at DESC)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_contact_attachments_contact ON contact_attachments (tenant_id, contact_id, created_at DESC)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_contact_contracts_contact ON contact_contracts (tenant_id, contact_id)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS contact_contracts`);
    await queryRunner.query(`DROP TABLE IF EXISTS contact_attachments`);
    await queryRunner.query(`DROP TABLE IF EXISTS contact_timeline`);
    await queryRunner.query(`DROP TABLE IF EXISTS contacts`);
    await queryRunner.query(`DROP TABLE IF EXISTS lead_uploads`);
  }
}
