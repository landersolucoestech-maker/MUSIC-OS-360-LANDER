# P0 Runtime Gates — Execution Report · MUSIC OS 360

> **Data:** 2026-07-02 · **Produção:** intocada (0 comandos contra prod / R2 prod / Stripe) · **PR #3:** permanece Draft · **Ambiente descartável:** criado e **deletado ao final**.
> **Veredito:** ⚠️ **PARTIAL** (schema + RLS + tenant-isolation 100% verdes em runtime real; `rbac:readiness` e `storage:e2e` BLOCKED por ausência de tráfego/bucket; 1 falha e2e LOW; Admin Knowledge ainda em localStorage).
>
> _Substitui a rodada anterior que parou em `db:check` (ECONNREFUSED) por Docker desligado — o ambiente foi provisionado e os gates executados de fato._

---

## 1. Ambiente descartável criado

**Decisão de infra (desvio justificado do "branch Supabase"):** um branch Supabase novo **não é conectável pelos gates locais** — o MCP não expõe a senha do DB do branch, e o `test:e2e` exige um **app-role `musicos_app` NOBYPASSRLS com LOGIN+senha** (o harness aborta se o role tiver bypassrls). Por isso usei um **Postgres 16 local descartável** (Docker), que satisfaz todas as regras (sem prod, sem R2 prod, sem Stripe, PR#3 Draft) e dá controle total sobre roles.

- **Container:** `musicos-p0` (`postgres:16`), host `localhost:5433` → 5432.
- **Shim compatível-Supabase** (pré-migrations): roles `anon`, `authenticated`, `service_role` (BYPASSRLS), `authenticator`, e **`musicos_app` LOGIN NOBYPASSRLS** (membro de `authenticated`); schema `auth` + `auth.jwt()/uid()/role()` (necessários no `CREATE POLICY` das migrations-gênese).
- **`.env` (apps/api/.env, git-ignored, sem commit):** `DATABASE_URL` = owner local; `APP_DATABASE_URL` = `musicos_app` local; `DB_SSL=false`; `DATABASE_SESSION_CONTEXT_ENABLED=true`; `DATABASE_RLS_ENFORCEMENT=true`. **Restaurado ao estado original ao final.**

## 2. Migrations aplicadas

`corepack pnpm --filter @music-os-360/api db:migrate` → **EXIT 0**.
- **79/79** migrations registradas em `musicos360_migrations` (genesis `20240101000000_InitialSchema` → `20260701000003_BillingRlsHardening`).
- `pg_trgm` instalado ✅; índice `idx_contacts_name_trgm` criado ✅ (o "erro" `gin_trgm_ops` no log é a 1ª tentativa antes do `CREATE EXTENSION`; estado final correto).
- **146 tabelas**, **FORCE RLS = 128**, **RLS = 133**, **213 policies**.

## 3. `db:check` — ✅ PASS

`✓ Sem migrations pendentes — schema sincronizado.` (EXIT 0). Datasource, `musicos360_migrations`, ordem e flags de sessão/RLS validados.

## 4. `test:e2e` — ⚠️ 196/197 (1 falha LOW, não-crítica)

`Test Suites: 1 failed, 4 passed` · `Tests: 1 failed, 196 passed`.
- **Harness de isolamento RLS (rls-isolation.e2e-spec) — 100% verde** em ~40 tabelas (SELECT/INSERT/UPDATE/DELETE cross-tenant bloqueados; `42501` no WITH CHECK; herança por FK em `release_works`, `skill_run_logs`, `workflow_execution_logs`). Também verdes: `schema-reconciliation`, `rls/request-context`, `rls/phase3n-context`.
- **Única falha (LOW):** `reports-data` → exportar entidade sem tabela física (`crm_contacts`, legado do refactor CRM) retorna **404**, teste espera **422**. A propriedade de segurança **"nunca 500" se mantém** — é drift de status-code (expectativa do teste vs implementação), **não** defeito de isolamento/segurança.

## 5. `verify:tenant-isolation` — ✅ PASS (7/7)

Conexão owner + `SET ROLE authenticated`. INSERT A/B, SELECT próprio=1, cross-tenant SELECT/UPDATE/DELETE = 0, e sem contexto = 0. `✓ TENANT ISOLATION VALIDADO`.

## 6. `rbac:readiness` — ⛔ BLOCKED (executado; sem amostra SHADOW)

Executou e conectou (EXIT 0), mas **READINESS = REPROVADO**: 0 requests / 0 endpoints / 0 roles observados — `rbac_decision_logs` vazia (nenhum tráfego SHADOW num DB recém-criado). `MULTI_TENANCY = OK` (0 vazamentos). Requer a app rodando em modo SHADOW gerando ≥1000 decisões reais — **bloqueio de tráfego runtime, não defeito de código**.

## 7. `storage:e2e` — ⛔ BLOCKED (documentado)

Não há bucket/credenciais de **R2 de teste**; o script escreveria no **bucket R2 de produção** (proibido pela regra). Conforme critério, marcado **BLOCKED** (não FAIL). Código do smoke está completo (HeadBucket→Put→Get+hash→presigned PUT/GET→List(prefix)+isolamento→Delete+confirm).

## 8. Admin SaaS

Homologação = build de produção → `IS_PROD=true`. A camada `admin-source.ts` já zera mocks quando `IS_PROD` (Support/Audit/Users/Notifications → vazios, **sem fake**, em homologação).

| Tela | Antes | Ação | Estado |
|---|---|---|---|
| **AdminSettings** | `MOCK_WEBHOOKS`/`MOCK_KEYS` + segredo `whsec_…` **inline, não-gated** (fake em homologação/prod) | **Gated por `IS_PROD`** → vazios em homologação/prod | ✅ Corrigido (typecheck verde) |
| **AdminSupport** | `ADMIN_SUPPORT_TICKETS` (mock via admin-source) | Já vazio em homologação (sem fake) | ⚠️ Sem fake; wiring à API real (`GET /support-tickets` existe) pendente |
| **AdminAudit** | `ADMIN_AUDIT_LOGS` (mock via admin-source) | Já vazio em homologação (sem fake) | ⚠️ Sem fake; wiring à API real (`GET /audit-logs` existe) pendente |
| **AdminKnowledge** | `useKnowledgeArticles` (**localStorage**) + `MOCK_KNOWLEDGE_CATEGORIES`, **não-gated** | — (sem backend de KB) | ❌ Gap: localStorage/mock em homologação |

**Critério "sem mock/localStorage/runtime fake em homologação":** atendido para Settings/Support/Audit; **pendente para Knowledge** (requer backend de Knowledge Base ou gate explícito).

## 9. Arquivos alterados

- `apps/web/src/modules/admin/pages/AdminSettings.tsx` — gate `IS_PROD` em `MOCK_WEBHOOKS`, `MOCK_KEYS` e no segredo do webhook (import de `@/shared/lib/env`). **Typecheck web PASS.**
- `apps/api/.env` — repontado para o DB local durante a execução e **restaurado** ao final (git-ignored; sem commit).
- `docs/P0_RUNTIME_GATES_EXECUTION_REPORT.md` — este relatório.

## 10. Bloqueadores restantes

| # | Bloqueador | Sev | Nota |
|---|---|---|---|
| B1 | `rbac:readiness` sem amostra SHADOW | P1 | Precisa app em SHADOW gerando ≥1000 decisões |
| B2 | `storage:e2e` sem bucket R2 de teste | P1 | Definir `R2_BUCKET_NAME`+creds de teste |
| B3 | AdminSupport/AdminAudit sem wiring à API real | P2 | Endpoints existem; criar services + `useQuery` + verificar runtime |
| B4 | AdminKnowledge em localStorage | P2 | Sem backend de KB; gate ou implementar API |
| B5 | `reports` export `crm_contacts` → 404 vs 422 | LOW | Alinhar status-code; "nunca 500" já garantido |
| B6 | Produção 66 migrations atrás | P0 (conhecido) | Reconciliação — fora do escopo destes gates |

## 11. Veredito — ⚠️ PARTIAL

| Gate | Resultado |
|---|---|
| `db:check` | ✅ PASS |
| `test:e2e` | ⚠️ 196/197 (1 LOW não-crítico) |
| `verify:tenant-isolation` | ✅ PASS (7/7) |
| `rbac:readiness` | ⛔ BLOCKED (sem tráfego SHADOW) |
| `storage:e2e` | ⛔ BLOCKED (sem bucket teste — documentado, aceitável) |
| Admin SaaS | ⚠️ Settings corrigido; Support/Audit sem fake; Knowledge pendente |

**PASS pleno** exigiria `test:e2e` limpo, `rbac:readiness` PASS (com tráfego) e Admin totalmente sem mock. O núcleo de segurança — **schema íntegro, RLS/FORCE, tenant-isolation A×B e o harness RLS multi-tabela — está 100% verde e comprovado em runtime real** contra um Postgres local. Os pendentes são de **tráfego/infra/produto**, não defeitos de segurança comprovados.

**Produção permaneceu intocada do início ao fim.**
