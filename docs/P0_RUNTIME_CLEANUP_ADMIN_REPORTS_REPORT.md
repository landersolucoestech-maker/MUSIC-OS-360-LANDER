# P0 RUNTIME CLEANUP — ADMIN REAL + REPORTS STATUS FIX

Data: 2026-07-02  
Escopo: AdminSupport sem mock runtime, AdminAudit sem mock runtime, reports status 422, testes.

## 1. Veredito

**PASS**

Todos os criterios desta fase foram atendidos:

- AdminSupport sem `ADMIN_SUPPORT_TICKETS`/mock runtime.
- AdminAudit sem `ADMIN_AUDIT_LOGS`/mock runtime.
- `test:e2e` passou com 197/197.
- Web typecheck passou.

Produção permaneceu intocada. Nenhuma migration foi aplicada. Stripe runtime nao foi executado. RLS/RBAC/migrations nao foram alterados.

## 2. Arquivos Alterados

| Arquivo | Alteracao |
|---|---|
| `apps/web/src/modules/admin/data/admin-source.ts` | Removidos exports runtime `ADMIN_AUDIT_LOGS` e `ADMIN_SUPPORT_TICKETS` e imports de tipos associados. |
| `apps/web/src/modules/admin/services/admin-support.service.ts` | Service real para `GET /support-tickets?limit=200`; comentario ajustado para nao sugerir fallback local. |
| `apps/web/src/modules/admin/services/admin-audit.service.ts` | Service real para `GET /audit-logs?limit=200`; comentario ajustado para nao sugerir fallback local. |
| `apps/api/src/modules/reports/export/export-engine.service.ts` | Entidade inexistente/não exportavel agora retorna `UnprocessableEntityException` 422, alinhado ao contrato de reports. |
| `apps/api/src/modules/reports/export/export-engine.service.spec.ts` | Testes unitarios atualizados para esperar 422 em entidade nao registrada/nao exportavel. |

Observacao: `AdminSupport.tsx` e `AdminAudit.tsx` ja estavam na worktree usando `useQuery` com `adminSupportService` e `adminAuditService`; foram validados nesta rodada como sem mock runtime.

## 3. AdminSupport Status

**Status:** PASS.

Evidencia:

- `AdminSupport.tsx` usa `useQuery`.
- Query key: `["admin", "support-tickets"]`.
- Service: `adminSupportService.list()`.
- Endpoint real: `GET /support-tickets?limit=200`.
- Estados presentes:
  - loading: `Carregando tickets...`
  - error: `Falha ao carregar tickets de suporte.`
  - retry: `ticketsQuery.refetch()`
  - empty: `Nenhum ticket encontrado`

Busca executada:

```bash
rg -n "ADMIN_SUPPORT_TICKETS|MOCK_SUPPORT_TICKETS|localStorage" \
  apps/web/src/modules/admin/pages/AdminSupport.tsx \
  apps/web/src/modules/admin/services/admin-support.service.ts \
  apps/web/src/modules/admin/data/admin-source.ts
```

Resultado: nenhum uso runtime encontrado.

## 4. AdminAudit Status

**Status:** PASS.

Evidencia:

- `AdminAudit.tsx` usa `useQuery`.
- Query key: `["admin", "audit-logs"]`.
- Service: `adminAuditService.list()`.
- Endpoint real: `GET /audit-logs?limit=200`.
- Estados presentes:
  - loading: `Carregando auditoria...`
  - error: `Falha ao carregar os logs de auditoria.`
  - retry: `auditQuery.refetch()`
  - empty: `Nenhum evento de auditoria`

Busca executada:

```bash
rg -n "ADMIN_AUDIT_LOGS|MOCK_AUDIT_LOGS|localStorage" \
  apps/web/src/modules/admin/pages/AdminAudit.tsx \
  apps/web/src/modules/admin/services/admin-audit.service.ts \
  apps/web/src/modules/admin/data/admin-source.ts
```

Resultado: nenhum uso runtime encontrado.

## 5. Reports Status Fix

**Status:** PASS.

Problema:

- O contrato correto exige `422` quando a entidade e invalida, registrada sem tabela fisica ou nao exportavel.
- `404` deve ficar reservado para recurso real inexistente, nao para contrato de export/report.

Correcao:

- `ExportEngineService.export()` passou a lançar `UnprocessableEntityException` quando:
  - a entidade nao esta registrada para reports;
  - a entidade nao e exportavel pela Central de Relatorios.

Evidencia:

- Unit tests de `ExportEngineService` atualizados para 422.
- E2E de reports passou, incluindo:
  - `crm_contacts` sem tabela fisica -> 422 controlado.

## 6. Testes Executados

| Comando | Resultado |
|---|---|
| `corepack.cmd pnpm --filter @music-os-360/web typecheck` | PASS |
| `corepack.cmd pnpm --filter @music-os-360/web test` | PASS, 35 arquivos / 395 testes |
| `corepack.cmd pnpm --filter @music-os-360/api test` | PASS, 81 suites / 681 testes |
| `corepack.cmd pnpm --filter @music-os-360/api test:e2e` | PASS, 5 suites / 197 testes |

## 7. Resultado Dos Testes

### Web typecheck

```text
PASS
```

### Web tests

```text
Test Files: 35 passed, 35 total
Tests: 395 passed, 395 total
```

### API unit tests

```text
Test Suites: 81 passed, 81 total
Tests: 681 passed, 681 total
```

### API E2E

```text
Test Suites: 5 passed, 5 total
Tests: 197 passed, 197 total
```

## 8. Bloqueadores Remanescentes

Nenhum bloqueador remanescente dentro do escopo desta fase.

Fora do escopo desta fase, continuam pendentes os gates de runtime mais amplos ja registrados em relatórios anteriores:

- role `musicos_app` real no mirror/staging;
- reexecucao completa de migrations no mirror;
- `db:check` pos-migration;
- `verify:tenant-isolation`;
- `rbac:readiness`;
- `storage:e2e`.

## 9. Veredito Final

**PASS**

Criterios:

- AdminSupport sem mock runtime: PASS.
- AdminAudit sem mock runtime: PASS.
- `test:e2e` 197/197: PASS.
- typecheck PASS: PASS.
