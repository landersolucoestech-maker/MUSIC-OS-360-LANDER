-- =============================================================================
-- MUSIC OS 360 — Supabase Custom Access Token Hook
-- =============================================================================
--
-- PROPÓSITO:
--   Enriquecer automaticamente cada JWT emitido/renovado pelo Supabase com
--   org_id e role do utilizador, lidos em tempo real da tabela org_members.
--
-- RESULTADO: Todos os JWTs terão:
--   {
--     "app_metadata": {
--       "org_id": "<uuid-da-organização>",
--       "role":   "viewer | editor | manager | admin | owner | super_admin"
--     }
--   }
--
-- COMPATIBILIDADE:
--   • JwtAuthGuard  — lê app_metadata.org_id → request.auth.orgId
--   • TenantGuard   — lookup tenants WHERE org_id = :orgId
--   • RolesGuard    — currentMember.role da DB
--   • RLS           — auth.jwt()->'app_metadata'->>'org_id'
--   • Frontend      — AuthContext mapSupabaseUser lê app_metadata.org_id
--
-- COMO ATIVAR (após executar este script no SQL Editor do Supabase):
--   1. Dashboard → Authentication → Hooks
--   2. "Custom Access Token" → Enable
--   3. Schema: public   Function: custom_access_token_hook
--   4. Save
--
-- O hook dispara em:
--   • signInWithPassword / signInWithOAuth / signInWithMagicLink
--   • refreshSession / auto-refresh (persistSession=true)
--   • getSession (se o token estiver expirado e for renovado)
-- =============================================================================

-- ─── 1. Função do hook ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_claims               jsonb;
  v_user_id              text;
  v_requested_tenant_id  text;
  v_tenant_id            uuid;
  v_role                 text;
  v_app_meta             jsonb;
BEGIN
  v_claims    := event -> 'claims';
  v_user_id   := event ->> 'user_id';

  -- ─── Busca a membria ativa mais recente do utilizador ───────────────────────
  -- O app_metadata.org_id seleciona explicitamente o tenant corrente.
  -- A selecao so e aceita quando existe membership e tenant ativos.
  SELECT u.raw_app_meta_data ->> 'org_id'
    INTO v_requested_tenant_id
    FROM auth.users u
   WHERE u.id::text = v_user_id;

  SELECT om.tenant_id, om.role
    INTO v_tenant_id, v_role
    FROM public.org_members om
    JOIN public.tenants t ON t.id = om.tenant_id
   WHERE om.auth_user_id = v_user_id
     AND om.is_active     = true
     AND om.tenant_id::text = v_requested_tenant_id
     AND t.active = true
     AND t.deleted_at IS NULL
   ORDER BY om.joined_at DESC NULLS LAST, om.id DESC
   LIMIT 1;

  -- ─── Injeta no app_metadata (mescla, não sobrescreve) ──────────────────────
  -- Preserva eventuais campos pré-existentes em app_metadata.
  IF v_tenant_id IS NOT NULL THEN
    v_app_meta := COALESCE(v_claims -> 'app_metadata', '{}'::jsonb)
                  || jsonb_build_object(
                       'org_id', v_tenant_id::text,
                       'role',   COALESCE(v_role, 'viewer')
                     );
    v_claims := jsonb_set(v_claims, '{app_metadata}', v_app_meta);
  END IF;

  RETURN jsonb_set(event, '{claims}', v_claims);

EXCEPTION WHEN OTHERS THEN
  -- Nunca bloquear o login se a query falhar (ex: tabela ainda não existe).
  -- O JWT é emitido sem os claims extras — seguro mas sem isolamento de tenant.
  RAISE WARNING '[musicos360:jwt_hook] Erro ao enriquecer JWT para user %: % — JWT emitido sem app_metadata',
    v_user_id, SQLERRM;
  RETURN event;
END;
$$;


-- ─── 2. Permissões ────────────────────────────────────────────────────────────
-- supabase_auth_admin é o role interno do Supabase que invoca o hook.

GRANT USAGE    ON SCHEMA public                                      TO supabase_auth_admin;
GRANT EXECUTE  ON FUNCTION public.custom_access_token_hook(jsonb)    TO supabase_auth_admin;

-- Revogar explicitamente de roles não-privilegiadas por segurança.
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) FROM authenticated, anon, public;


-- ─── 3. (Opcional) Permissão para o hook ler org_members sem RLS ──────────────
-- SECURITY DEFINER já contorna o RLS porque a função corre com o owner (postgres).
-- Se o owner da função não for postgres, adicione:
--   ALTER FUNCTION public.custom_access_token_hook(jsonb) OWNER TO postgres;


-- ─── 4. Validação pós-ativação ────────────────────────────────────────────────
-- Após ativar o hook no Dashboard e fazer login, execute no SQL Editor:
--
--   SELECT auth.jwt() -> 'app_metadata';
--   -- Deve retornar: {"org_id": "<uuid>", "role": "<role>"}
--
-- Para verificar um token específico sem fazer login:
--   SELECT public.custom_access_token_hook(
--     jsonb_build_object(
--       'user_id', '<uuid-do-utilizador>',
--       'claims',  '{}'::jsonb
--     )
--   );
