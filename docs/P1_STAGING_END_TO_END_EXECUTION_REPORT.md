# P1 — Staging via Supabase Branch · Execução End-to-End

> **Data:** 2026-07-03 · Alvo: branch `staging-go-live` (`khnaxcgjnvhhtgkozsif`), **não-prod** (ref ≠ `iundcoubyaiwzqyytvdr`). · **Produção intocada.** · Nenhum arquivo de migration/código/RBAC/RLS/guard/policy alterado.
>
> **Veredito:** ⛔ **NO-GO** para o objetivo end-to-end (pipeline verde), com **ETAPA 1 genuinamente concluída** (ledger reconciliado 79/79 + colunas ausentes criadas). Itens faltantes enumerados abaixo.

---

## ETAPA 1 — Auditoria e reconciliação do ledger · ✅ PASS (executada de verdade)

**Auditoria objeto-a-objeto (evidência SQL no branch):**
- As 4 migrations do delta são **100% idempotentes** (colunas `ADD ... IF NOT EXISTS`; tabelas `CREATE ... IF NOT EXISTS`; índices `IF NOT EXISTS`; seeds `ON CONFLICT DO NOTHING`; policies com `DROP POLICY IF EXISTS` / guarda `DO $$ IF NOT EXISTS`; `ENABLE/FORCE RLS` no-ops).
- **3 migrations de billing já estavam 100% aplicadas:** `billing_subscriptions` +8 colunas, `invoices` +8, `tenant_billing_state` (12 col + CHECK + índice), `payment_events`/`billing_settings`/`billing_plans` (tabelas + 3+1 seeds), 8 índices, 7 policies de billing, FORCE RLS 3/3, functions `app_current_tenant_id()`/`app_is_super_admin()` presentes.
- **Divergência real encontrada:** `PublicArtistRegistration20260630000001` **NÃO** estava aplicada — as 5 colunas em `tenants` (`allow_public_registration`, `public_registration_blocked`, `public_registration_revoked_at`, `public_registration_access_count`, `public_registration_conversion_count`) estavam **ausentes (0/5)**. Isto provou que um "INSERT cego" das 4 linhas teria mascarado um bug.

**Reconciliação (via MCP, como `postgres`/owner — não-prod):**
```sql
BEGIN;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS allow_public_registration boolean NOT NULL DEFAULT true, ... (5 colunas);
INSERT INTO musicos360_migrations ("timestamp", name) VALUES
  (260630000001,'PublicArtistRegistration20260630000001'),
  (260701000001,'BillingEnforcement20260701000001'),
  (260701000002,'BillingPlans20260701000002'),
  (260701000003,'BillingRlsHardening20260701000003');
COMMIT;
```
**Verificação pós-reconciliação:** `ledger_total = 79` ✅ · `tenants_pubreg_cols = 5` ✅ · 4 nomes registrados ✅ · `public_tables = 146`.

**Resultado:** `db:migrate` contra o branch agora é **no-op limpo** (79/79 registradas, todos os objetos presentes) → **nenhuma migration pendente tenta recriar objeto existente**. Critério de aprovação da ETAPA 1 atendido.

**Rollback (se necessário):**
```sql
DELETE FROM musicos360_migrations WHERE name IN
 ('PublicArtistRegistration20260630000001','BillingEnforcement20260701000001','BillingPlans20260701000002','BillingRlsHardening20260701000003');
-- colunas: down() de PublicArtistRegistration (ALTER TABLE tenants DROP COLUMN IF EXISTS ... × 5)
```

## ETAPA 2 — Connection strings · ⛔ BLOCKED

- MCP conecta como `postgres` (canal SQL), mas **não expõe a senha** do banco. Sem senha, não há `STAGING_DATABASE_URL`/`STAGING_APP_DATABASE_URL`.
- **DB direto é IPv6-only e inalcançável** desta máquina (evidência: `db.khnaxcgjnvhhtgkozsif.supabase.co` só resolve `AAAA`; `Test-NetConnection :5432 = False`). Runners do GitHub Actions (IPv4) precisariam do **pooler** (`aws-0-<region>.pooler.supabase.com`) + senha.
- **Não rotacionei** a senha de `postgres` do branch: é ação disruptiva num branch persistente (dessincroniza a senha exibida no Dashboard). Rotação/obtenção é ação do operador no Dashboard.

## ETAPA 3 — API staging · ⛔ NO-GO (bloqueio determinante)

- A API é **container-based** (`apps/api/Dockerfile`) e **stateful**: NestJS long-running + **BullMQ/Redis** + WebSocket + workers + cron. Não há config serverless (nenhum `fly.toml`/`render.yaml`/`vercel.json`).
- **Ferramental de deploy disponível = apenas Vercel** (serverless) → **não hospeda** este runtime. Sem provider de container (Fly/Railway/Render/Cloud Run) e **sem meio de provisionar Redis** acessível daqui.
- `STAGING_API_URL` / `STAGING_DEPLOY_WEBHOOK_URL` **não gerados** (seria fabricar).

## ETAPA 4 — Smoke user · ⛔ BLOCKED

- Auth do branch é alcançável (`…supabase.co:443` OK), mas o smoke **depende da API deployada** (ETAPA 3). Token durável exige login em runtime contra a API — inexistente. Não produzo secret durável.

## ETAPA 5 — GitHub secrets · ⛔ BLOCKED

- Dos 6, apenas `STAGING_SMOKE_TENANT` (UUID) seria um valor real do branch; os outros 5 dependem de senha/API/hook (ETAPAs 2/3/4). **Nada gravado** (política fail-fast do `set-staging-secrets.sh`; não gravar parcial). `gh secret list --env staging` = **0/6**.

## ETAPA 6 — Pipeline staging.yml · ⛔ BLOCKED

- Não despachado. Sem os 6 secrets + API + hook, `migrations-staging`/`deploy-staging`/`smoke-staging` falhariam/não rodariam. Nenhum run id/gate a registrar.

---

## Veredito Final: ⛔ NO-GO (itens faltantes exatos)

| # | Item faltante | Responsável | Por quê |
|---|---|---|---|
| 1 | Senha do DB do branch → `STAGING_DATABASE_URL` + `STAGING_APP_DATABASE_URL` (host **pooler**, IPv4) | Operador (Dashboard) | MCP não expõe senha; rotacionar é disruptivo |
| 2 | API staging deployada (container host + Redis) → `STAGING_API_URL` | Operador (provider) | Sem provider de container/Redis acessível; Vercel não hospeda |
| 3 | Deploy hook → `STAGING_DEPLOY_WEBHOOK_URL` | Operador (provider) | Depende do item 2 |
| 4 | Smoke tenant + token durável → `STAGING_SMOKE_TENANT`/`STAGING_SMOKE_TOKEN` | Operador/automação | Depende da API (item 2) |
| 5 | 6/6 GitHub secrets + dispatch do `staging.yml` | Operador | Depende de 1–4 |

**Entregue de fato nesta execução:** ETAPA 1 (reconciliação de ledger 79/79 + criação das 5 colunas `tenants` ausentes, com auditoria e rollback documentados). Isso remove definitivamente a ressalva de ledger da FASE 4 e garante `migrations-staging` limpo quando o restante for provisionado.

**Produção permaneceu intocada. Somente fatos observados foram registrados; nada foi fabricado.**
