# Tech Debt Audit

## Auth e tenant

- Supabase Auth foi consolidado como arquitetura unica.
- `auth.guard.ts` valida tokens via JWKS.
- `TenantGuard` depende de `app_metadata.org_id` e membership ativa.
- `org_members.auth_user_id` substitui o nome legado de usuario externo.

## Dividas restantes

- Alguns repositories ainda precisam revisao manual para garantir filtro `tenant_id` real em todos os metodos.
- A camada de storage/frontend ainda mascara lacunas de API por mock/localStorage.
- O modulo de inventario no frontend precisa confirmacao de backend.
- WebSocket auth precisa teste manual com token real.
- Lockfiles mistos indicam risco de drift entre npm e pnpm.

## Recomendacao

Manter Fase 0 limitada a estabilizacao. Nao criar CRM, pipeline, inbox ou automacoes ate os contratos de dados canonicos serem aprovados.
