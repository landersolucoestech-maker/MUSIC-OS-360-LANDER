# Auth Chain Fix — TenantGuard + Clerk Token

## What & Why
O TenantGuard popula `request.tenant` e `request.currentMember` mas **nunca atribui `request.tenantId` nem `request.userId`**. Todos os controllers chamam `req.tenantId` e `req.userId` que chegam como `undefined`, silenciando qualquer operação multi-tenant (queries Drizzle recebem `undefined` como filtro, sem erro em runtime). Paralelamente, o `api-client.ts` do frontend implementa um `tryRefresh()` que chama `POST /auth/refresh` — endpoint que não existe de forma válida com Clerk. A sessão expirada gera 401 em cascata em vez de renovar o token silenciosamente.

## Done looks like
- Toda requisição autenticada tem `req.tenantId` (string UUID) e `req.userId` (string Clerk) corretamente populados pelo `TenantGuard`
- `express.d.ts` tipando o Request estendido elimina todos os `req: any` dos controllers
- Controllers refatorados usam `req.tenantId` e `req.userId` com tipagem forte (sem `any`)
- `tryRefresh()` removido do frontend; 401 dispara `getToken({ skipCache: true })` do Clerk via `useAuth()` e rereenvia
- Sessão persiste indefinidamente sem logout forçado após expiração do JWT

## Out of scope
- Implementar novos módulos ou endpoints
- Modificar a lógica de permissões RBAC (roles/features)
- Middleware de rate-limiting (task separada)

## Steps
1. **Corrigir TenantGuard** — após validar tenant e member, atribuir `request.tenantId = tenant.id` e `request.userId = auth.userId` com tipos corretos; remover casts `unknown` em `request.tenant` e `request.currentMember`
2. **Criar `express.d.ts`** — estender `Express.Request` com `tenantId: string`, `userId: string`, `tenant: Tenant`, `currentMember: OrgMember`, importando tipos do schema Drizzle; registrar no `tsconfig` da api
3. **Remover `req: any` dos controllers** — substituir `@Request() req: any` por `@Req() req: Request` com import do `express.d.ts`; começar pelos 6 controllers que mais usam tenantId (integrations, artists, works, phonograms, contracts, transactions)
4. **Frontend — substituir `tryRefresh`** — criar `useApiClient()` hook que usa `getToken({ skipCache: true })` do Clerk no interceptor de 401; remover o `tryRefresh` e a dependência de cookie httpOnly; garantir retry único sem loop
5. **Validar tsc 0 erros** — rodar `cd apps/api && npx tsc --noEmit` e `cd client && npx tsc --noEmit`

## Relevant files
- `apps/api/src/core/guards/tenant.guard.ts`
- `apps/api/src/modules/integrations/integrations.controller.ts`
- `apps/api/src/modules/artists/artists.controller.ts`
- `apps/api/src/modules/works/works.controller.ts`
- `apps/api/src/modules/phonograms/phonograms.controller.ts`
- `apps/api/src/modules/contracts/contracts.controller.ts`
- `apps/api/src/modules/transactions/transactions.controller.ts`
- `client/src/shared/lib/api-client.ts:111-155`
