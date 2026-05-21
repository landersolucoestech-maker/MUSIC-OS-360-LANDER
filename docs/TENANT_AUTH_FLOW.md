# Tenant Auth Flow

## Login

1. Usuario autentica no Supabase.
2. Supabase emite JWT.
3. Custom Access Token Hook injeta `app_metadata.org_id` e `app_metadata.role`.
4. Frontend guarda sessao via Supabase SDK.
5. API recebe Bearer token e valida via JWKS.

## Resolucao de tenant

1. API le `request.auth.orgId`.
2. `TenantGuard` busca `tenants.org_id`.
3. Membership e validada em `org_members.auth_user_id`.
4. Request recebe `tenant` e `currentMember`.

## Isolamento

Todo service multi-tenant deve filtrar por `tenant_id`. Activity logs, notifications, uploads e integrations devem registrar ownership por tenant e usuario.
