# RBAC Enterprise — Permission Enforcement em Todas as Rotas

## What & Why
O `RolesGuard` e `@RequireRole()` existem mas não estão aplicados em nenhuma rota real. Todo endpoint está efetivamente aberto a qualquer usuário autenticado do tenant, independente do role. Além disso, não existe conceito de feature gates (plano do tenant), não há decorators de permissões granulares (além de roles), e os roles não são verificados por operação (read vs. write vs. delete). Este task depende de #661 (auth chain fix) porque `currentMember` precisa estar populado no request.

## Done looks like
- `@RequireRole('editor')` aplicado em todos os endpoints de criação/edição (POST, PATCH, PUT)
- `@RequireRole('manager')` aplicado em endpoints de deleção e configurações críticas (DELETE, PATCH de status)
- `@RequireRole('admin')` aplicado em endpoints de usuários, billing e configurações globais
- `@Public()` explicitamente marcado nos endpoints de health e webhook callbacks
- Feature gate decorator `@RequireFeature('monitoring')` para rotas de módulos premium
- `TenantFeaturesGuard` verifica `tenant.features` (array de feature flags no schema) antes de processar request
- `PermissionsGuard` global registrado no `AppModule` via `APP_GUARD`
- Qualquer acesso não autorizado retorna 403 com mensagem clara (sem stack trace)
- `tsc --noEmit` sem erros

## Out of scope
- UI de gerenciamento de roles (frontend)
- Alterar a hierarquia de roles (viewer/editor/manager/admin/owner já definida)
- Row-level security por recurso (ex: artista só vê seus próprios dados — fase futura)

## Steps
1. **Auditar todos os controllers** — listar cada endpoint (método + path) e classificar: público, autenticado-qualquer, editor+, manager+, admin+; gerar tabela de decisão para referência
2. **Aplicar @RequireRole nos controllers** — percorrer controllers um por um (artists, works, phonograms, contracts, transactions, releases, shares, clients, leads, campaigns, events, hr, inventory, licensing, monitoring, uploads, billing, integrations, users); aplicar decorator correto por endpoint
3. **Feature gate decorator + guard** — criar `core/decorators/require-feature.decorator.ts` com `@RequireFeature(...features)`; criar `TenantFeaturesGuard` que lê `request.tenant.features` e rejeita 403 se feature não habilitada para o plano; aplicar em rotas de monitoring, licensing, analytics avançado
4. **Registrar guards globalmente** — registrar `RolesGuard` e `TenantFeaturesGuard` via `APP_GUARD` no `AppModule` (execução após `ClerkAuthGuard` e `TenantGuard`); garantir ordem correta na cadeia
5. **Testes de permissão** — criar spec para `RolesGuard` cobrindo: viewer em rota editor+ (403), admin em qualquer rota (200), público sem token (200), feature não habilitada (403)

## Relevant files
- `apps/api/src/core/guards/roles.guard.ts`
- `apps/api/src/core/decorators/roles.decorator.ts`
- `apps/api/src/core/decorators/public.decorator.ts`
- `apps/api/src/app.module.ts`
- `apps/api/src/modules/artists/artists.controller.ts`
- `apps/api/src/modules/contracts/contracts.controller.ts`
- `apps/api/src/modules/users/users.controller.ts`
- `apps/api/src/modules/billing/billing.controller.ts`

## Depends on
- Task #661 (auth chain fix — currentMember precisa estar populado)
