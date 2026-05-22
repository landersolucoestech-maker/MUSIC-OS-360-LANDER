import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InventoryLicensingFinancialRules20260521000060 implements MigrationInterface {
  name = 'InventoryLicensingFinancialRules20260521000060';

  async up(qr: QueryRunner): Promise<void> {
    // ── inventory_items ───────────────────────────────────────────────────────
    await qr.query(`
      CREATE TABLE IF NOT EXISTS inventory_items (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id       UUID NOT NULL,
        nome            VARCHAR(255) NOT NULL,
        categoria       VARCHAR(100),
        quantidade      INTEGER NOT NULL DEFAULT 0,
        valor_unitario  DECIMAL(14,2),
        localizacao     VARCHAR(255),
        status          VARCHAR(50) NOT NULL DEFAULT 'disponivel',
        responsavel     VARCHAR(255),
        setor                VARCHAR(100),
        data_entrada         DATE,
        local_compra         VARCHAR(255),
        numero_nota_fiscal   VARCHAR(100),
        observacoes          TEXT,
        created_by      VARCHAR(255),
        updated_by      VARCHAR(255),
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at      TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS idx_inventory_items_tenant          ON inventory_items (tenant_id);
      CREATE INDEX IF NOT EXISTS idx_inventory_items_tenant_cat      ON inventory_items (tenant_id, categoria);
      CREATE INDEX IF NOT EXISTS idx_inventory_items_tenant_status   ON inventory_items (tenant_id, status);
      CREATE INDEX IF NOT EXISTS idx_inventory_items_tenant_deleted  ON inventory_items (tenant_id, deleted_at);
    `);

    // ── licenses ──────────────────────────────────────────────────────────────
    await qr.query(`
      CREATE TABLE IF NOT EXISTS licenses (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id      UUID NOT NULL,
        titulo         VARCHAR(500) NOT NULL,
        obra_id        UUID,
        obra_musical   VARCHAR(255),
        artista        VARCHAR(255),
        cliente_id     UUID,
        cliente        VARCHAR(255),
        projeto        VARCHAR(255),
        tipo           VARCHAR(100),
        tipo_uso       VARCHAR(255),
        midia_destino  VARCHAR(255),
        territorio     VARCHAR(150),
        status         VARCHAR(50) NOT NULL DEFAULT 'pendente',
        data_inicio    DATE,
        data_fim       DATE,
        valor          DECIMAL(14,2),
        moeda          VARCHAR(10) NOT NULL DEFAULT 'BRL',
        observacoes    TEXT,
        created_by     VARCHAR(255),
        updated_by     VARCHAR(255),
        created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at     TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS idx_licenses_tenant         ON licenses (tenant_id);
      CREATE INDEX IF NOT EXISTS idx_licenses_tenant_status  ON licenses (tenant_id, status);
      CREATE INDEX IF NOT EXISTS idx_licenses_tenant_obra    ON licenses (tenant_id, obra_id);
      CREATE INDEX IF NOT EXISTS idx_licenses_tenant_deleted ON licenses (tenant_id, deleted_at);
    `);

    // ── financial_rules ───────────────────────────────────────────────────────
    await qr.query(`
      CREATE TABLE IF NOT EXISTS financial_rules (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id   UUID NOT NULL,
        nome        VARCHAR(255) NOT NULL,
        tipo        VARCHAR(100) NOT NULL,
        categoria   VARCHAR(100),
        calculo     VARCHAR(50) NOT NULL DEFAULT 'percentual',
        valor       DECIMAL(10,4) NOT NULL DEFAULT 0,
        descricao   TEXT,
        ativo       BOOLEAN NOT NULL DEFAULT true,
        condicoes   JSONB NOT NULL DEFAULT '{}',
        created_by  VARCHAR(255),
        updated_by  VARCHAR(255),
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at  TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS idx_financial_rules_tenant         ON financial_rules (tenant_id);
      CREATE INDEX IF NOT EXISTS idx_financial_rules_tenant_tipo    ON financial_rules (tenant_id, tipo);
      CREATE INDEX IF NOT EXISTS idx_financial_rules_tenant_ativo   ON financial_rules (tenant_id, ativo);
      CREATE INDEX IF NOT EXISTS idx_financial_rules_tenant_deleted ON financial_rules (tenant_id, deleted_at);
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS financial_rules;`);
    await qr.query(`DROP TABLE IF EXISTS licenses;`);
    await qr.query(`DROP TABLE IF EXISTS inventory_items;`);
  }
}
