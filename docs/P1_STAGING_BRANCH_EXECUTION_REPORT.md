# P1 — Staging via Supabase Branch · Execution Report

> **Data:** 2026-07-03 · **Produção intocada** (nenhuma migration/escrita/credencial/bucket/Stripe/Resend/Sentry de produção usada) · **Nenhum código/migration/RBAC/RLS/guard/policy alterado.** · **Nenhum branch novo criado** (custo zero — validado o branch existente, como a FASE 1 permite: "criar OU validar").
>
> **Veredito:** ⚠️ **PARTIAL** — o branch Supabase **é** um ambiente de staging funcional e não-prod (FASES 1 e 3 PASS; FASE 4 schema presente com ressalva de ledger). A cadeia de secrets/API/deploy/smoke/workflow (FASES 2, 5, 6, 7, 8) permanece **bloqueada por infra/credenciais que não são acessíveis autonomamente daqui** (o MCP não expõe a senha do DB do branch; não há provider de deploy; token smoke não é durável).

---

## Correção de um relatório anterior

`docs/P1_STAGING_FINAL_READINESS_REPORT.md` afirmou "não existe projeto/branch Supabase de staging". Isso estava **incompleto**: `list_projects` (MCP) só lista projetos **top-level** (prod + MaidFlow), **não** os branches. `list_branches` no projeto de prod revela o branch **`staging-go-live`** (`khnaxcgjnvhhtgkozsif`), que **existe, está ACTIVE_HEALTHY e serve como DB de staging**. Este relatório substitui aquela conclusão no que diz respeito à existência do DB de staging.

## Ambiente utilizado

- **Branch:** `staging-go-live` · **project_ref:** `khnaxcgjnvhhtgkozsif` · **parent:** `iundcoubyaiwzqyytvdr` (prod) · **status:** ACTIVE_HEALTHY.
- **Endpoint próprio (Auth/API):** `https://khnaxcgjnvhhtgkozsif.supabase.co`.
- **Não é produção:** ref `khnaxcgjnvhhtgkozsif` ≠ ref de prod `iundcoubyaiwzqyytvdr`.

---

## FASE 1 — Criar/validar Supabase Branch · ✅ PASS

| Critério | Resultado | Evidência (MCP) |
|---|---|---|
| Branch ativo | ✅ ACTIVE_HEALTHY | `list_branches` → `staging-go-live` FUNCTIONS_DEPLOYED / ACTIVE_HEALTHY |
| Branch ≠ produção | ✅ | project_ref `khnaxcgjnvhhtgkozsif` ≠ prod `iundcoubyaiwzqyytvdr` |
| project_ref próprio | ✅ | `khnaxcgjnvhhtgkozsif` |
| Auth próprio | ✅ | endpoint `https://khnaxcgjnvhhtgkozsif.supabase.co`; roles `anon/authenticated/service_role` presentes; `auth.jwt()` presente |
| Banco próprio | ✅ | `current_database()=postgres`; **146 tabelas** em `public` |

**Não criei branch novo** — validei o existente (custo zero, respeitando "não criar novo projeto").

## FASE 2 — Connection strings do branch · ⛔ BLOCKED (ação do operador via Dashboard)

- **Bloqueio factual:** o MCP Supabase **não expõe a senha do banco** do branch (não há tool que retorne a connection string com senha). Sem a senha, **não é possível** construir `STAGING_DATABASE_URL` nem `STAGING_APP_DATABASE_URL`.
- Isso é **exatamente** o que a FASE 2 previa ("No Supabase Dashboard do branch, obter... Preencher localmente"): é uma ação de operador no Dashboard, não automatizável daqui.
- **Nada foi colado no chat** (nenhuma senha/URL existe para colar).

**Como o operador desbloqueia (fato):** Supabase Dashboard → branch `staging-go-live` → Project Settings → Database →
1. `Connection string` (owner/`postgres`) → gravar em `.secrets/staging/STAGING_DATABASE_URL`.
2. Para a app-role: definir/rotacionar a senha de `musicos_app` (SQL editor do branch: `ALTER ROLE musicos_app WITH PASSWORD '...';`) e montar a URL `postgresql://musicos_app:<senha>@<host>:5432/postgres?sslmode=require` → gravar em `.secrets/staging/STAGING_APP_DATABASE_URL`.

## FASE 3 — app-role `musicos_app` no branch · ✅ PASS

| Critério | Resultado | Evidência (SQL no branch) |
|---|---|---|
| Existe | ✅ | `pg_roles` → `musicos_app` presente |
| LOGIN | ✅ | `rolcanlogin = true` |
| NOBYPASSRLS | ✅ | `rolbypassrls = false` |
| NOSUPERUSER | ✅ | `rolsuper = false` |
| member of `authenticated` | ✅ | `pg_auth_members` → `musicos_app` ∈ `authenticated` |
| grants necessários | ✅ | `has_table_privilege('musicos_app','public.artists','select') = true` |

`current_user = musicos_app` / `rolbypassrls = false` — critérios atendidos.

## FASE 4 — Migrations no branch · ⚠️ PARTIAL

**Não executei `db:migrate`/`db:check` via pnpm** — esses scripts exigem a connection string (senha) que o MCP não expõe (mesmo bloqueio da FASE 2). Validação feita por inspeção SQL direta:

| Critério | Resultado | Evidência |
|---|---|---|
| Schema presente | ✅ | 146 tabelas, **128 FORCE RLS**, **213 policies** (= estado do código atual) |
| RLS/FORCE/policies presentes | ✅ | idem acima; billing: 4 tabelas + 7 policies |
| Ledger de migrations 100% | ⚠️ **75/79** | `musicos360_migrations` registra 75; última = `CreateRbacErrorLogs20260621000001` |
| Sem pendências | ⚠️ **drift** | as 4 mais recentes do repo **não estão no ledger**, porém **seus objetos já existem** |

**Delta de ledger (4 migrations do repo ausentes no `musicos360_migrations`):**
`20260630000001_PublicArtistRegistration`, `20260701000001_BillingEnforcement`, `20260701000002_BillingPlans`, `20260701000003_BillingRlsHardening`.

**Achado:** as tabelas dessas migrations **já existem** no branch — `billing_plans`, `billing_settings`, `payment_events`, `tenant_billing_state` (+ 7 policies). Ou seja, o **schema está à frente do ledger**: o branch foi provisionado por um caminho de reconcile/superset, não pelo runner TypeORM. **Consequência real:** rodar `db:migrate` tentaria aplicar as 4 e **poderia conflitar** em objetos já existentes. Reconciliação necessária antes de um `db:migrate` limpo (registrar as 4 linhas em `musicos360_migrations` como aplicadas, ou garantir idempotência) — **não feito** (fora do escopo "não alterar migrations"; e não executável sem a connection string).

## FASE 5 — API staging · ⛔ BLOCKED

- Nenhum provider de deploy configurado. A API é NestJS **long-running** (BullMQ/Redis/WebSocket), não serverless; publicá-la exigiria (a) a connection string do branch (senha — indisponível) e (b) uma instância Redis (inexistente). **Não é provisionável autonomamente daqui.**
- `STAGING_API_URL` / `STAGING_DEPLOY_WEBHOOK_URL` **não gerados** (gerar valores seria fabricar evidência).

## FASE 6 — Smoke user · ⛔ BLOCKED (token não durável)

- Poderia criar um usuário no Auth do branch, mas `STAGING_SMOKE_TOKEN` como **GitHub secret estático** seria um **JWT de vida curta** (expira ~1h) → inútil para o workflow (smoke falharia após expirar). Além disso, o smoke depende da **API deployada** (FASE 5). **Não produzo um secret real e durável aqui.**
- `STAGING_SMOKE_TENANT` (UUID) isolado não tem valor sem o restante da cadeia.

## FASE 7 — Gravar GitHub secrets · ⛔ BLOCKED

- `scripts/set-staging-secrets.sh` está pronto e validado (barreiras anti-produção, leitura de arquivos gitignored, sem `--body`, sem eco).
- Porém há **0 valores utilizáveis** para `.secrets/staging/*` (FASES 2, 5, 6 bloqueadas). **Nada gravado** — `gh secret list --env staging` continua **0/6**.

## FASE 8 — Executar staging.yml · ⛔ BLOCKED / não despachado

- Sem os 6 secrets, `migrations-staging` falha em `test -n "$DATABASE_URL"`; `deploy-staging`/`smoke-staging` estão gated a `refs/heads/staging` e exigem hook/API inexistentes.
- **Não despachei** o workflow (despachar sem insumos = falha garantida + nenhum sinal útil). Nenhum run id/gate/smoke a registrar (registrar seria fabricar).

---

## Tabela consolidada

| Fase | Item | Status |
|---|---|---|
| 1 | Branch staging funcional (ativo, não-prod, ref/Auth/DB próprios) | ✅ PASS |
| 2 | Connection strings (owner + app-role) → secrets | ⛔ BLOCKED (Dashboard; MCP não expõe senha) |
| 3 | app-role `musicos_app` (LOGIN, NOBYPASSRLS, grants, member authenticated) | ✅ PASS |
| 4 | Migrations 100% / sem pendências | ⚠️ PARTIAL (schema presente; ledger 75/79 com drift) |
| 5 | API staging deployada | ⛔ BLOCKED (sem provider/Redis/senha) |
| 6 | Smoke user + token | ⛔ BLOCKED (token JWT não durável; depende da API) |
| 7 | 6/6 GitHub secrets | ⛔ BLOCKED (0/6 — sem valores utilizáveis) |
| 8 | staging.yml verde | ⛔ BLOCKED (não despachado) |
| — | Produção intocada | ✅ |
| — | Evidências fabricadas | ✅ nenhuma |

## Veredito Final

⚠️ **PARTIAL.** O objetivo "usar um Supabase Branch como staging" é **viável e parcialmente comprovado**: o branch `staging-go-live` está validado como **DB de staging real, não-prod, com schema do código atual, RLS/FORCE/policies e a app-role `musicos_app` correta** (FASES 1 e 3 PASS; FASE 4 com schema presente e ressalva de ledger 75/79). Não atinge **PASS** porque os critérios de PASS incluem **API deployada, smoke PASS e workflow PASS**, que dependem de:

1. **Senha do DB do branch** (Dashboard → FASES 2/7). *O MCP não a expõe.*
2. **Provider de deploy da API + Redis** (FASE 5).
3. **Smoke user com token durável** (FASE 6, atrelada à API).

## Handoff exato para chegar a PASS

1. Dashboard do branch `staging-go-live`: copiar connection string (owner) e definir senha de `musicos_app`; preencher `.secrets/staging/STAGING_DATABASE_URL` e `STAGING_APP_DATABASE_URL`.
2. Reconciliar o ledger antes do `db:migrate` do workflow: registrar as 4 migrations ausentes como aplicadas **ou** confirmar idempotência (evita conflito por objetos já existentes).
3. Publicar a API apontando para o branch (+ Redis) → `.secrets/staging/STAGING_API_URL` e `STAGING_DEPLOY_WEBHOOK_URL`.
4. Criar tenant + usuário smoke no Auth do branch → `.secrets/staging/STAGING_SMOKE_TENANT`; para `STAGING_SMOKE_TOKEN`, usar um mecanismo durável (ex.: o smoke fazer login e mintar o token em runtime, ou service token de longa duração).
5. `./scripts/set-staging-secrets.sh` → confirmar `gh secret list --env staging` = **6/6**.
6. Disparar `staging.yml` na branch `staging` → validar quality / migrations-staging / db:check / verify:rls / verify:tenant-isolation / deploy-staging / smoke-staging.

Com isso, reexecuto a validação e há caminho para **GO/PASS** com evidência runtime real.

**Produção permaneceu intocada. Somente fatos observados foram registrados.**
