import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 20260823000001_CreateIntegrationGovernance
 *
 * Governança administrativa de integrações, persistida em banco.
 *
 * MOTIVO: até aqui, "quem enxerga/usa qual integração" estava CODIFICADO
 * (um catálogo .ts decidia que docusign era governado e clicksign não). Regra de
 * governança em código exige deploy para mudar e não é auditável pelo admin —
 * errado. O que é código de facto é a CAPACIDADE TÉCNICA (existe adapter ou
 * não); isso continua derivado do registry em código e NÃO é editável por admin.
 *
 * Separação de responsabilidades:
 *   - platform_integrations  → governança (publicação + audiência VIEW/USE)
 *   - registry em código     → capacidade técnica (adapter existe?)
 *   - integrations/oauth_connections → conexão do tenant (inalterado)
 *
 * RLS: config GLOBAL da plataforma (sem tenant_id). Mesmo padrão de
 * billing_plans — RLS habilitada com policy permissiva para manter a postura
 * fail-closed, e autorização de escrita feita na camada RBAC (super_admin).
 */
export class CreateIntegrationGovernance20260823000001 implements MigrationInterface {
  name = 'CreateIntegrationGovernance20260823000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "integration_categories" (
        "id"            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "slug"          varchar(64)  NOT NULL UNIQUE,
        "name"          varchar(120) NOT NULL,
        "display_order" integer      NOT NULL DEFAULT 0,
        "active"        boolean      NOT NULL DEFAULT true,
        "created_at"    timestamptz  NOT NULL DEFAULT now(),
        "updated_at"    timestamptz  NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "platform_integrations" (
        "id"                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "provider_key"      varchar(64)  NOT NULL UNIQUE,
        "name"              varchar(120) NOT NULL,
        "category_id"       uuid         NULL REFERENCES "integration_categories"("id") ON DELETE SET NULL,
        "connection_kind"   varchar(32)  NOT NULL,
        "required_env"      jsonb        NOT NULL DEFAULT '[]'::jsonb,
        -- draft | published | retired. Só 'published' pode ser resolvido para clientes.
        "publication_state" varchar(16)  NOT NULL DEFAULT 'draft',
        -- { mode: 'none'|'all'|'plans'|'tenants', plans: string[], tenantIds: string[] }
        "view_audience"     jsonb        NOT NULL DEFAULT '{"mode":"none","plans":[],"tenantIds":[]}'::jsonb,
        "use_audience"      jsonb        NOT NULL DEFAULT '{"mode":"none","plans":[],"tenantIds":[]}'::jsonb,
        "is_core"           boolean      NOT NULL DEFAULT false,
        "notes"             text         NULL,
        "created_at"        timestamptz  NOT NULL DEFAULT now(),
        "updated_at"        timestamptz  NOT NULL DEFAULT now(),
        CONSTRAINT "platform_integrations_publication_state_chk"
          CHECK ("publication_state" IN ('draft','published','retired')),
        CONSTRAINT "platform_integrations_connection_kind_chk"
          CHECK ("connection_kind" IN ('oauth','tenant_credentials','platform_credentials'))
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_platform_integrations_published"
        ON "platform_integrations" ("publication_state")
    `);

    // ── Seed: categorias ────────────────────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO "integration_categories" ("slug","name","display_order") VALUES
        ('signing',          'Assinatura Digital',      10),
        ('rights',           'Direitos Autorais',       20),
        ('fiscal',           'Fiscal',                  30),
        ('music-monitoring', 'Monitoramento Musical',   40),
        ('platform-metrics', 'Métricas de Plataforma',  50),
        ('marketing',        'Marketing Digital',       60),
        ('payments',         'Pagamentos',              70),
        ('email',            'E-mail Transacional',     80),
        ('messaging',        'Mensageria',              90)
      ON CONFLICT ("slug") DO NOTHING
    `);

    // ── Seed: integrações ───────────────────────────────────────────────────
    // Provedores COM adapter real entram publicados e visíveis/usáveis por todos
    // — preserva exatamente o comportamento atual, sem regressão.
    // Provedores SEM adapter (clicksign/ubc/ecad/nfe) entram como 'draft': passam
    // a EXISTIR como linha governável (o admin vê e decide), em vez de serem
    // invisíveis por omissão de um arquivo .ts. A capacidade técnica deles
    // continua sendo 'not_implemented', derivada do código — publicar não
    // inventa adapter, e o resolver nunca deixa USE passar sem capacidade.
    const seed = (
      key: string, name: string, cat: string, kind: string,
      env: string[], published: boolean, core = false,
    ) => `(
      '${key}', '${name}',
      (SELECT "id" FROM "integration_categories" WHERE "slug"='${cat}'),
      '${kind}', '${JSON.stringify(env)}'::jsonb,
      '${published ? 'published' : 'draft'}',
      '${JSON.stringify({ mode: published ? 'all' : 'none', plans: [], tenantIds: [] })}'::jsonb,
      '${JSON.stringify({ mode: published ? 'all' : 'none', plans: [], tenantIds: [] })}'::jsonb,
      ${core}
    )`;

    await queryRunner.query(`
      INSERT INTO "platform_integrations"
        ("provider_key","name","category_id","connection_kind","required_env",
         "publication_state","view_audience","use_audience","is_core")
      VALUES
        ${seed('autentique', 'Autentique', 'signing', 'tenant_credentials', [], true, true)},
        ${seed('docusign', 'DocuSign', 'signing', 'oauth', ['DOCUSIGN_INTEGRATION_KEY', 'DOCUSIGN_CLIENT_SECRET'], true)},
        ${seed('clicksign', 'Clicksign', 'signing', 'tenant_credentials', [], false)},
        ${seed('abramus', 'ABRAMUS', 'rights', 'tenant_credentials', [], true)},
        ${seed('ubc', 'UBC', 'rights', 'tenant_credentials', [], false)},
        ${seed('ecad', 'ECAD', 'rights', 'tenant_credentials', [], false)},
        ${seed('nfe', 'NFe', 'fiscal', 'tenant_credentials', [], false)},
        ${seed('acrcloud', 'ACRCloud', 'music-monitoring', 'platform_credentials', ['ACRCLOUD_HOST', 'ACRCLOUD_ACCESS_KEY', 'ACRCLOUD_ACCESS_SECRET'], true)},
        ${seed('soundcharts', 'Soundcharts', 'platform-metrics', 'platform_credentials', ['SOUNDCHARTS_CLIENT_ID', 'SOUNDCHARTS_CLIENT_SECRET'], true, true)},
        ${seed('google_ads', 'Google Ads', 'marketing', 'oauth', ['GOOGLE_ADS_CLIENT_ID', 'GOOGLE_ADS_CLIENT_SECRET'], true)},
        ${seed('meta_business', 'Meta Business Suite', 'marketing', 'oauth', ['META_APP_ID', 'META_APP_SECRET'], true)},
        ${seed('stripe', 'Stripe', 'payments', 'platform_credentials', ['STRIPE_SECRET_KEY'], true, true)},
        ${seed('resend', 'Resend', 'email', 'platform_credentials', ['RESEND_API_KEY'], true, true)},
        ${seed('whatsapp', 'WhatsApp Cloud API', 'messaging', 'tenant_credentials', [], true)}
      ON CONFLICT ("provider_key") DO NOTHING
    `);

    for (const table of ['integration_categories', 'platform_integrations']) {
      await queryRunner.query(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`);
      await queryRunner.query(`
        DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='${table}' AND policyname='${table}_global_access') THEN
            CREATE POLICY "${table}_global_access" ON "${table}" FOR ALL USING (true) WITH CHECK (true);
          END IF;
        END $$;
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP POLICY IF EXISTS "platform_integrations_global_access" ON "platform_integrations"`);
    await queryRunner.query(`DROP POLICY IF EXISTS "integration_categories_global_access" ON "integration_categories"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "platform_integrations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "integration_categories"`);
  }
}
