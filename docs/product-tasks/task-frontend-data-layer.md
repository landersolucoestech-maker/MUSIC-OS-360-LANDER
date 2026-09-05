# Frontend Data Layer — Storage → API Real + Query Keys + Cache Contracts

## What & Why
O `useDataQuery` (central de todos os 47+ hooks) usa `storage.list/create/update/delete` que aponta para MOCK_DATA quando MOCK_MODE=true. Quando MOCK_MODE=false, `storage` deve chamar o backend real — mas a camada de storage HTTP nunca foi completamente implementada: faltam endpoints paginados, error normalization global, optimistic updates, e os query keys não seguem hierarquia consistente (alguns usam arrays, outros strings). A transição para backend real após #662 (MOCK_MODE opt-in) exige que esta camada funcione corretamente.

## Done looks like
- `storage.ts` em HTTP mode: `list()` → `GET /api/:table?page=&limit=&cursor=`; `create()` → `POST /api/:table`; `update()` → `PATCH /api/:table/:id`; `delete()` → PATCH (soft delete) `DELETE /api/:table/:id`
- Query keys hierárquicos: `QUERY_KEYS.ARTISTAS = ['artistas']`, `QUERY_KEYS.ARTISTA(id) = ['artistas', id]` — todo hook usa a hierarquia correta para invalidação precisa
- Error normalization: `api-client.ts` converte erros HTTP em `ApiError { code, message, statusCode, requestId }` — todos os `onError` recebem este tipo tipado
- Optimistic updates em CREATE e DELETE: `createMutation` adiciona registro temporário ao cache antes da resposta; `deleteMutation` remove imediatamente; rollback automático em caso de erro
- Loading states: `isLoading`, `isFetching`, `isPending` padronizados — distinção clara entre primeiro load e refetch
- Todas as queries têm `staleTime` e `gcTime` configurados via `query-config.ts` (dados críticos: 30s; catálogo: 5min; analytics: 15min)
- `tsc --noEmit` sem erros no `client/`

## Out of scope
- Reescrever cada hook individual (apenas o `useDataQuery` genérico e `storage.ts`)
- Implementar novos endpoints backend (feito em #665)
- Upload de arquivos (task separada)
- React Query DevTools (development only, já existe ou trivial)

## Steps
1. **storage.ts HTTP mode** — implementar `StorageHTTPAdapter` com métodos `list`, `create`, `update`, `delete` usando `api-client.ts`; suporte a `filters` como query params; suporte a `cursor` e `limit` para paginação; retornar array tipado ou lançar `ApiError`
2. **Error normalization** — criar `shared/lib/api-error.ts` com classe `ApiError extends Error` com `code`, `statusCode`, `requestId`, `details`; atualizar `api-client.ts` para converter respostas de erro HTTP neste tipo; atualizar `useDataQuery` para tipar `onError` com `ApiError`
3. **Query keys hierárquicos** — auditar `shared/lib/query-config.ts`; converter todas as chaves para factory functions: `QUERY_KEYS.artista(id)`, `QUERY_KEYS.obra(id)`, etc.; atualizar todos os hooks que usam `invalidateQueries` para usar a hierarquia correta (invalidar `['artistas']` invalida `['artistas', id]`)
4. **Optimistic updates** — adicionar `onMutate` em `createMutation` (adiciona item ao cache com `id: crypto.randomUUID()`) e em `deleteMutation` (remove do cache); `onError` faz rollback via `queryClient.setQueryData`; `onSettled` invalida para sincronizar com server
5. **Cache contracts** — atualizar `getCacheConfig()` para ter 3 tiers: `CRITICAL` (artistas, contratos, financeiro: staleTime 30s, gcTime 5min), `CATALOG` (obras, fonogramas: staleTime 5min, gcTime 30min), `ANALYTICS` (métricas, relatórios: staleTime 15min, gcTime 1h)
6. **Validar com MOCK_MODE=false** — testar a layer contra os endpoints reais dos módulos existentes (artists, works, contracts, transactions); garantir que list/create/update/delete funcionam end-to-end

## Relevant files
- `client/src/shared/hooks/useDataQuery.ts`
- `client/src/shared/lib/storage.ts`
- `client/src/shared/lib/api-client.ts`
- `client/src/shared/lib/query-config.ts`
- `client/src/modules/artist/hooks/useArtistas.ts`

## Depends on
- Task #661 (auth chain — token precisa funcionar)
- Task #662 (MOCK_MODE opt-in — controla qual adapter usar)
- Task #665 (backend modules — endpoints precisam existir)
