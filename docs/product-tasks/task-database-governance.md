# Database Governance — Soft Delete + Indexes + Migration Safety + Pagination

## What & Why
O schema Drizzle atual não tem soft delete padronizado (DELETE físico em todas as tabelas), não tem índices compostos para queries multi-tenant (todo SELECT por tenantId faz full table scan), a paginação é client-side (storage.list retorna tudo e o frontend fatia), e as migrations não têm rollback estratégia. Em produção com milhares de registros por tenant, queries sem índice tenantId + created_at degradam em O(n). Hard deletes impossibilitam auditoria e recuperação de dados.

## Done looks like
- Campo `deleted_at TIMESTAMP NULL DEFAULT NULL` adicionado a todas as tabelas principais (artistas, obras, fonogramas, contratos, clientes, leads, transações, projetos, campanhas, eventos, inventário, licenciamento)
- Todas as queries Drizzle filtram `deleted_at IS NULL` automaticamente via helper `withSoftDelete()`
- Índices compostos criados: `(tenant_id, deleted_at, created_at DESC)` nas tabelas principais
- Índices em FKs: `(tenant_id, artist_id)`, `(tenant_id, work_id)`, `(tenant_id, status)` onde aplicável
- Paginação cursor-based padronizada: helper `paginate(query, { cursor, limit })` retorna `{ data, nextCursor, hasMore }`
- Migration governance: toda migration tem `up()` e `down()` documentados; arquivo `migrations/README.md` com convenções
- `drizzle-kit generate` e `migrate` funcionam sem erros
- `tsc --noEmit` sem erros

## Out of scope
- Mudar lógica de negócio de qualquer módulo
- Reescrever queries existentes (apenas adicionar o filtro via helper)
- Row Level Security no banco (fase de hardening)
- Backup strategy (fase 5)

## Steps
1. **Schema — soft delete columns** — adicionar `deleted_at: timestamp('deleted_at')` a todas as tabelas principais no `schema.ts`; gerar migration com drizzle-kit; aplicar via `npm run db:migrate`
2. **withSoftDelete helper** — criar `database/helpers/soft-delete.ts` com `withSoftDelete<T>(query)` que adiciona `.where(isNull(table.deleted_at))`; criar `softDelete(db, table, id)` que faz UPDATE em vez de DELETE; atualizar `database/index.ts` para exportar
3. **Composite indexes** — adicionar ao schema: índice `(tenant_id, deleted_at, created_at)` nas 10+ tabelas principais; índice `(tenant_id, status)` em contratos, transações, leads; rodar migration
4. **Cursor-based pagination helper** — criar `database/helpers/paginate.ts` com `paginate<T>({ query, cursor, limit, orderCol })` retornando `{ items: T[], nextCursor: string | null, hasMore: boolean }`; usar UUID encoded como cursor opaco
5. **Migration README** — criar `apps/api/drizzle/README.md` documentando: convenção de nomenclatura, como gerar, como aplicar, como reverter manualmente (drizzle não suporta down automático — documentar o SQL de rollback para cada migration)
6. **Atualizar DELETE endpoints** — nos controllers existentes, substituir `db.delete(table).where(eq(id))` por `softDelete(db, table, id)` via helper; garantir que GET queries usam `withSoftDelete()`

## Relevant files
- `apps/api/src/database/schema.ts`
- `apps/api/src/database/database.module.ts`
- `apps/api/drizzle/` (migrations directory)
- `apps/api/src/modules/artists/artists.service.ts` (exemplo de DELETE a atualizar)
- `apps/api/src/modules/contracts/contracts.service.ts`
- `apps/api/src/modules/transactions/transactions.service.ts`
