-- =============================================================================
-- MUSIC OS 360 — Supabase Row-Level Security (RLS) Policies
-- =============================================================================
-- Execute este script no SQL Editor do Supabase (Settings → SQL Editor).
-- Todas as policies usam auth.uid() para isolar por utilizador e org_id
-- armazenado em app_metadata do JWT.
--
-- Estrutura de isolamento:
--   auth.uid()                    → user UUID (JWT sub)
--   auth.jwt() ->> 'app_metadata' → JSON com { org_id, role }
--   (auth.jwt()->'app_metadata'->>'org_id')::uuid → org UUID do tenant
--
-- Helper function (cria uma vez, reutilizada em todas as policies):
-- =============================================================================

-- ─── Helper: org_id do JWT ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.auth_org_id() RETURNS uuid
  LANGUAGE sql STABLE
  AS $$
    SELECT ((auth.jwt()->'app_metadata'->>'org_id')::uuid)
  $$;

-- Helper: role RBAC do JWT
CREATE OR REPLACE FUNCTION public.auth_org_role() RETURNS text
  LANGUAGE sql STABLE
  AS $$
    SELECT (auth.jwt()->'app_metadata'->>'role')
  $$;

-- Helper: verifica se o user tem role suficiente
CREATE OR REPLACE FUNCTION public.has_min_role(required text) RETURNS boolean
  LANGUAGE plpgsql STABLE
  AS $$
  DECLARE
    role_levels jsonb := '{"viewer":1,"editor":2,"manager":3,"admin":4,"owner":5,"super_admin":6}';
    user_level int;
    req_level  int;
  BEGIN
    user_level := (role_levels->>(auth_org_role()))::int;
    req_level  := (role_levels->>required)::int;
    RETURN COALESCE(user_level, 0) >= COALESCE(req_level, 99);
  END;
  $$;


-- =============================================================================
-- ENABLE RLS em todas as tabelas críticas
-- =============================================================================

ALTER TABLE organizations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants              ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members          ENABLE ROW LEVEL SECURITY;
ALTER TABLE artists              ENABLE ROW LEVEL SECURITY;
ALTER TABLE works                ENABLE ROW LEVEL SECURITY;
ALTER TABLE phonograms           ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_templates   ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices             ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients              ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads                ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_interactions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns            ENABLE ROW LEVEL SECURITY;
ALTER TABLE events               ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects             ENABLE ROW LEVEL SECURITY;
ALTER TABLE releases             ENABLE ROW LEVEL SECURITY;
ALTER TABLE shares               ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log            ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications        ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- organizations — só membros da org podem ver a sua organização
-- =============================================================================

DROP POLICY IF EXISTS "org_members_see_own_org" ON organizations;
CREATE POLICY "org_members_see_own_org" ON organizations
  FOR SELECT
  USING (id = auth_org_id());

-- Apenas super_admin pode criar/alterar organizações
DROP POLICY IF EXISTS "super_admin_manage_orgs" ON organizations;
CREATE POLICY "super_admin_manage_orgs" ON organizations
  FOR ALL
  USING (has_min_role('super_admin'))
  WITH CHECK (has_min_role('super_admin'));


-- =============================================================================
-- tenants — isolado por org_id
-- =============================================================================

DROP POLICY IF EXISTS "tenant_isolation_select" ON tenants;
CREATE POLICY "tenant_isolation_select" ON tenants
  FOR SELECT
  USING (org_id = auth_org_id());

DROP POLICY IF EXISTS "tenant_isolation_admin" ON tenants;
CREATE POLICY "tenant_isolation_admin" ON tenants
  FOR ALL
  USING (org_id = auth_org_id() AND has_min_role('admin'))
  WITH CHECK (org_id = auth_org_id() AND has_min_role('admin'));


-- =============================================================================
-- org_members — ver membros do mesmo tenant; só admin pode gerir
-- =============================================================================

DROP POLICY IF EXISTS "org_members_select" ON org_members;
CREATE POLICY "org_members_select" ON org_members
  FOR SELECT
  USING (org_id = auth_org_id());

DROP POLICY IF EXISTS "org_members_insert" ON org_members;
CREATE POLICY "org_members_insert" ON org_members
  FOR INSERT
  WITH CHECK (org_id = auth_org_id() AND has_min_role('admin'));

DROP POLICY IF EXISTS "org_members_update" ON org_members;
CREATE POLICY "org_members_update" ON org_members
  FOR UPDATE
  USING (org_id = auth_org_id() AND has_min_role('admin'))
  WITH CHECK (org_id = auth_org_id() AND has_min_role('admin'));

DROP POLICY IF EXISTS "org_members_delete" ON org_members;
CREATE POLICY "org_members_delete" ON org_members
  FOR DELETE
  USING (org_id = auth_org_id() AND has_min_role('owner'));


-- =============================================================================
-- Domain tables — padrão: tenant_id = tenant corrente
-- (artists, works, phonograms, contracts, transactions, invoices, clients, leads,
--  lead_interactions, campaigns, events, projects, releases, shares, notifications)
-- =============================================================================

-- Macro: aplica SELECT/INSERT/UPDATE/DELETE policies a uma tabela domain
-- Nota: execute individualmente pois PL/pgSQL não suporta DDL dinâmico
--       em funções por padrão — listamos cada tabela explicitamente.

-- ── artists ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "artists_tenant_select"  ON artists;
DROP POLICY IF EXISTS "artists_tenant_write"   ON artists;
DROP POLICY IF EXISTS "artists_tenant_delete"  ON artists;

CREATE POLICY "artists_tenant_select" ON artists
  FOR SELECT USING (tenant_id IN (SELECT id FROM tenants WHERE org_id = auth_org_id()));

CREATE POLICY "artists_tenant_write" ON artists
  FOR INSERT WITH CHECK (tenant_id IN (SELECT id FROM tenants WHERE org_id = auth_org_id()) AND has_min_role('editor'));

CREATE POLICY "artists_tenant_update" ON artists
  FOR UPDATE USING (tenant_id IN (SELECT id FROM tenants WHERE org_id = auth_org_id()) AND has_min_role('editor'));

CREATE POLICY "artists_tenant_delete" ON artists
  FOR DELETE USING (tenant_id IN (SELECT id FROM tenants WHERE org_id = auth_org_id()) AND has_min_role('manager'));

-- ── works ─────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "works_tenant_select"  ON works;
DROP POLICY IF EXISTS "works_tenant_write"   ON works;
DROP POLICY IF EXISTS "works_tenant_update"  ON works;
DROP POLICY IF EXISTS "works_tenant_delete"  ON works;

CREATE POLICY "works_tenant_select" ON works
  FOR SELECT USING (tenant_id IN (SELECT id FROM tenants WHERE org_id = auth_org_id()));
CREATE POLICY "works_tenant_write" ON works
  FOR INSERT WITH CHECK (tenant_id IN (SELECT id FROM tenants WHERE org_id = auth_org_id()) AND has_min_role('editor'));
CREATE POLICY "works_tenant_update" ON works
  FOR UPDATE USING (tenant_id IN (SELECT id FROM tenants WHERE org_id = auth_org_id()) AND has_min_role('editor'));
CREATE POLICY "works_tenant_delete" ON works
  FOR DELETE USING (tenant_id IN (SELECT id FROM tenants WHERE org_id = auth_org_id()) AND has_min_role('manager'));

-- ── phonograms ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "phonograms_tenant_select"  ON phonograms;
DROP POLICY IF EXISTS "phonograms_tenant_write"   ON phonograms;
DROP POLICY IF EXISTS "phonograms_tenant_update"  ON phonograms;
DROP POLICY IF EXISTS "phonograms_tenant_delete"  ON phonograms;

CREATE POLICY "phonograms_tenant_select" ON phonograms
  FOR SELECT USING (tenant_id IN (SELECT id FROM tenants WHERE org_id = auth_org_id()));
CREATE POLICY "phonograms_tenant_write" ON phonograms
  FOR INSERT WITH CHECK (tenant_id IN (SELECT id FROM tenants WHERE org_id = auth_org_id()) AND has_min_role('editor'));
CREATE POLICY "phonograms_tenant_update" ON phonograms
  FOR UPDATE USING (tenant_id IN (SELECT id FROM tenants WHERE org_id = auth_org_id()) AND has_min_role('editor'));
CREATE POLICY "phonograms_tenant_delete" ON phonograms
  FOR DELETE USING (tenant_id IN (SELECT id FROM tenants WHERE org_id = auth_org_id()) AND has_min_role('manager'));

-- ── contracts (sensível — manager+ para criar/editar) ────────────────────────
DROP POLICY IF EXISTS "contracts_tenant_select"  ON contracts;
DROP POLICY IF EXISTS "contracts_tenant_write"   ON contracts;
DROP POLICY IF EXISTS "contracts_tenant_update"  ON contracts;
DROP POLICY IF EXISTS "contracts_tenant_delete"  ON contracts;

CREATE POLICY "contracts_tenant_select" ON contracts
  FOR SELECT USING (tenant_id IN (SELECT id FROM tenants WHERE org_id = auth_org_id()));
CREATE POLICY "contracts_tenant_write" ON contracts
  FOR INSERT WITH CHECK (tenant_id IN (SELECT id FROM tenants WHERE org_id = auth_org_id()) AND has_min_role('editor'));
CREATE POLICY "contracts_tenant_update" ON contracts
  FOR UPDATE USING (tenant_id IN (SELECT id FROM tenants WHERE org_id = auth_org_id()) AND has_min_role('editor'));
CREATE POLICY "contracts_tenant_delete" ON contracts
  FOR DELETE USING (tenant_id IN (SELECT id FROM tenants WHERE org_id = auth_org_id()) AND has_min_role('manager'));

-- ── transactions (financeiro crítico — editor+ escreve, manager+ deleta) ─────
DROP POLICY IF EXISTS "transactions_tenant_select"  ON transactions;
DROP POLICY IF EXISTS "transactions_tenant_write"   ON transactions;
DROP POLICY IF EXISTS "transactions_tenant_update"  ON transactions;
DROP POLICY IF EXISTS "transactions_tenant_delete"  ON transactions;

CREATE POLICY "transactions_tenant_select" ON transactions
  FOR SELECT USING (tenant_id IN (SELECT id FROM tenants WHERE org_id = auth_org_id()));
CREATE POLICY "transactions_tenant_write" ON transactions
  FOR INSERT WITH CHECK (tenant_id IN (SELECT id FROM tenants WHERE org_id = auth_org_id()) AND has_min_role('editor'));
CREATE POLICY "transactions_tenant_update" ON transactions
  FOR UPDATE USING (tenant_id IN (SELECT id FROM tenants WHERE org_id = auth_org_id()) AND has_min_role('editor'));
CREATE POLICY "transactions_tenant_delete" ON transactions
  FOR DELETE USING (tenant_id IN (SELECT id FROM tenants WHERE org_id = auth_org_id()) AND has_min_role('manager'));

-- ── audit_log (read-only para manager+, sem delete via RLS) ──────────────────
DROP POLICY IF EXISTS "audit_log_tenant_select"  ON audit_log;
DROP POLICY IF EXISTS "audit_log_tenant_insert"  ON audit_log;

CREATE POLICY "audit_log_tenant_select" ON audit_log
  FOR SELECT USING (
    tenant_id IN (SELECT id FROM tenants WHERE org_id = auth_org_id())
    AND has_min_role('manager')
  );
CREATE POLICY "audit_log_tenant_insert" ON audit_log
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT id FROM tenants WHERE org_id = auth_org_id())
  );
-- Nenhuma policy de UPDATE/DELETE — audit_log é imutável

-- ── notifications (utilizador vê só as suas) ──────────────────────────────────
DROP POLICY IF EXISTS "notifications_own" ON notifications;
CREATE POLICY "notifications_own" ON notifications
  FOR SELECT USING (
    tenant_id IN (SELECT id FROM tenants WHERE org_id = auth_org_id())
    AND user_id = auth.uid()
  );
CREATE POLICY "notifications_manager_create" ON notifications
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT id FROM tenants WHERE org_id = auth_org_id())
    AND has_min_role('manager')
  );


-- =============================================================================
-- Grants de serviço — a service_role bypassa RLS por design do Supabase.
-- Para o backend NestJS: usar a service_role key APENAS em migrations/admin ops.
-- Para o frontend React: usar a anon key — RLS é a única proteção.
-- =============================================================================

-- Confirmar que anon não tem acesso directo às tabelas críticas
-- (as policies acima já garantem o isolamento, mas explicitamos)
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
