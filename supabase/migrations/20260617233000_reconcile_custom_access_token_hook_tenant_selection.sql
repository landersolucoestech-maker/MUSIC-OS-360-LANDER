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
  v_claims   := event -> 'claims';
  v_user_id  := event ->> 'user_id';

  SELECT u.raw_app_meta_data ->> 'org_id'
    INTO v_requested_tenant_id
    FROM auth.users u
   WHERE u.id::text = v_user_id;

  SELECT om.tenant_id, om.role
    INTO v_tenant_id, v_role
    FROM public.org_members om
    JOIN public.tenants t ON t.id = om.tenant_id
   WHERE om.auth_user_id = v_user_id
     AND om.is_active = true
     AND om.tenant_id::text = v_requested_tenant_id
     AND t.active = true
     AND t.deleted_at IS NULL
   ORDER BY om.joined_at DESC NULLS LAST, om.id DESC
   LIMIT 1;

  IF v_tenant_id IS NOT NULL THEN
    v_app_meta := COALESCE(v_claims -> 'app_metadata', '{}'::jsonb)
                  || jsonb_build_object(
                       'org_id', v_tenant_id::text,
                       'role', COALESCE(v_role, 'viewer')
                     );
    v_claims := jsonb_set(v_claims, '{app_metadata}', v_app_meta);
  END IF;

  RETURN jsonb_set(event, '{claims}', v_claims);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[musicos360:jwt_hook] Erro ao enriquecer JWT para user %: % - JWT emitido sem app_metadata',
    v_user_id, SQLERRM;
  RETURN event;
END;
$$;
