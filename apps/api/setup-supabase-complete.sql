-- =============================================================================
-- MUSIC OS 360 — Setup Completo Supabase
-- Cole TUDO isso no SQL Editor do Supabase e execute de uma vez.
--
-- PRÉ-REQUISITO: Crie o usuário admin antes de rodar:
--   Dashboard → Authentication → Users → Add user
--   Email: admin@musicos360.dev  |  Senha: (qualquer)
--
-- Este script faz automaticamente:
--   1. Cria a função JWT hook (enriquece tokens com org_id + role)
--   2. Configura permissões do hook
--   3. Seed: organização, tenant, billing, admin member, artista demo, transação demo
--
-- Após rodar, ative o hook em:
--   Authentication → Hooks → Custom Access Token → Enable
--   Schema: public  |  Function: custom_access_token_hook → Save
-- =============================================================================


-- ═══════════════════════════════════════════════════════════════════════════════
-- PARTE 1: JWT HOOK
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_claims      jsonb;
  v_user_id     text;
  v_org_id      uuid;
  v_role        text;
  v_app_meta    jsonb;
BEGIN
  v_claims    := event -> 'claims';
  v_user_id   := event ->> 'user_id';

  SELECT om.org_id, om.role
    INTO v_org_id, v_role
    FROM public.org_members om
   WHERE om.auth_user_id = v_user_id
     AND om.is_active     = true
   ORDER BY om.joined_at DESC NULLS LAST
   LIMIT 1;

  IF v_org_id IS NOT NULL THEN
    v_app_meta := COALESCE(v_claims -> 'app_metadata', '{}'::jsonb)
                  || jsonb_build_object(
                       'org_id', v_org_id::text,
                       'role',   COALESCE(v_role, 'viewer')
                     );
    v_claims := jsonb_set(v_claims, '{app_metadata}', v_app_meta);
  END IF;

  RETURN jsonb_set(event, '{claims}', v_claims);

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[musicos360:jwt_hook] Erro ao enriquecer JWT para user %: % — JWT emitido sem app_metadata',
    v_user_id, SQLERRM;
  RETURN event;
END;
$$;

GRANT USAGE   ON SCHEMA public                                   TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) FROM authenticated, anon, public;

DO $$ BEGIN
  RAISE NOTICE '✓ PARTE 1: JWT hook criado e permissões configuradas.';
END $$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- PARTE 2: SEED OPERACIONAL
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_org_id      UUID := '10000000-0000-0000-0000-000000000001';
  v_tenant_id   UUID := '10000000-0000-0000-0000-000000000002';
  v_org_slug    TEXT := 'musicos360-demo';
  v_org_name    TEXT := 'MUSIC OS 360 Demo';
  v_admin_email TEXT := 'admin@musicos360.dev';
  v_admin_name  TEXT := 'Admin Demo';
  v_admin_sub   UUID;
  v_artist_id   UUID := gen_random_uuid();
BEGIN

  -- ── 1. Organization ──────────────────────────────────────────────────────────
  INSERT INTO organizations (id, name, slug, plan, billing_status, industry)
  VALUES (v_org_id, v_org_name, v_org_slug, 'enterprise', 'active', 'gravadora')
  ON CONFLICT (id) DO UPDATE SET
    name           = EXCLUDED.name,
    billing_status = EXCLUDED.billing_status;
  RAISE NOTICE '  ✓ Organization: %', v_org_name;

  -- ── 2. Tenant ─────────────────────────────────────────────────────────────────
  INSERT INTO tenants (id, org_id, name, slug, plan, active)
  VALUES (v_tenant_id, v_org_id, v_org_name, v_org_slug || '-tenant', 'enterprise', TRUE)
  ON CONFLICT (id) DO UPDATE SET active = TRUE;
  RAISE NOTICE '  ✓ Tenant: %', v_org_slug || '-tenant';

  -- ── 3. Billing Subscription ───────────────────────────────────────────────────
  INSERT INTO billing_subscriptions (org_id, plan, status, seats, seats_used)
  VALUES (v_org_id, 'enterprise', 'active', 50, 1)
  ON CONFLICT DO NOTHING;
  RAISE NOTICE '  ✓ Billing subscription: enterprise, 50 seats';

  -- ── 4. Admin Member (auto-lookup do UUID via auth.users) ──────────────────────
  SELECT id INTO v_admin_sub
    FROM auth.users
   WHERE email = v_admin_email
   LIMIT 1;

  IF v_admin_sub IS NOT NULL THEN
    INSERT INTO org_members (org_id, tenant_id, auth_user_id, email, full_name, role, is_active)
    VALUES (v_org_id, v_tenant_id, v_admin_sub::text, v_admin_email, v_admin_name, 'owner', TRUE)
    ON CONFLICT (tenant_id, auth_user_id) DO UPDATE SET
      role      = 'owner',
      is_active = TRUE;
    RAISE NOTICE '  ✓ org_members: % (UUID: %) criado como owner', v_admin_email, v_admin_sub;
  ELSE
    RAISE WARNING '  ⚠ Usuário % não encontrado em auth.users. Crie em Authentication → Users e rode novamente.', v_admin_email;
  END IF;

  -- ── 5. Demo Artist ────────────────────────────────────────────────────────────
  INSERT INTO artists (id, tenant_id, nome_artistico, nome_civil, tipo, status, genero_musical)
  VALUES (v_artist_id, v_tenant_id, 'Artista Demo', 'Nome Civil Demo', 'solo', 'ativo', 'MPB')
  ON CONFLICT DO NOTHING;
  RAISE NOTICE '  ✓ Artista demo criado';

  -- ── 6. Demo Transaction ───────────────────────────────────────────────────────
  INSERT INTO transactions (tenant_id, tipo, categoria, descricao, valor, data, status)
  VALUES (v_tenant_id, 'receita', 'cachê', 'Show de demonstração', 5000.00, NOW(), 'confirmado')
  ON CONFLICT DO NOTHING;
  RAISE NOTICE '  ✓ Transação demo criada';

  RAISE NOTICE '✓ PARTE 2: Seed operacional concluído — org=%, tenant=%', v_org_id, v_tenant_id;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- VERIFICAÇÃO FINAL
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT
  (SELECT COUNT(*) FROM organizations  WHERE id = '10000000-0000-0000-0000-000000000001') AS org_ok,
  (SELECT COUNT(*) FROM tenants        WHERE id = '10000000-0000-0000-0000-000000000002') AS tenant_ok,
  (SELECT COUNT(*) FROM org_members    WHERE email = 'admin@musicos360.dev')               AS admin_ok,
  (SELECT COUNT(*) FROM artists        WHERE tenant_id = '10000000-0000-0000-0000-000000000002') AS artist_ok,
  (SELECT COUNT(*) FROM transactions   WHERE tenant_id = '10000000-0000-0000-0000-000000000002') AS transaction_ok;

-- Todos os valores devem ser 1.
-- Se admin_ok = 0: crie o usuário em Authentication → Users e rode apenas o bloco DO $$ da Parte 2.
