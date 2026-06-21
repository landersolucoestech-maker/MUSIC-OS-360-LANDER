# RUNBOOK — STAGING DESCARTÁVEL & GO/NO-GO — MUSIC OS 360

> Preparação executada **sem criar branch, sem tocar produção, sem custo**.
> Este runbook é o roteiro para quando o staging descartável for autorizado.
> Regra absoluta: **nada disto roda contra o projeto Supabase de produção**.

---

## 0. Pré-condições (gate de segurança)

- [ ] Target confirmado como **STAGING_DESCARTAVEL** (branch/projeto isolado, removível).
- [ ] `.env.staging` preenchido a partir de `.env.staging.example` (fora do git).
- [ ] Os 2 segredos não-MCP obtidos do dashboard do branch: `STAGING_SUPABASE_SERVICE_ROLE_KEY` e `STAGING_DATABASE_URL`.
- [ ] `STAGING_APP_DATABASE_URL` = role **NOBYPASSRLS** do branch (senão RLS não se aplica ao tráfego da API).

---

## 1. Mapa script → env (CRÍTICO — nomes NÃO são uniformes)

| Script (pnpm --filter @music-os-360/api) | Variáveis que o script realmente lê | Como exportar a partir do `.env.staging` |
|---|---|---|
| `db:migrate` (db-ops migrate) | `DATABASE_URL`, `DB_SSL`, `NODE_ENV` | `DATABASE_URL=$STAGING_DATABASE_URL` |
| seeds (`db:seed`, `db:seed:operational`) | `DATABASE_URL`, `DB_SSL` | `DATABASE_URL=$STAGING_DATABASE_URL` |
| `provision` (provision-staging-rbac-users) | `STAGING_SUPABASE_URL`, `STAGING_SUPABASE_SERVICE_ROLE_KEY`, `STAGING_DATABASE_URL`, `STAGING_TENANT_IDS`, `PROVISION_CONFIRM=YES`, `PROVISION_PASSWORD?`, `DB_SSL` | usa STAGING_* direto |
| `storage:e2e` | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY`\|`R2_ACCESS_KEY_ID`, `R2_SECRET_KEY`\|`R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` | usa R2_* direto |
| `smoke-test` | `API_URL`, `SMOKE_TOKEN`, `SMOKE_TENANT` (fallback `/dev-auth/token`) | `API_URL=$STAGING_API_URL`, `SMOKE_TOKEN=<jwt real>`, `SMOKE_TENANT=<org_id>` |
| `rbac:shadow:run` (harness) | `STAGING_API_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `RBAC_HARNESS_TENANT_A/B/C`, `RBAC_HARNESS_<ROLE>_EMAIL/PASSWORD`, `RBAC_HARNESS_TARGET_*` | `SUPABASE_URL=$STAGING_SUPABASE_URL`, `SUPABASE_ANON_KEY=$STAGING_SUPABASE_ANON_KEY`, demais STAGING_* já com os nomes certos |
| `rbac:shadow:go-no-go` | `DATABASE_URL`, `DB_SSL` | `DATABASE_URL=$STAGING_DATABASE_URL` |

> Conclusão honesta: **não há prefixo `STAGING_*` uniforme**. O `provision` é o único que lê `STAGING_*`. Os demais leem nomes canônicos (`DATABASE_URL`, `SUPABASE_URL`, `API_URL`) que você seta para os valores de staging na hora da invocação.

---

## 2. Ordem de execução

1. **Criar branch** (autorizado, custo US$0,01344/h) → `create_branch` (migrations do main aplicadas automaticamente).
2. **Configurar `.env.staging`** com URLs + segredos do branch.
3. **Migrations** (idempotente, valida 0 pendentes): `DATABASE_URL=$STAGING_DATABASE_URL DB_SSL=true pnpm --filter @music-os-360/api db:migrate`.
4. **Seeds obrigatórios** (RBAC catálogo/roles/permissions): `... pnpm db:seed && pnpm db:seed:operational`.
5. **Semear 3 tenants** (mesmo `org_id`) — via signup real ou SQL no branch. Anotar os 3 uuids em `STAGING_TENANT_IDS` / `RBAC_HARNESS_TENANT_A/B/C`.
6. **Provisionar 21 usuários**: `PROVISION_CONFIRM=YES STAGING_SUPABASE_URL=… STAGING_SUPABASE_SERVICE_ROLE_KEY=… STAGING_DATABASE_URL=… STAGING_TENANT_IDS=… pnpm --filter @music-os-360/api provision` (na verdade `tsx scripts/provision-staging-rbac-users.ts`).
7. **Subir API/Web** apontando ao branch (local docker ou deploy) com `DATABASE_URL`/`APP_DATABASE_URL`/`SUPABASE_*` de staging.
8. **Health**: `GET $STAGING_API_URL/api/v1/health/live` = 200 e `/health/ready` = 200.
9. **Storage E2E**: `pnpm --filter @music-os-360/api storage:e2e` (8/8).
10. **Smoke E2E autenticado** (ver matriz §4).
11. **RBAC Shadow**: `STAGING_API_URL=… SUPABASE_URL=… SUPABASE_ANON_KEY=… RBAC_HARNESS_* pnpm --filter @music-os-360/api rbac:shadow:run`.
12. **Go/No-Go**: `DATABASE_URL=$STAGING_DATABASE_URL pnpm --filter @music-os-360/api rbac:shadow:go-no-go` (exit 0 = APROVADO).
13. **Observabilidade**: gerar erro real → Sentry; conferir Prometheus `/metrics`; dashboard RBAC no Grafana.
14. **Backup/restore/rollback** do branch (ver §6).
15. **Relatório final** + `delete_branch`.

---

## 3. Matriz Usuários / Roles / Tenants

- **3 tenants** A, B, C — **mesma organização** (1 `org_id`; `X-Tenant-ID` seleciona o tenant).
- **7 roles** (mínimo 5). Cada usuário-role é **membro dos 3 tenants** (provision concede membership em cada um).

| Email | Role | Nível (hierarquia) | Tenants |
|---|---|---|---|
| rbac-owner@homolog.local | owner | 90 | A, B, C |
| rbac-admin@homolog.local | admin | 80 | A, B, C |
| rbac-manager@homolog.local | manager | 70 | A, B, C |
| rbac-editor@homolog.local | editor | 60 | A, B, C |
| rbac-accounting@homolog.local | accounting | 60 | A, B, C |
| rbac-artist@homolog.local | artist | 30 | A, B, C |
| rbac-viewer@homolog.local | viewer | 10 | A, B, C |

Validar por usuário: `auth_user_id`, membership, `role_id`, JWT `org_id`, `tenant_id`.

---

## 4. Matriz Smoke E2E (0 cenário autenticado ignorado)

| Bloco | Fluxos | Critério |
|---|---|---|
| Auth | signup, login, logout, reset password, onboarding | sem 5xx, JWT com org_id |
| Núcleo | dashboard, reports | 200, dados do tenant correto |
| RBAC UI | users, roles, permissions | viewer NÃO acessa tela crítica |
| Catálogo | artists, catalog, releases | CRUD scoped por tenant |
| Negócio | contracts, financial | 200, tenant isolation |
| Relacionamento | crm, marketing | 200 |
| Atendimento | support, musicchat | mensagem persiste, anexo abre |
| Infra de dados | storage upload, notifications, audit logs | upload via presigned, log gerado |
| Segurança transversal | cross-tenant (A↔B), auth bypass | **0 cross-tenant, 0 bypass** |

Por role (owner/admin/manager/editor/viewer) onde aplicável.

---

## 5. Critérios Go/No-Go RBAC (query oficial)

```
requests >= 1000 · endpoints >= 10 · resources >= 5 · roles >= 5 · tenants >= 3
would_allow = 0 · would_deny = 0 · cross_tenant = 0 · resolver_divergence = 0
```

`rbac:shadow:go-no-go` → exit 0 = APROVADO, exit 3 = REPROVADO. **Nunca** fabricar linhas em `rbac_decision_logs` (a API as grava ao processar cada request real).

---

## 6. Rollback / Restore checklist

- [ ] **Branch é descartável**: o rollback primário é `delete_branch` + recriar (`create_branch` reaplica migrations do main). Produção nunca é afetada.
- [ ] **Rollback de migration** (se testar no branch): `CONFIRM_ROLLBACK=… DATABASE_URL=$STAGING_DATABASE_URL pnpm --filter @music-os-360/api db:rollback` (db-ops rollback).
- [ ] **Restore**: recriar branch a partir do main (estado limpo) — não há dado de produção para restaurar.
- [ ] **Limpeza de tráfego**: o harness marca recursos com `metadata.testRunId`/`createdBy: rbac-shadow-harness` e tenta DELETE via API ao final; cleanup bloqueado é reportado.
- [ ] **Encerramento**: `delete_branch` para parar a cobrança.

---

## 7. Checklist de segredos necessários (LISTADOS, não preenchidos)

```
STAGING_API_URL
STAGING_WEB_URL
STAGING_SUPABASE_URL
STAGING_DATABASE_URL
STAGING_APP_DATABASE_URL
STAGING_SUPABASE_SERVICE_ROLE_KEY   ← não exposto via MCP; pegar no dashboard do branch
STAGING_SUPABASE_ANON_KEY
STAGING_TENANT_IDS
RBAC_HARNESS_*_EMAIL
RBAC_HARNESS_*_PASSWORD
PROMETHEUS_URL
GRAFANA_URL
SENTRY_DSN
```

Bloqueadores que dependem **exclusivamente** desses segredos: provisionamento de usuários, smoke autenticado e RBAC Shadow. Tudo o que é código já está validado (RLS+FORCE, Storage R2 E2E, YouTube, 607 testes API / 368 web, builds limpos).
