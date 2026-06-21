import type { MigrationInterface, QueryRunner } from 'typeorm';

export class FinancialCategoriesEnterprise20260526000002 implements MigrationInterface {
  name = 'FinancialCategoriesEnterprise20260526000002';

  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE IF NOT EXISTS financial_categories (
        id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id             UUID NOT NULL,
        parent_id             UUID,
        path                  TEXT NOT NULL,
        depth_level           INTEGER NOT NULL DEFAULT 0,
        tree_order            INTEGER NOT NULL DEFAULT 0,
        name                  VARCHAR(255) NOT NULL,
        slug                  VARCHAR(255) NOT NULL,
        code                  VARCHAR(80) NOT NULL,
        description           TEXT,
        color                 VARCHAR(40),
        icon                  VARCHAR(80),
        transaction_types     TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
        category_kind         VARCHAR(30) NOT NULL DEFAULT 'operational',
        system_category       BOOLEAN NOT NULL DEFAULT false,
        protected             BOOLEAN NOT NULL DEFAULT false,
        active                BOOLEAN NOT NULL DEFAULT true,
        archived              BOOLEAN NOT NULL DEFAULT false,
        allow_manual_usage    BOOLEAN NOT NULL DEFAULT true,
        allow_ai_suggestions  BOOLEAN NOT NULL DEFAULT true,
        usage_count           INTEGER NOT NULL DEFAULT 0,
        sort_order            INTEGER NOT NULL DEFAULT 0,
        metadata              JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_by            VARCHAR(255),
        updated_by            VARCHAR(255),
        created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at            TIMESTAMPTZ,
        CONSTRAINT chk_financial_categories_depth CHECK (depth_level >= 0),
        CONSTRAINT chk_financial_categories_kind CHECK (category_kind IN ('operational','managerial','accounting','tax','internal','automation','reporting')),
        CONSTRAINT chk_financial_categories_types CHECK (transaction_types <@ ARRAY['REVENUE','EXPENSE','INVESTMENT','TAX','TRANSFER']::TEXT[]),
        CONSTRAINT fk_financial_categories_parent FOREIGN KEY (parent_id) REFERENCES financial_categories(id) ON DELETE SET NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS uq_financial_categories_slug_active ON financial_categories (tenant_id, slug) WHERE deleted_at IS NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS uq_financial_categories_code_active ON financial_categories (tenant_id, code) WHERE deleted_at IS NULL;
      CREATE INDEX IF NOT EXISTS idx_financial_categories_parent_order ON financial_categories (tenant_id, parent_id, tree_order);
      CREATE INDEX IF NOT EXISTS idx_financial_categories_path ON financial_categories (tenant_id, path);
      CREATE INDEX IF NOT EXISTS idx_financial_categories_kind ON financial_categories (tenant_id, category_kind);
      CREATE INDEX IF NOT EXISTS idx_financial_categories_status ON financial_categories (tenant_id, active, archived, deleted_at);
      CREATE INDEX IF NOT EXISTS idx_financial_categories_types_gin ON financial_categories USING GIN (transaction_types);
      CREATE INDEX IF NOT EXISTS idx_financial_categories_metadata_gin ON financial_categories USING GIN (metadata);
    `);

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
      CREATE TABLE IF NOT EXISTS financial_category_centers (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id     UUID NOT NULL,
        category_id   UUID NOT NULL REFERENCES financial_categories(id) ON DELETE CASCADE,
        center_id     UUID NOT NULL REFERENCES financial_centers(id) ON DELETE CASCADE,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (tenant_id, category_id, center_id)
      );
      CREATE INDEX IF NOT EXISTS idx_financial_category_centers_category ON financial_category_centers (tenant_id, category_id);
      CREATE INDEX IF NOT EXISTS idx_financial_category_centers_center ON financial_category_centers (tenant_id, center_id);
    `);

    await qr.query(`
      CREATE TABLE IF NOT EXISTS financial_category_links (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id       UUID NOT NULL,
        category_id     UUID NOT NULL REFERENCES financial_categories(id) ON DELETE CASCADE,
        entity_type     VARCHAR(80) NOT NULL,
        entity_id       UUID,
        entity_label    VARCHAR(255),
        relation_role   VARCHAR(40) NOT NULL,
        metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_by      VARCHAR(255),
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at      TIMESTAMPTZ,
        CONSTRAINT chk_financial_category_links_role CHECK (relation_role IN ('payable_to','receivable_from','vendor','customer','partner','beneficiary'))
      );
      CREATE INDEX IF NOT EXISTS idx_financial_category_links_category ON financial_category_links (tenant_id, category_id, deleted_at);
      CREATE INDEX IF NOT EXISTS idx_financial_category_links_entity ON financial_category_links (tenant_id, entity_type, entity_id, deleted_at);
      CREATE INDEX IF NOT EXISTS idx_financial_category_links_metadata_gin ON financial_category_links USING GIN (metadata);
    `);

    await qr.query(`
      CREATE TABLE IF NOT EXISTS financial_category_rules (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id           UUID NOT NULL,
        category_id         UUID REFERENCES financial_categories(id) ON DELETE SET NULL,
        name                VARCHAR(255) NOT NULL,
        description         TEXT,
        priority            INTEGER NOT NULL DEFAULT 100,
        active              BOOLEAN NOT NULL DEFAULT true,
        conditions          JSONB NOT NULL DEFAULT '{}'::jsonb,
        actions             JSONB NOT NULL DEFAULT '{}'::jsonb,
        last_triggered_at   TIMESTAMPTZ,
        trigger_count       INTEGER NOT NULL DEFAULT 0,
        created_by          VARCHAR(255),
        updated_by          VARCHAR(255),
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at          TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS idx_financial_category_rules_active ON financial_category_rules (tenant_id, active, priority, deleted_at);
      CREATE INDEX IF NOT EXISTS idx_financial_category_rules_category ON financial_category_rules (tenant_id, category_id, deleted_at);
      CREATE INDEX IF NOT EXISTS idx_financial_category_rules_conditions_gin ON financial_category_rules USING GIN (conditions);
    `);

    await qr.query(`
      CREATE TABLE IF NOT EXISTS financial_category_audit_logs (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id      UUID NOT NULL,
        category_id    UUID,
        action         VARCHAR(80) NOT NULL,
        actor_id       VARCHAR(255),
        actor_type     VARCHAR(80) NOT NULL DEFAULT 'user',
        before         JSONB NOT NULL DEFAULT '{}'::jsonb,
        after          JSONB NOT NULL DEFAULT '{}'::jsonb,
        ip             VARCHAR(80),
        metadata       JSONB NOT NULL DEFAULT '{}'::jsonb,
        timestamp      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_financial_category_audit_category ON financial_category_audit_logs (tenant_id, category_id, timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_financial_category_audit_action ON financial_category_audit_logs (tenant_id, action, timestamp DESC);
    `);

    await qr.query(`
      CREATE TABLE IF NOT EXISTS financial_category_favorites (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id     UUID NOT NULL,
        category_id   UUID NOT NULL REFERENCES financial_categories(id) ON DELETE CASCADE,
        user_id       VARCHAR(255) NOT NULL,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (tenant_id, category_id, user_id)
      );

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

      CREATE TABLE IF NOT EXISTS financial_category_rule_runs (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id      UUID NOT NULL,
        rule_id        UUID REFERENCES financial_category_rules(id) ON DELETE SET NULL,
        category_id    UUID REFERENCES financial_categories(id) ON DELETE SET NULL,
        context        JSONB NOT NULL DEFAULT '{}'::jsonb,
        result         JSONB NOT NULL DEFAULT '{}'::jsonb,
        matched        BOOLEAN NOT NULL DEFAULT false,
        created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_financial_category_rule_runs_rule ON financial_category_rule_runs (tenant_id, rule_id, created_at DESC);
    `);

    await qr.query(`
      ALTER TABLE transactions
        ADD COLUMN IF NOT EXISTS financial_category_id UUID,
        ADD COLUMN IF NOT EXISTS financial_category_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb;
      CREATE INDEX IF NOT EXISTS idx_transactions_financial_category ON transactions (tenant_id, financial_category_id);
    `);

    await this.seedDefaults(qr);

    for (const table of [
      'financial_categories',
      'financial_centers',
      'financial_category_centers',
      'financial_category_links',
      'financial_category_rules',
      'financial_category_audit_logs',
      'financial_category_favorites',
      'financial_category_templates',
      'financial_category_rule_runs',
    ]) {
      await qr.query(`
        ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;
        ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_${table} ON ${table};
        CREATE POLICY tenant_isolation_${table} ON ${table}
          USING (tenant_id::text = current_setting('app.current_tenant_id', true))
          WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true));
      `);
    }

  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE transactions
        DROP COLUMN IF EXISTS financial_category_snapshot,
        DROP COLUMN IF EXISTS financial_category_id;
    `);
    await qr.query(`DROP TABLE IF EXISTS financial_category_rule_runs;`);
    await qr.query(`DROP TABLE IF EXISTS financial_category_templates;`);
    await qr.query(`DROP TABLE IF EXISTS financial_category_favorites;`);
    await qr.query(`DROP TABLE IF EXISTS financial_category_audit_logs;`);
    await qr.query(`DROP TABLE IF EXISTS financial_category_rules;`);
    await qr.query(`DROP TABLE IF EXISTS financial_category_links;`);
    await qr.query(`DROP TABLE IF EXISTS financial_category_centers;`);
    await qr.query(`DROP TABLE IF EXISTS financial_centers;`);
    await qr.query(`DROP TABLE IF EXISTS financial_categories;`);
  }

  private async seedDefaults(qr: QueryRunner): Promise<void> {
    await qr.query(`
      WITH tenant_scope AS (
        SELECT id AS tenant_id FROM tenants WHERE deleted_at IS NULL
      ),
      roots(label, slug, code, type, color, icon, ord) AS (
        VALUES
          ('Receitas','receitas','REV','REVENUE','#16a34a','TrendingUp',10),
          ('Despesas','despesas','EXP','EXPENSE','#dc2626','TrendingDown',20),
          ('Investimentos','investimentos','INV','INVESTMENT','#7c3aed','Landmark',30),
          ('Impostos','impostos','TAX','TAX','#f59e0b','Receipt',40),
          ('Transferências','transferencias','TRF','TRANSFER','#2563eb','RefreshCw',50)
      ),
      inserted_roots AS (
        INSERT INTO financial_categories (
          tenant_id, parent_id, path, depth_level, tree_order, name, slug, code,
          color, icon, transaction_types, category_kind, system_category, protected, sort_order
        )
        SELECT tenant_id, NULL, '/' || slug, 0, ord, label, slug, code, color, icon, ARRAY[type]::TEXT[], 'accounting', true, true, ord
        FROM tenant_scope CROSS JOIN roots
        ON CONFLICT DO NOTHING
        RETURNING id, tenant_id, slug
      )
      SELECT 1;
    `);

    await qr.query(`
      WITH roots AS (
        SELECT id, tenant_id, slug FROM financial_categories WHERE parent_id IS NULL AND system_category = true
      ),
      nodes(root_slug, name, slug, code, type, ord, icon) AS (
        VALUES
          ('receitas','Streaming','streaming','REV-STR','REVENUE',10,'Radio'),
          ('streaming','Spotify','spotify','REV-STR-SPOT','REVENUE',10,'Music'),
          ('streaming','Deezer','deezer','REV-STR-DEEZ','REVENUE',20,'Music'),
          ('streaming','Apple Music','apple-music','REV-STR-APPL','REVENUE',30,'Music'),
          ('receitas','Shows','shows','REV-SHW','REVENUE',20,'Mic2'),
          ('shows','Cachê','cache','REV-SHW-CACH','REVENUE',10,'Wallet'),
          ('shows','Participação','participacao','REV-SHW-PART','REVENUE',20,'Percent'),
          ('receitas','Royalties','royalties','REV-ROY','REVENUE',30,'BadgeDollarSign'),
          ('receitas','Licenciamento','licenciamento','REV-LIC','REVENUE',40,'FileCheck'),
          ('receitas','Publicidade','publicidade','REV-PUB','REVENUE',50,'Megaphone'),
          ('despesas','Marketing','marketing','EXP-MKT','EXPENSE',10,'Megaphone'),
          ('marketing','Meta Ads','meta-ads','EXP-MKT-META','EXPENSE',10,'Target'),
          ('marketing','Google Ads','google-ads','EXP-MKT-GOOG','EXPENSE',20,'Search'),
          ('marketing','Influenciadores','influenciadores','EXP-MKT-INF','EXPENSE',30,'Users'),
          ('despesas','Operacional','operacional','EXP-OPR','EXPENSE',20,'Settings'),
          ('operacional','Transporte','transporte','EXP-OPR-TRAN','EXPENSE',10,'Truck'),
          ('operacional','Alimentação','alimentacao','EXP-OPR-ALIM','EXPENSE',20,'Utensils'),
          ('operacional','Hospedagem','hospedagem','EXP-OPR-HOSP','EXPENSE',30,'Hotel'),
          ('despesas','Produção','producao','EXP-PROD','EXPENSE',30,'SlidersHorizontal'),
          ('despesas','Jurídico','juridico','EXP-JUR','EXPENSE',40,'Scale'),
          ('despesas','Distribuição','distribuicao','EXP-DIST','EXPENSE',50,'Package'),
          ('investimentos','Equipamentos','equipamentos','INV-EQP','INVESTMENT',10,'Briefcase'),
          ('investimentos','Expansão','expansao','INV-EXP','INVESTMENT',20,'Rocket'),
          ('investimentos','Produção Musical','producao-musical','INV-PRODM','INVESTMENT',30,'Music'),
          ('impostos','DAS','das','TAX-DAS','TAX',10,'Receipt'),
          ('impostos','ISS','iss','TAX-ISS','TAX',20,'Receipt'),
          ('impostos','IRPJ','irpj','TAX-IRPJ','TAX',30,'Receipt'),
          ('impostos','Simples Nacional','simples-nacional','TAX-SIMP','TAX',40,'Receipt'),
          ('transferencias','Entre contas','entre-contas','TRF-ACC','TRANSFER',10,'RefreshCw'),
          ('transferencias','Caixa interno','caixa-interno','TRF-CASH','TRANSFER',20,'Wallet'),
          ('transferencias','Repasses','repasses','TRF-REP','TRANSFER',30,'Send')
      ),
      recursive_seed AS (
        SELECT n.*, r.id AS parent_id, r.tenant_id, ('/' || r.slug || '/' || n.slug) AS path, 1 AS depth
        FROM nodes n JOIN roots r ON r.slug = n.root_slug
        WHERE n.root_slug IN ('receitas','despesas','investimentos','impostos','transferencias')
      )
      INSERT INTO financial_categories (
        tenant_id, parent_id, path, depth_level, tree_order, name, slug, code,
        icon, transaction_types, category_kind, system_category, protected, sort_order
      )
      SELECT tenant_id, parent_id, path, depth, ord, name, slug, code, icon, ARRAY[type]::TEXT[], 'operational', true, true, ord
      FROM recursive_seed
      ON CONFLICT DO NOTHING;
    `);

    await qr.query(`
      WITH parents AS (
        SELECT id, tenant_id, slug, path, depth_level FROM financial_categories WHERE deleted_at IS NULL
      ),
      child_nodes(parent_slug, name, slug, code, type, ord, icon) AS (
        VALUES
          ('streaming','Spotify','spotify','REV-STR-SPOT','REVENUE',10,'Music'),
          ('streaming','Deezer','deezer','REV-STR-DEEZ','REVENUE',20,'Music'),
          ('streaming','Apple Music','apple-music','REV-STR-APPL','REVENUE',30,'Music'),
          ('shows','Cachê','cache','REV-SHW-CACH','REVENUE',10,'Wallet'),
          ('shows','Participação','participacao','REV-SHW-PART','REVENUE',20,'Percent'),
          ('marketing','Meta Ads','meta-ads','EXP-MKT-META','EXPENSE',10,'Target'),
          ('marketing','Google Ads','google-ads','EXP-MKT-GOOG','EXPENSE',20,'Search'),
          ('marketing','Influenciadores','influenciadores','EXP-MKT-INF','EXPENSE',30,'Users'),
          ('operacional','Transporte','transporte','EXP-OPR-TRAN','EXPENSE',10,'Truck'),
          ('operacional','Alimentação','alimentacao','EXP-OPR-ALIM','EXPENSE',20,'Utensils'),
          ('operacional','Hospedagem','hospedagem','EXP-OPR-HOSP','EXPENSE',30,'Hotel')
      )
      INSERT INTO financial_categories (
        tenant_id, parent_id, path, depth_level, tree_order, name, slug, code,
        icon, transaction_types, category_kind, system_category, protected, sort_order
      )
      SELECT p.tenant_id, p.id, p.path || '/' || c.slug, p.depth_level + 1, c.ord, c.name, c.slug, c.code,
             c.icon, ARRAY[c.type]::TEXT[], 'operational', true, true, c.ord
      FROM child_nodes c JOIN parents p ON p.slug = c.parent_slug
      ON CONFLICT DO NOTHING;
    `);

    await qr.query(`
      WITH tenant_scope AS (SELECT id AS tenant_id FROM tenants WHERE deleted_at IS NULL),
      centers(name, slug, code, type, color, icon) AS (
        VALUES
          ('Marketing','marketing','CC-MKT','COST_CENTER','#7c3aed','Megaphone'),
          ('Produção','producao','CC-PROD','COST_CENTER','#0891b2','SlidersHorizontal'),
          ('Operacional','operacional','CC-OPR','COST_CENTER','#475569','Settings'),
          ('Administrativo','administrativo','CC-ADM','COST_CENTER','#64748b','Building2'),
          ('Comercial','comercial','CC-COM','COST_CENTER','#16a34a','Handshake'),
          ('Jurídico','juridico','CC-JUR','COST_CENTER','#dc2626','Scale'),
          ('Shows','shows','RC-SHW','REVENUE_CENTER','#2563eb','Mic2'),
          ('Streaming','streaming','RC-STR','REVENUE_CENTER','#16a34a','Radio'),
          ('Royalties','royalties','RC-ROY','REVENUE_CENTER','#f59e0b','BadgeDollarSign'),
          ('Licenciamento','licenciamento','RC-LIC','REVENUE_CENTER','#0f766e','FileCheck'),
          ('Publicidade','publicidade','RC-PUB','REVENUE_CENTER','#db2777','Megaphone')
      )
      INSERT INTO financial_centers (tenant_id, name, slug, code, type, color, icon, system_center)
      SELECT tenant_id, name, slug, code, type, color, icon, true FROM tenant_scope CROSS JOIN centers
      ON CONFLICT DO NOTHING;
    `);

    await qr.query(`
      INSERT INTO financial_category_rules (tenant_id, category_id, name, priority, conditions, actions, active, created_by)
      SELECT c.tenant_id, c.id, 'FACEBK para Meta Ads', 10,
             '{"description_contains":["FACEBK","META ADS","FACEBOOK"]}'::jsonb,
             jsonb_build_object('category_id', c.id, 'confidence', 0.94),
             true, 'system'
      FROM financial_categories c WHERE c.code = 'EXP-MKT-META'
      ON CONFLICT DO NOTHING;

      INSERT INTO financial_category_rules (tenant_id, category_id, name, priority, conditions, actions, active, created_by)
      SELECT c.tenant_id, c.id, 'Spotify para Streaming', 20,
             '{"entity_text":["Spotify"],"description_contains":["SPOTIFY"]}'::jsonb,
             jsonb_build_object('category_id', c.id, 'confidence', 0.92),
             true, 'system'
      FROM financial_categories c WHERE c.code = 'REV-STR'
      ON CONFLICT DO NOTHING;
    `);
  }
}
