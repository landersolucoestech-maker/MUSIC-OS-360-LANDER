# P0 Runtime Cleanup — Admin Real + Reports Status Fix

> **Data:** 2026-07-03 · **Produção:** intocada · **Sem migrations aplicadas em prod, sem Stripe runtime, sem mexer em RLS/RBAC, PR #3 Draft.**
> **Veredito:** ✅ **PASS.**

---

## 1. Arquivos alterados (meus)

**Novos serviços (API real, sem mock):**
- `apps/web/src/modules/admin/services/admin-support.service.ts` — `GET /support-tickets` → `AdminSupportTicket[]` (envelope `{data,meta}`, mapeamento defensivo).
- `apps/web/src/modules/admin/services/admin-audit.service.ts` — `GET /audit-logs` → `AdminAuditLog[]`.

**Páginas fiadas à API real:**
- `apps/web/src/modules/admin/pages/AdminSupport.tsx` — remove `ADMIN_SUPPORT_TICKETS`; usa `useQuery(adminSupportService.list)` + loading/error/empty.
- `apps/web/src/modules/admin/pages/AdminAudit.tsx` — remove `ADMIN_AUDIT_LOGS`; usa `useQuery(adminAuditService.list)` + loading/error/empty; fallback para ações fora do dicionário (`ACTION_STYLE/ACTION_LABEL ?? …`).

**Reports status fix:**
- `apps/api/src/modules/reports/export/export-engine.service.ts` — falhas de resolução de entidade agora retornam **422** (não exportável / input inválido), reservando 404 a recurso real inexistente. `NotFoundException` removido do fluxo de export.
- `apps/api/src/modules/reports/export/export-engine.service.spec.ts` — asserts alinhados (entidade inexistente/não-reportável → `UnprocessableEntityException`).

> Observação: o repositório contém outras alterações concorrentes (billing, leads, `entities.ts`, `entity-metadata.service.ts`, `admin-source.ts`, `KnowledgeBaseManager.tsx`, rotas) feitas em paralelo — **fora do escopo desta tarefa**; os resultados de teste abaixo refletem o estado combinado atual e estão verdes.

## 2. AdminSupport — ✅ sem mock runtime

Fonte trocada de `ADMIN_SUPPORT_TICKETS` (mock via `admin-source`) para **`adminSupportService.list()`** (React Query). Estados: **loading** ("Carregando tickets…"), **error** (mensagem + "Tentar novamente" → `refetch`), **empty** ("Nenhum ticket encontrado"). KPIs (abertos/andamento/aguardando/resolvidos) derivados dos dados reais. Endpoint `GET /support-tickets` é tenant-scoped (RequireRole manager).

## 3. AdminAudit — ✅ sem mock runtime

Fonte trocada de `ADMIN_AUDIT_LOGS` (mock) para **`adminAuditService.list()`** (React Query). Estados loading/error/empty adicionados. Ações desconhecidas (ex.: `support-ticket.created`) não quebram o Badge (fallback de estilo/label). Endpoint `GET /audit-logs` tenant-scoped (RequireRole viewer, append-only).

## 4. Reports status fix — ✅ 404 → 422

Decisão técnica aplicada (conforme critério): **422 quando a entidade é inválida/não exportável**; **404 reservado a recurso real inexistente**. `crm_contacts` (entidade legada registrada mas classificada não-reportável — sem contrato/tabela) agora retorna **422 controlado (nunca 500)**. Correção mínima no `export-engine.service` + spec unitário alinhado.

## 5. Testes executados

```
corepack pnpm --filter @music-os-360/web typecheck
corepack pnpm --filter @music-os-360/web test
corepack pnpm --filter @music-os-360/api  test
corepack pnpm --filter @music-os-360/api  test:e2e   (Postgres 16 local descartável, Docker)
```

## 6. Resultado dos testes

| Suite | Resultado |
|---|---|
| **web typecheck** | ✅ PASS (exit 0) |
| **web test** | ✅ **395/395** (35 arquivos) |
| **api test (unit)** | ✅ **681/681** (81 suites) |
| **api test:e2e** | ✅ **197/197** (5 suites) — inclui harness RLS multi-tabela + reports (`crm_contacts → 422`) |

Ambiente e2e: Postgres 16 local descartável (Docker, `localhost:5433`) + shim Supabase (roles + `auth.jwt()`) + 79 migrations + `musicos_app` NOBYPASSRLS + tenants A/B/C seed. `.env` repontado durante a execução e **restaurado**; container **removido** ao final.

## 7. Bloqueadores remanescentes

| # | Item | Sev | Nota |
|---|---|---|---|
| B1 | AdminSupport/AdminAudit escopados ao tenant atual | P3 | Endpoints existentes são tenant-scoped; uma visão **global** (cross-tenant) exigiria endpoint admin dedicado. Sem mock — comportamento correto para os endpoints disponíveis. |
| B2 | `rbac:readiness` sem amostra SHADOW | P1 | Requer app em SHADOW com tráfego real (fora desta tarefa). |
| B3 | `storage:e2e` sem bucket R2 de teste | P1 | Rodar contra bucket de teste (fora desta tarefa). |
| B4 | AdminKnowledge (localStorage) | P2 | Sem backend de KB; alterado por trabalho concorrente — validar à parte. |

## 8. Veredito — ✅ PASS

| Critério de PASS | Status |
|---|---|
| AdminSupport sem mock runtime | ✅ |
| AdminAudit sem mock runtime | ✅ |
| `test:e2e` 197/197 | ✅ |
| `typecheck` PASS | ✅ |

Todos os critérios atendidos. Extras verdes: web 395/395, api 681/681. **Produção intocada; nenhuma migration aplicada; Stripe não executado; RLS/RBAC não alterados; PR #3 permanece Draft.**
