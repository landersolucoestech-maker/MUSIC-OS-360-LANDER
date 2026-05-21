# Auth Architecture

## Fonte unica

Supabase Auth e a unica fonte de autenticacao do MUSIC OS 360.

## Frontend

- `AuthContext` hidrata a sessao via Supabase SDK.
- Access token Supabase e enviado como Bearer token nas chamadas HTTP.
- Logout deve limpar sessao, cache de queries e estado sensivel de tenant.
- Claims relevantes: `sub`, `email`, `app_metadata.org_id`, `app_metadata.role`.

## Backend

- `JwtAuthGuard` valida JWT via JWKS publico do Supabase.
- `request.auth.userId` recebe o `sub`.
- `request.auth.orgId` recebe `app_metadata.org_id`.
- `TenantGuard` carrega tenant e membership ativa.
- `RolesGuard` aplica RBAC a partir de `currentMember.role`.

## Banco

- `org_members.auth_user_id` armazena o `sub` do Supabase.
- `organizations.external_auth_org_id` e `tenants.external_auth_org_id` ficam reservados para identificadores externos nao canonicos.
