# P1 — Staging Secrets · Handoff Operacional (mínimo do workflow)

> **Data:** 2026-07-03 · **Nada foi gravado** (recursos externos ainda não provisionados; sem placeholders; sem produção; sem secrets no chat/commit).

## Estado verificado (read-only)

| Item | Status |
|---|---|
| Repo `landersolucoestech-maker/MUSIC-OS-360-LANDER` | ✅ acessível (público, default `main`) |
| GitHub Environment `staging` | ✅ existe |
| Secrets já gravados em `staging` | **0** (vazio) |
| `gh` autenticado | ✅ conta `landersolucoestech-maker`, scopes `repo`+`workflow` |

## Secrets exigidos pelo workflow atual (`.github/workflows/staging.yml`)

Somente **6** — os demais da lista ampla (Supabase keys, Redis, R2, Stripe, Resend, Sentry) **não são referenciados** por este workflow e não devem ser gravados agora.

| # | Secret | Onde é usado no `staging.yml` |
|---|---|---|
| 1 | `STAGING_DATABASE_URL` | job `migrations-staging`: `db:migrate` + `verify:rls`/`verify:tenant-isolation` |
| 2 | `STAGING_APP_DATABASE_URL` | mesmo job (conexão app-role NOBYPASSRLS) |
| 3 | `STAGING_DEPLOY_WEBHOOK_URL` | job `deploy-staging` (deploy hook do provider) |
| 4 | `STAGING_API_URL` | job de smoke (URL pública da API staging) |
| 5 | `STAGING_SMOKE_TOKEN` | smoke: Bearer de usuário smoke |
| 6 | `STAGING_SMOKE_TENANT` | smoke: tenant permitido do usuário smoke |

## Comandos prontos (executar SÓ com valores reais de staging)

`gh secret set` pede o valor de forma interativa (não vai para histórico/chat). **Não** use `--body` para evitar deixar o valor no histórico do shell.

```bash
gh secret set STAGING_DATABASE_URL      --env staging --repo landersolucoestech-maker/MUSIC-OS-360-LANDER
gh secret set STAGING_APP_DATABASE_URL  --env staging --repo landersolucoestech-maker/MUSIC-OS-360-LANDER
gh secret set STAGING_DEPLOY_WEBHOOK_URL --env staging --repo landersolucoestech-maker/MUSIC-OS-360-LANDER
gh secret set STAGING_API_URL           --env staging --repo landersolucoestech-maker/MUSIC-OS-360-LANDER
gh secret set STAGING_SMOKE_TOKEN       --env staging --repo landersolucoestech-maker/MUSIC-OS-360-LANDER
gh secret set STAGING_SMOKE_TENANT      --env staging --repo landersolucoestech-maker/MUSIC-OS-360-LANDER
```

> Dica p/ arquivo sem eco: `gh secret set NOME --env staging --repo … < caminho/para/valor.txt` e apague o arquivo depois (`shred -u`). Nunca commitar o arquivo.

## Origem esperada de cada valor

| Secret | Origem / como obter | Formato |
|---|---|---|
| **STAGING_DATABASE_URL** | Connection string **owner** (bypassrls) do Postgres **staging acessível pela internet** (Supabase staging project/branch, RDS, Neon…). GitHub Actions roda remoto → **não pode ser localhost/Docker local**. Usada para `db:migrate`. | `postgresql://<owner>:<senha>@<host>:5432/<db>?sslmode=require` |
| **STAGING_APP_DATABASE_URL** | Connection string da **app-role `musicos_app` NOBYPASSRLS** no **mesmo** DB staging (para exercer RLS). | `postgresql://musicos_app:<senha>@<host>:5432/<db>?sslmode=require` |
| **STAGING_DEPLOY_WEBHOOK_URL** | **Deploy hook** real do provider de staging (Vercel/Fly/Railway/Render). Ex.: Vercel Deploy Hook URL. | `https://…/deploy/hook/…` |
| **STAGING_API_URL** | **URL pública** da API staging deployada (host, sem sufixo `/api/v1` — o smoke concatena o path). | `https://staging-api.<domínio>` |
| **STAGING_SMOKE_TOKEN** | **JWT válido** de um usuário smoke em staging. ⚠️ **JWT expira** (Supabase default 1h) → como secret estático quebra depois. Preferir: (a) um endpoint/serviço que **emite** o token no início do smoke, ou (b) token de vida longa emitido para o usuário smoke. | JWT `Bearer` |
| **STAGING_SMOKE_TENANT** | `tenant_id` do qual o usuário smoke é **membro** em staging (deve casar com o `app_metadata.org_id` do token). | UUID |

## Checklist antes de executar o workflow

- [ ] DB staging **provisionado e acessível pela internet** (não local); `musicos_app` NOBYPASSRLS criado + grants.
- [ ] `STAGING_DATABASE_URL` (owner) e `STAGING_APP_DATABASE_URL` (app-role) apontam para o **mesmo** DB **staging**.
- [ ] API staging **deployada**; `STAGING_API_URL` responde `/health`.
- [ ] `STAGING_DEPLOY_WEBHOOK_URL` = hook do **ambiente staging** (não prod).
- [ ] `STAGING_SMOKE_TOKEN` válido/não-expirado; `STAGING_SMOKE_TENANT` = tenant do usuário smoke.
- [ ] Os 6 secrets gravados: validar com
  `gh secret list --env staging --repo landersolucoestech-maker/MUSIC-OS-360-LANDER`
- [ ] **Nenhum** valor aponta para produção (ver riscos abaixo).
- [ ] Só então acionar o `staging.yml` (`workflow_dispatch` ou push em `staging`).

## Riscos se algum valor apontar para produção (BLOQUEADORES)

| Secret → prod | Consequência |
|---|---|
| `STAGING_DATABASE_URL` → DB de **produção** | **CRÍTICO:** `db:migrate` aplicaria as migrations em **produção** (é exatamente a reconciliação de +66 que NÃO pode rodar automaticamente). Perda de controle da janela. |
| `STAGING_APP_DATABASE_URL` → app-role de **prod** | Escritas/probes RLS contra dados de produção. |
| `STAGING_API_URL` → API de **prod** | Smoke test bate em produção (pode criar/mutar dados reais). |
| `STAGING_SMOKE_TOKEN`/`STAGING_SMOKE_TENANT` → tenant **prod** | Smoke opera sobre tenant real de produção. |
| `STAGING_DEPLOY_WEBHOOK_URL` → hook de **prod** | Dispararia **deploy de produção** a partir do pipeline de staging. |

**Regra:** o `staging.yml` já é escopado ao environment `staging` (aprovação/segredos isolados). Mantenha os valores exclusivamente de recursos **staging/test-mode**; nunca reutilize connection strings, tokens, hooks ou tenant de produção.

## O que fica pendente do operador (não executável autonomamente)

Provisionar os recursos hospedados que dão os **valores** reais: DB staging (Supabase project/branch ou outro Postgres público) + `musicos_app`, API staging deployada, deploy hook, usuário/token/tenant smoke. Depois, gravar via os comandos acima e validar com `gh secret list`.

> Os secrets de R2/Stripe/Resend/Sentry/Redis/Supabase-keys **não** são exigidos por este workflow — deixar para quando o `staging.yml` evoluir para consumi-los (evita secrets órfãos).
