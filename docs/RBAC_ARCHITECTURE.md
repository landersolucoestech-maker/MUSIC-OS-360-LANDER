# RBAC Architecture

## Origem da permissao

O role operacional vem de `org_members.role`. O JWT carrega `app_metadata.role` para UX e atalhos, mas o backend deve confiar na membership ativa carregada pelo banco.

## Fluxo

1. `JwtAuthGuard` valida token.
2. `TenantGuard` encontra o tenant pelo `org_id` do token.
3. `TenantGuard` encontra membership ativa por `tenant_id` e `auth_user_id`.
4. `RolesGuard` compara o role com `@RequireRole`.

## Riscos a acompanhar

- Claims desatualizados ate refresh do token.
- Endpoints sem filtro tenant-aware.
- Rotas publicas com acesso alem do necessario.
- WebSocket e realtime sem mesma validacao do HTTP.
