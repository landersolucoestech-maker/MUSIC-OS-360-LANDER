import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 20260822000005_DropGenericFormsModule
 *
 * Decisão de produto (2026-08-22): não haverá Form Builder genérico no
 * Music OS 360. `forms`/`form_submissions` (criadas em
 * 20260521000040_ConversationsAndForms, junto com as tabelas de
 * conversations do MusicChat — preservadas intactas, não tocadas aqui)
 * nunca tiveram um consumidor real aprovado: zero UI no frontend, zero
 * service/controller de outro módulo depende delas, e
 * entity-metadata.service.ts já as excluía explicitamente da Central de
 * Relatórios ("nunca podem aparecer"). Captação de artistas usa o Artist
 * Public Form (fluxo especializado próprio); suporte usa Support Ticket;
 * nenhum dos dois nunca dependeu deste módulo genérico.
 *
 * Aditiva/segura: apenas DROP das duas tabelas do módulo forms (que nunca
 * tiveram um fluxo real de escrita em produção) e do enum form_status.
 * NÃO toca conversations/conversation_messages/conversation_notes (MusicChat).
 */
export class DropGenericFormsModule20260822000005 implements MigrationInterface {
  name = 'DropGenericFormsModule20260822000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS form_submissions CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS forms CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS form_status`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE form_status AS ENUM ('draft', 'active', 'archived')`);

    await queryRunner.query(`
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

    await queryRunner.query(`
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

    await queryRunner.query(`
      ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
      ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;
      CREATE POLICY tenant_isolation ON forms
        USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);
      CREATE POLICY tenant_isolation ON form_submissions
        USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);
    `);
  }
}
