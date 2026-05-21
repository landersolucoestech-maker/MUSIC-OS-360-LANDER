-- Migration: inventory_items, licenses, financial_rules
-- Run this in Supabase SQL Editor (or via migration pipeline)

-- ── inventory_items ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_items (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome            VARCHAR(255) NOT NULL,
  categoria       VARCHAR(100),
  quantidade      INTEGER      NOT NULL DEFAULT 0,
  valor_unitario  NUMERIC(15,2),
  localizacao     VARCHAR(255),
  status          VARCHAR(50)  NOT NULL DEFAULT 'disponivel',
  responsavel     VARCHAR(255),
  setor           VARCHAR(100),
  data_entrada    DATE,
  observacoes     TEXT,
  created_by      UUID,
  updated_by      UUID,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_tenant ON inventory_items(tenant_id) WHERE deleted_at IS NULL;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON inventory_items
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

-- ── licenses ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS licenses (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  titulo       VARCHAR(255) NOT NULL,
  obra_id      UUID,
  cliente_id   UUID,
  tipo         VARCHAR(100),
  tipo_uso     VARCHAR(100),
  status       VARCHAR(50)  NOT NULL DEFAULT 'ativo',
  data_inicio  DATE,
  data_fim     DATE,
  valor        NUMERIC(15,2),
  observacoes  TEXT,
  created_by   UUID,
  updated_by   UUID,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  deleted_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_licenses_tenant ON licenses(tenant_id) WHERE deleted_at IS NULL;
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON licenses
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

-- ── financial_rules ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS financial_rules (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome        VARCHAR(255) NOT NULL,
  tipo        VARCHAR(50)  NOT NULL,
  categoria   VARCHAR(100),
  calculo     VARCHAR(50)  NOT NULL,
  valor       NUMERIC(15,4) NOT NULL,
  descricao   TEXT,
  ativo       BOOLEAN      NOT NULL DEFAULT true,
  condicoes   JSONB,
  created_by  UUID,
  updated_by  UUID,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_financial_rules_tenant ON financial_rules(tenant_id) WHERE deleted_at IS NULL;
ALTER TABLE financial_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON financial_rules
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);
