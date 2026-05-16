-- =============================================================================
-- MUSIC OS 360 — Supabase Row-Level Security (RLS) Policies
-- =============================================================================
-- Execute este script no SQL Editor do Supabase (Settings → SQL Editor).
--
-- SEGURANÇA: cada bloco usa EXCEPTION WHEN undefined_table para ignorar
-- tabelas ainda não criadas — o script é idempotente e pode ser re-executado
-- após cada migration sem erros.
--
-- Estrutura de isolamento JWT:
--   auth.uid()                              → user UUID (sub)
--   auth.jwt()->'app_metadata'->>'org_id'   → UUID da organização do tenant
--   auth.jwt()->'app_metadata'->>'role'     → role RBAC do utilizador
-- =============================================================================


-- =============================================================================
-- PASSO 1 — Helper functions (sempre criadas, não dependem de tabelas)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.auth_org_id()
  RETURNS uuid LANGUAGE sql STABLE AS
$$
  SELECT ((auth.jwt()->'app_metadata'->>'org_id')::uuid)
$$;

CREATE OR REPLACE FUNCTION public.auth_org_role()
  RETURNS text LANGUAGE sql STABLE AS
$$
  SELECT (auth.jwt()->'app_metadata'->>'role')
$$;

CREATE OR REPLACE FUNCTION public.has_min_role(required text)
  RETURNS boolean LANGUAGE plpgsql STABLE AS
$$
DECLARE
  role_levels jsonb := '{"viewer":1,"editor":2,"manager":3,"admin":4,"owner":5,"super_admin":6}';
  user_level  int;
  req_level   int;
BEGIN
  user_level := (role_levels->>(public.auth_org_role()))::int;
  req_level  := (role_levels->>required)::int;
  RETURN COALESCE(user_level, 0) >= COALESCE(req_level, 99);
END;
$$;


-- =============================================================================
-- PASSO 2 — Helper interno: habilita RLS + cria policies por tabela
-- Cada bloco é independente — tabelas inexistentes geram NOTICE, não erro.
-- =============================================================================


-- ── organizations ─────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "musicos360_org_select"       ON public.organizations;
  DROP POLICY IF EXISTS "musicos360_org_super_admin"  ON public.organizations;
  CREATE POLICY "musicos360_org_select" ON public.organizations
    FOR SELECT USING (id = public.auth_org_id());
  CREATE POLICY "musicos360_org_super_admin" ON public.organizations
    FOR ALL
    USING      (public.has_min_role('super_admin'))
    WITH CHECK (public.has_min_role('super_admin'));
  RAISE NOTICE 'RLS aplicado: organizations';
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'SKIP: tabela organizations não existe ainda';
END $$;


-- ── tenants ───────────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "musicos360_tenant_select" ON public.tenants;
  DROP POLICY IF EXISTS "musicos360_tenant_admin"  ON public.tenants;
  CREATE POLICY "musicos360_tenant_select" ON public.tenants
    FOR SELECT USING (org_id = public.auth_org_id());
  CREATE POLICY "musicos360_tenant_admin" ON public.tenants
    FOR ALL
    USING      (org_id = public.auth_org_id() AND public.has_min_role('admin'))
    WITH CHECK (org_id = public.auth_org_id() AND public.has_min_role('admin'));
  RAISE NOTICE 'RLS aplicado: tenants';
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'SKIP: tabela tenants não existe ainda';
END $$;


-- ── org_members ───────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "musicos360_member_select" ON public.org_members;
  DROP POLICY IF EXISTS "musicos360_member_insert" ON public.org_members;
  DROP POLICY IF EXISTS "musicos360_member_update" ON public.org_members;
  DROP POLICY IF EXISTS "musicos360_member_delete" ON public.org_members;
  CREATE POLICY "musicos360_member_select" ON public.org_members
    FOR SELECT USING (org_id = public.auth_org_id());
  CREATE POLICY "musicos360_member_insert" ON public.org_members
    FOR INSERT WITH CHECK (org_id = public.auth_org_id() AND public.has_min_role('admin'));
  CREATE POLICY "musicos360_member_update" ON public.org_members
    FOR UPDATE
    USING      (org_id = public.auth_org_id() AND public.has_min_role('admin'))
    WITH CHECK (org_id = public.auth_org_id() AND public.has_min_role('admin'));
  CREATE POLICY "musicos360_member_delete" ON public.org_members
    FOR DELETE USING (org_id = public.auth_org_id() AND public.has_min_role('owner'));
  RAISE NOTICE 'RLS aplicado: org_members';
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'SKIP: tabela org_members não existe ainda';
END $$;


-- ── artists ───────────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "musicos360_artists_select" ON public.artists;
  DROP POLICY IF EXISTS "musicos360_artists_insert" ON public.artists;
  DROP POLICY IF EXISTS "musicos360_artists_update" ON public.artists;
  DROP POLICY IF EXISTS "musicos360_artists_delete" ON public.artists;
  CREATE POLICY "musicos360_artists_select" ON public.artists
    FOR SELECT USING (tenant_id IN (SELECT id FROM public.tenants WHERE org_id = public.auth_org_id()));
  CREATE POLICY "musicos360_artists_insert" ON public.artists
    FOR INSERT WITH CHECK (tenant_id IN (SELECT id FROM public.tenants WHERE org_id = public.auth_org_id()) AND public.has_min_role('editor'));
  CREATE POLICY "musicos360_artists_update" ON public.artists
    FOR UPDATE USING (tenant_id IN (SELECT id FROM public.tenants WHERE org_id = public.auth_org_id()) AND public.has_min_role('editor'));
  CREATE POLICY "musicos360_artists_delete" ON public.artists
    FOR DELETE USING (tenant_id IN (SELECT id FROM public.tenants WHERE org_id = public.auth_org_id()) AND public.has_min_role('manager'));
  RAISE NOTICE 'RLS aplicado: artists';
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'SKIP: tabela artists não existe ainda';
END $$;


-- ── works ─────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.works ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "musicos360_works_select" ON public.works;
  DROP POLICY IF EXISTS "musicos360_works_insert" ON public.works;
  DROP POLICY IF EXISTS "musicos360_works_update" ON public.works;
  DROP POLICY IF EXISTS "musicos360_works_delete" ON public.works;
  CREATE POLICY "musicos360_works_select" ON public.works
    FOR SELECT USING (tenant_id IN (SELECT id FROM public.tenants WHERE org_id = public.auth_org_id()));
  CREATE POLICY "musicos360_works_insert" ON public.works
    FOR INSERT WITH CHECK (tenant_id IN (SELECT id FROM public.tenants WHERE org_id = public.auth_org_id()) AND public.has_min_role('editor'));
  CREATE POLICY "musicos360_works_update" ON public.works
    FOR UPDATE USING (tenant_id IN (SELECT id FROM public.tenants WHERE org_id = public.auth_org_id()) AND public.has_min_role('editor'));
  CREATE POLICY "musicos360_works_delete" ON public.works
    FOR DELETE USING (tenant_id IN (SELECT id FROM public.tenants WHERE org_id = public.auth_org_id()) AND public.has_min_role('manager'));
  RAISE NOTICE 'RLS aplicado: works';
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'SKIP: tabela works não existe ainda';
END $$;


-- ── phonograms ────────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.phonograms ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "musicos360_phonograms_select" ON public.phonograms;
  DROP POLICY IF EXISTS "musicos360_phonograms_insert" ON public.phonograms;
  DROP POLICY IF EXISTS "musicos360_phonograms_update" ON public.phonograms;
  DROP POLICY IF EXISTS "musicos360_phonograms_delete" ON public.phonograms;
  CREATE POLICY "musicos360_phonograms_select" ON public.phonograms
    FOR SELECT USING (tenant_id IN (SELECT id FROM public.tenants WHERE org_id = public.auth_org_id()));
  CREATE POLICY "musicos360_phonograms_insert" ON public.phonograms
    FOR INSERT WITH CHECK (tenant_id IN (SELECT id FROM public.tenants WHERE org_id = public.auth_org_id()) AND public.has_min_role('editor'));
  CREATE POLICY "musicos360_phonograms_update" ON public.phonograms
    FOR UPDATE USING (tenant_id IN (SELECT id FROM public.tenants WHERE org_id = public.auth_org_id()) AND public.has_min_role('editor'));
  CREATE POLICY "musicos360_phonograms_delete" ON public.phonograms
    FOR DELETE USING (tenant_id IN (SELECT id FROM public.tenants WHERE org_id = public.auth_org_id()) AND public.has_min_role('manager'));
  RAISE NOTICE 'RLS aplicado: phonograms';
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'SKIP: tabela phonograms não existe ainda';
END $$;


-- ── contracts ─────────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "musicos360_contracts_select" ON public.contracts;
  DROP POLICY IF EXISTS "musicos360_contracts_insert" ON public.contracts;
  DROP POLICY IF EXISTS "musicos360_contracts_update" ON public.contracts;
  DROP POLICY IF EXISTS "musicos360_contracts_delete" ON public.contracts;
  CREATE POLICY "musicos360_contracts_select" ON public.contracts
    FOR SELECT USING (tenant_id IN (SELECT id FROM public.tenants WHERE org_id = public.auth_org_id()));
  CREATE POLICY "musicos360_contracts_insert" ON public.contracts
    FOR INSERT WITH CHECK (tenant_id IN (SELECT id FROM public.tenants WHERE org_id = public.auth_org_id()) AND public.has_min_role('editor'));
  CREATE POLICY "musicos360_contracts_update" ON public.contracts
    FOR UPDATE USING (tenant_id IN (SELECT id FROM public.tenants WHERE org_id = public.auth_org_id()) AND public.has_min_role('editor'));
  CREATE POLICY "musicos360_contracts_delete" ON public.contracts
    FOR DELETE USING (tenant_id IN (SELECT id FROM public.tenants WHERE org_id = public.auth_org_id()) AND public.has_min_role('manager'));
  RAISE NOTICE 'RLS aplicado: contracts';
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'SKIP: tabela contracts não existe ainda';
END $$;


-- ── contract_templates ────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "musicos360_ctpl_select" ON public.contract_templates;
  DROP POLICY IF EXISTS "musicos360_ctpl_write"  ON public.contract_templates;
  DROP POLICY IF EXISTS "musicos360_ctpl_delete" ON public.contract_templates;
  CREATE POLICY "musicos360_ctpl_select" ON public.contract_templates
    FOR SELECT USING (tenant_id IN (SELECT id FROM public.tenants WHERE org_id = public.auth_org_id()));
  CREATE POLICY "musicos360_ctpl_write" ON public.contract_templates
    FOR INSERT WITH CHECK (tenant_id IN (SELECT id FROM public.tenants WHERE org_id = public.auth_org_id()) AND public.has_min_role('editor'));
  CREATE POLICY "musicos360_ctpl_delete" ON public.contract_templates
    FOR DELETE USING (tenant_id IN (SELECT id FROM public.tenants WHERE org_id = public.auth_org_id()) AND public.has_min_role('manager'));
  RAISE NOTICE 'RLS aplicado: contract_templates';
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'SKIP: tabela contract_templates não existe ainda';
END $$;


-- ── transactions ──────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "musicos360_tx_select" ON public.transactions;
  DROP POLICY IF EXISTS "musicos360_tx_insert" ON public.transactions;
  DROP POLICY IF EXISTS "musicos360_tx_update" ON public.transactions;
  DROP POLICY IF EXISTS "musicos360_tx_delete" ON public.transactions;
  CREATE POLICY "musicos360_tx_select" ON public.transactions
    FOR SELECT USING (tenant_id IN (SELECT id FROM public.tenants WHERE org_id = public.auth_org_id()));
  CREATE POLICY "musicos360_tx_insert" ON public.transactions
    FOR INSERT WITH CHECK (tenant_id IN (SELECT id FROM public.tenants WHERE org_id = public.auth_org_id()) AND public.has_min_role('editor'));
  CREATE POLICY "musicos360_tx_update" ON public.transactions
    FOR UPDATE USING (tenant_id IN (SELECT id FROM public.tenants WHERE org_id = public.auth_org_id()) AND public.has_min_role('editor'));
  CREATE POLICY "musicos360_tx_delete" ON public.transactions
    FOR DELETE USING (tenant_id IN (SELECT id FROM public.tenants WHERE org_id = public.auth_org_id()) AND public.has_min_role('manager'));
  RAISE NOTICE 'RLS aplicado: transactions';
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'SKIP: tabela transactions não existe ainda';
END $$;


-- ── invoices ──────────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "musicos360_inv_select" ON public.invoices;
  DROP POLICY IF EXISTS "musicos360_inv_insert" ON public.invoices;
  DROP POLICY IF EXISTS "musicos360_inv_update" ON public.invoices;
  DROP POLICY IF EXISTS "musicos360_inv_delete" ON public.invoices;
  CREATE POLICY "musicos360_inv_select" ON public.invoices
    FOR SELECT USING (tenant_id IN (SELECT id FROM public.tenants WHERE org_id = public.auth_org_id()));
  CREATE POLICY "musicos360_inv_insert" ON public.invoices
    FOR INSERT WITH CHECK (tenant_id IN (SELECT id FROM public.tenants WHERE org_id = public.auth_org_id()) AND public.has_min_role('editor'));
  CREATE POLICY "musicos360_inv_update" ON public.invoices
    FOR UPDATE USING (tenant_id IN (SELECT id FROM public.tenants WHERE org_id = public.auth_org_id()) AND public.has_min_role('editor'));
  CREATE POLICY "musicos360_inv_delete" ON public.invoices
    FOR DELETE USING (tenant_id IN (SELECT id FROM public.tenants WHERE org_id = public.auth_org_id()) AND public.has_min_role('manager'));
  RAISE NOTICE 'RLS aplicado: invoices';
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'SKIP: tabela invoices não existe ainda';
END $$;


-- ── clients ───────────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "musicos360_clients_select" ON public.clients;
  DROP POLICY IF EXISTS "musicos360_clients_insert" ON public.clients;
  DROP POLICY IF EXISTS "musicos360_clients_update" ON public.clients;
  DROP POLICY IF EXISTS "musicos360_clients_delete" ON public.clients;
  CREATE POLICY "musicos360_clients_select" ON public.clients
    FOR SELECT USING (tenant_id IN (SELECT id FROM public.tenants WHERE org_id = public.auth_org_id()));
  CREATE POLICY "musicos360_clients_insert" ON public.clients
    FOR INSERT WITH CHECK (tenant_id IN (SELECT id FROM public.tenants WHERE org_id = public.auth_org_id()) AND public.has_min_role('editor'));
  CREATE POLICY "musicos360_clients_update" ON public.clients
    FOR UPDATE USING (tenant_id IN (SELECT id FROM public.tenants WHERE org_id = public.auth_org_id()) AND public.has_min_role('editor'));
  CREATE POLICY "musicos360_clients_delete" ON public.clients
    FOR DELETE USING (tenant_id IN (SELECT id FROM public.tenants WHERE org_id = public.auth_org_id()) AND public.has_min_role('manager'));
  RAISE NOTICE 'RLS aplicado: clients';
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'SKIP: tabela clients não existe ainda';
END $$;


-- ── leads ─────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "musicos360_leads_select" ON public.leads;
  DROP POLICY IF EXISTS "musicos360_leads_insert" ON public.leads;
  DROP POLICY IF EXISTS "musicos360_leads_update" ON public.leads;
  DROP POLICY IF EXISTS "musicos360_leads_delete" ON public.leads;
  CREATE POLICY "musicos360_leads_select" ON public.leads
    FOR SELECT USING (tenant_id IN (SELECT id FROM public.tenants WHERE org_id = public.auth_org_id()));
  CREATE POLICY "musicos360_leads_insert" ON public.leads
    FOR INSERT WITH CHECK (tenant_id IN (SELECT id FROM public.tenants WHERE org_id = public.auth_org_id()) AND public.has_min_role('editor'));
  CREATE POLICY "musicos360_leads_update" ON public.leads
    FOR UPDATE USING (tenant_id IN (SELECT id FROM public.tenants WHERE org_id = public.auth_org_id()) AND public.has_min_role('editor'));
  CREATE POLICY "musicos360_leads_delete" ON public.leads
    FOR DELETE USING (tenant_id IN (SELECT id FROM public.tenants WHERE org_id = public.auth_org_id()) AND public.has_min_role('manager'));
  RAISE NOTICE 'RLS aplicado: leads';
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'SKIP: tabela leads não existe ainda';
END $$;


-- ── lead_interactions ─────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.lead_interactions ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "musicos360_li_select" ON public.lead_interactions;
  DROP POLICY IF EXISTS "musicos360_li_insert" ON public.lead_interactions;
  DROP POLICY IF EXISTS "musicos360_li_delete" ON public.lead_interactions;
  CREATE POLICY "musicos360_li_select" ON public.lead_interactions
    FOR SELECT USING (tenant_id IN (SELECT id FROM public.tenants WHERE org_id = public.auth_org_id()));
  CREATE POLICY "musicos360_li_insert" ON public.lead_interactions
    FOR INSERT WITH CHECK (tenant_id IN (SELECT id FROM public.tenants WHERE org_id = public.auth_org_id()) AND public.has_min_role('editor'));
  CREATE POLICY "musicos360_li_delete" ON public.lead_interactions
    FOR DELETE USING (tenant_id IN (SELECT id FROM public.tenants WHERE org_id = public.auth_org_id()) AND public.has_min_role('manager'));
  RAISE NOTICE 'RLS aplicado: lead_interactions';
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'SKIP: tabela lead_interactions não existe ainda';
END $$;


-- ── campaigns ─────────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "musicos360_camp_select" ON public.campaigns;
  DROP POLICY IF EXISTS "musicos360_camp_insert" ON public.campaigns;
  DROP POLICY IF EXISTS "musicos360_camp_update" ON public.campaigns;
  DROP POLICY IF EXISTS "musicos360_camp_delete" ON public.campaigns;
  CREATE POLICY "musicos360_camp_select" ON public.campaigns
    FOR SELECT USING (tenant_id IN (SELECT id FROM public.tenants WHERE org_id = public.auth_org_id()));
  CREATE POLICY "musicos360_camp_insert" ON public.campaigns
    FOR INSERT WITH CHECK (tenant_id IN (SELECT id FROM public.tenants WHERE org_id = public.auth_org_id()) AND public.has_min_role('editor'));
  CREATE POLICY "musicos360_camp_update" ON public.campaigns
    FOR UPDATE USING (tenant_id IN (SELECT id FROM public.tenants WHERE org_id = public.auth_org_id()) AND public.has_min_role('editor'));
  CREATE POLICY "musicos360_camp_delete" ON public.campaigns
    FOR DELETE USING (tenant_id IN (SELECT id FROM public.tenants WHERE org_id = public.auth_org_id()) AND public.has_min_role('manager'));
  RAISE NOTICE 'RLS aplicado: campaigns';
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'SKIP: tabela campaigns não existe ainda';
END $$;


-- ── events ────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "musicos360_events_select" ON public.events;
  DROP POLICY IF EXISTS "musicos360_events_insert" ON public.events;
  DROP POLICY IF EXISTS "musicos360_events_update" ON public.events;
  DROP POLICY IF EXISTS "musicos360_events_delete" ON public.events;
  CREATE POLICY "musicos360_events_select" ON public.events
    FOR SELECT USING (tenant_id IN (SELECT id FROM public.tenants WHERE org_id = public.auth_org_id()));
  CREATE POLICY "musicos360_events_insert" ON public.events
    FOR INSERT WITH CHECK (tenant_id IN (SELECT id FROM public.tenants WHERE org_id = public.auth_org_id()) AND public.has_min_role('editor'));
  CREATE POLICY "musicos360_events_update" ON public.events
    FOR UPDATE USING (tenant_id IN (SELECT id FROM public.tenants WHERE org_id = public.auth_org_id()) AND public.has_min_role('editor'));
  CREATE POLICY "musicos360_events_delete" ON public.events
    FOR DELETE USING (tenant_id IN (SELECT id FROM public.tenants WHERE org_id = public.auth_org_id()) AND public.has_min_role('manager'));
  RAISE NOTICE 'RLS aplicado: events';
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'SKIP: tabela events não existe ainda';
END $$;


-- ── projects ──────────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "musicos360_proj_select" ON public.projects;
  DROP POLICY IF EXISTS "musicos360_proj_insert" ON public.projects;
  DROP POLICY IF EXISTS "musicos360_proj_update" ON public.projects;
  DROP POLICY IF EXISTS "musicos360_proj_delete" ON public.projects;
  CREATE POLICY "musicos360_proj_select" ON public.projects
    FOR SELECT USING (tenant_id IN (SELECT id FROM public.tenants WHERE org_id = public.auth_org_id()));
  CREATE POLICY "musicos360_proj_insert" ON public.projects
    FOR INSERT WITH CHECK (tenant_id IN (SELECT id FROM public.tenants WHERE org_id = public.auth_org_id()) AND public.has_min_role('editor'));
  CREATE POLICY "musicos360_proj_update" ON public.projects
    FOR UPDATE USING (tenant_id IN (SELECT id FROM public.tenants WHERE org_id = public.auth_org_id()) AND public.has_min_role('editor'));
  CREATE POLICY "musicos360_proj_delete" ON public.projects
    FOR DELETE USING (tenant_id IN (SELECT id FROM public.tenants WHERE org_id = public.auth_org_id()) AND public.has_min_role('manager'));
  RAISE NOTICE 'RLS aplicado: projects';
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'SKIP: tabela projects não existe ainda';
END $$;


-- ── releases ──────────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.releases ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "musicos360_rel_select" ON public.releases;
  DROP POLICY IF EXISTS "musicos360_rel_insert" ON public.releases;
  DROP POLICY IF EXISTS "musicos360_rel_update" ON public.releases;
  DROP POLICY IF EXISTS "musicos360_rel_delete" ON public.releases;
  CREATE POLICY "musicos360_rel_select" ON public.releases
    FOR SELECT USING (tenant_id IN (SELECT id FROM public.tenants WHERE org_id = public.auth_org_id()));
  CREATE POLICY "musicos360_rel_insert" ON public.releases
    FOR INSERT WITH CHECK (tenant_id IN (SELECT id FROM public.tenants WHERE org_id = public.auth_org_id()) AND public.has_min_role('editor'));
  CREATE POLICY "musicos360_rel_update" ON public.releases
    FOR UPDATE USING (tenant_id IN (SELECT id FROM public.tenants WHERE org_id = public.auth_org_id()) AND public.has_min_role('editor'));
  CREATE POLICY "musicos360_rel_delete" ON public.releases
    FOR DELETE USING (tenant_id IN (SELECT id FROM public.tenants WHERE org_id = public.auth_org_id()) AND public.has_min_role('manager'));
  RAISE NOTICE 'RLS aplicado: releases';
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'SKIP: tabela releases não existe ainda';
END $$;


-- ── shares ────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.shares ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "musicos360_shares_select" ON public.shares;
  DROP POLICY IF EXISTS "musicos360_shares_insert" ON public.shares;
  DROP POLICY IF EXISTS "musicos360_shares_update" ON public.shares;
  DROP POLICY IF EXISTS "musicos360_shares_delete" ON public.shares;
  CREATE POLICY "musicos360_shares_select" ON public.shares
    FOR SELECT USING (tenant_id IN (SELECT id FROM public.tenants WHERE org_id = public.auth_org_id()));
  CREATE POLICY "musicos360_shares_insert" ON public.shares
    FOR INSERT WITH CHECK (tenant_id IN (SELECT id FROM public.tenants WHERE org_id = public.auth_org_id()) AND public.has_min_role('editor'));
  CREATE POLICY "musicos360_shares_update" ON public.shares
    FOR UPDATE USING (tenant_id IN (SELECT id FROM public.tenants WHERE org_id = public.auth_org_id()) AND public.has_min_role('manager'));
  CREATE POLICY "musicos360_shares_delete" ON public.shares
    FOR DELETE USING (tenant_id IN (SELECT id FROM public.tenants WHERE org_id = public.auth_org_id()) AND public.has_min_role('admin'));
  RAISE NOTICE 'RLS aplicado: shares';
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'SKIP: tabela shares não existe ainda';
END $$;


-- ── audit_log (imutável — sem UPDATE/DELETE via RLS) ──────────────────────────
DO $$ BEGIN
  ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "musicos360_audit_select" ON public.audit_log;
  DROP POLICY IF EXISTS "musicos360_audit_insert" ON public.audit_log;
  CREATE POLICY "musicos360_audit_select" ON public.audit_log
    FOR SELECT USING (
      tenant_id IN (SELECT id FROM public.tenants WHERE org_id = public.auth_org_id())
      AND public.has_min_role('manager')
    );
  CREATE POLICY "musicos360_audit_insert" ON public.audit_log
    FOR INSERT WITH CHECK (
      tenant_id IN (SELECT id FROM public.tenants WHERE org_id = public.auth_org_id())
    );
  RAISE NOTICE 'RLS aplicado: audit_log';
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'SKIP: tabela audit_log não existe ainda';
END $$;


-- ── notifications (cada utilizador vê só as suas) ─────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "musicos360_notif_select" ON public.notifications;
  DROP POLICY IF EXISTS "musicos360_notif_insert" ON public.notifications;
  CREATE POLICY "musicos360_notif_select" ON public.notifications
    FOR SELECT USING (
      tenant_id IN (SELECT id FROM public.tenants WHERE org_id = public.auth_org_id())
      AND user_id = auth.uid()
    );
  CREATE POLICY "musicos360_notif_insert" ON public.notifications
    FOR INSERT WITH CHECK (
      tenant_id IN (SELECT id FROM public.tenants WHERE org_id = public.auth_org_id())
      AND public.has_min_role('manager')
    );
  RAISE NOTICE 'RLS aplicado: notifications';
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'SKIP: tabela notifications não existe ainda';
END $$;


-- =============================================================================
-- PASSO 3 — Grants de acesso
-- service_role bypassa RLS por design do Supabase — usar apenas em migrations.
-- authenticated role usa RLS como única barreira.
-- =============================================================================

DO $$ BEGIN
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
  GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
  RAISE NOTICE 'Grants aplicados ao role authenticated';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'SKIP: erro ao aplicar grants — %', SQLERRM;
END $$;


-- =============================================================================
-- FIM — Re-execute este script após cada migration de schema.
-- As functions (PASSO 1) são idempotentes via CREATE OR REPLACE.
-- Os blocos DO (PASSO 2) ignoram tabelas inexistentes com NOTICE.
-- =============================================================================
