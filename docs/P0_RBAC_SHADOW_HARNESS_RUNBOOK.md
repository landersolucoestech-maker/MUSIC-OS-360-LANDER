# P0 — RBAC Shadow Harness · Runbook + Status

> **Data:** 2026-07-03 · **Produção:** intocada · **Nada executado nesta rodada** (decisão: entregar runbook + marcar BLOCKED).
> **Veredito:** ⛔ **BLOCKED** (infra) — o gate exige um **API deployado não-produtivo + Supabase Auth (GoTrue) com 5 usuários reais**; não há staging disponível e a emulação local carrega riscos de alinhamento de JWT e de paridade de matriz (ver §6). PASS (`READINESS = APROVADO`) **não** é alcançável sem esse ambiente.

---

## 1. O que o harness realmente exige (evidência de código)

- **`rbac:shadow:run`** (`test/rbac-shadow-harness/rbac-shadow-harness.runner.ts`) autentica **usuários reais via Supabase** (`POST ${SUPABASE_URL}/auth/v1/token?grant_type=password`) e faz **requests HTTP reais** contra `STAGING_API_URL`. Não toca `rbac_decision_logs` — a **API** os popula ao processar cada request.
- **Modo SHADOW é o default** (`core/rbac/rbac-authority-mode.ts`): com `RBAC_PERSISTED_AUTHORITY` ausente e `RBAC_PERMISSION_ENFORCEMENT != 'true'` → `SHADOW`. A API compara a autoridade **ativa** (RolesGuard, por hierarquia) com o resolvedor **persistido** (permissions/`role_permissions`) e grava a comparação.
- **Verificação de JWT** (`core/security/token-verifier.service.ts`): tokens Supabase são validados via **ES256 + JWKS** (`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`); fallback dev é **HS256 com `ENCRYPTION_KEY` + issuer `music-os-360-dev`** (só fora de produção).
- **Resolução de tenant** (`core/guards/tenant.guard.ts`): tenant vem do **`app_metadata.org_id` do JWT**; header **`X-Tenant-ID`** é exigido e conferido; **membership** (`org_members`) é validada. → cada usuário só opera no tenant do seu org; cross-tenant é barrado **antes** do RBAC.
- **`rbac:readiness`** (`scripts/rbac-shadow-readiness.ts`): lê `rbac_decision_logs` em `authority_mode='SHADOW'` e aprova só com **≥1000 requests, ≥10 endpoints, ≥5 resources, ≥5 roles, ≥3 tenants, WOULD_ALLOW=0, WOULD_DENY=0, cross_tenant=0, resolver_failures=0**.

## 2. FASE 1 — Provisionar dados mínimos

Pré-requisito: um Postgres com o schema (79 migrations) + **`db:seed`** (popula `permissions`, `roles`, `role_permissions` via `04_rbac_seed`, e organograma via `05_org_structure_seed`).

```bash
# schema + matriz RBAC
corepack pnpm --filter @music-os-360/api db:migrate
corepack pnpm --filter @music-os-360/api db:seed        # seedRbac + seedOrgStructure
```

Provisionar (idempotente):
- **3 tenants** reais (cada um com `organizations.id`/`org_id`).
- **5 usuários** no **Supabase Auth (GoTrue)** — um por role — com `app_metadata.org_id` apontando ao org do tenant, criados via admin API (service_role):
  - `POST ${SUPABASE_URL}/auth/v1/admin/users` com `{ email, password, email_confirm:true, app_metadata:{ org_id:<org>, role:<role> } }`.
- **Projeção `public.users`** + **`org_members`** (com `role_id` canônico) ligando cada `auth_user_id` ao tenant/role.
- **roles**: `owner(90) · admin(80) · manager(70) · editor(60) · viewer(10)` (níveis em `rbac-shadow-harness.config.ts:ROLE_LEVEL`).
- **permissions** e **role_permissions**: do `db:seed`.

> ⚠️ **Cobertura de 3 tenants (must-validate):** como o tenant é resolvido pelo **org_id do JWT** e cross-tenant é negado antes do RBAC, um único JWT só gera decisões RBAC **no seu próprio tenant**. Para observar **≥3 tenants** com decisões válidas, provisione **cada role em cada tenant** (efetivamente **15 memberships** / usuários por org), ou confirme em runtime a semântica exata `X-Tenant-ID ↔ org_id` do `TenantGuard` antes de reduzir o conjunto.

## 3. FASE 2 — Configurar harness (local, sem commit)

Em `apps/api/.env` (git-ignored) ou export de shell:

```bash
STAGING_API_URL=<https://staging-api/.../api/v1>     # API não-produtiva deployada
SUPABASE_URL=<https://<ref>.supabase.co | http://localhost:54321>
SUPABASE_ANON_KEY=<anon key do MESMO Supabase>
RBAC_HARNESS_TENANT_A=<tenant_id_ou_org_A>
RBAC_HARNESS_TENANT_B=<tenant_id_ou_org_B>
RBAC_HARNESS_TENANT_C=<tenant_id_ou_org_C>
RBAC_HARNESS_OWNER_EMAIL=...      RBAC_HARNESS_OWNER_PASSWORD=...
RBAC_HARNESS_ADMIN_EMAIL=...      RBAC_HARNESS_ADMIN_PASSWORD=...
RBAC_HARNESS_MANAGER_EMAIL=...    RBAC_HARNESS_MANAGER_PASSWORD=...
RBAC_HARNESS_EDITOR_EMAIL=...     RBAC_HARNESS_EDITOR_PASSWORD=...
RBAC_HARNESS_VIEWER_EMAIL=...     RBAC_HARNESS_VIEWER_PASSWORD=...
# opcional: RBAC_HARNESS_TARGET_REQUESTS=1000 (default)
```

A **API** deve rodar com: `SUPABASE_URL`/keys do MESMO projeto Auth, `DATABASE_URL`/`APP_DATABASE_URL` (owner + `musicos_app` NOBYPASSRLS), `REDIS_URL` (há redis local up), `ENCRYPTION_KEY`, e **modo SHADOW** (não setar `RBAC_PERMISSION_ENFORCEMENT=true`).

## 4. FASE 3 — Executar tráfego real

```bash
corepack pnpm --filter @music-os-360/api rbac:shadow:run
```
Faz `roles × tenants × MATRIX(controllers×ações)` + repete READS até `≥1000` requests; cleanup best-effort do que criou. A API grava `rbac_decision_logs` (SHADOW) a cada request.

## 5. FASE 4 — Validar readiness

```bash
corepack pnpm --filter @music-os-360/api rbac:readiness
```
Aprova só se todos os limiares da §1 forem atingidos e `READINESS = APROVADO`.

---

## 6. Blocqueadores técnicos (por que BLOCKED agora)

| # | Blocker | Detalhe |
|---|---|---|
| **B1 — Sem staging deployado** | O harness é desenhado para **API deployada não-produtiva + Supabase Auth**. Não há esse ambiente disponível; produção é proibida. |
| **B2 — Alinhamento de JWT (local)** | Se emular via `supabase start` (CLI v2.67), o GoTrue local pode emitir **HS256 (secret compartilhado)**, mas a API valida Supabase por **ES256/JWKS**. Sem ES256/JWKS local reachable, **todo request → 401** → 0 decisões válidas. Exige configurar signing keys assimétricas locais **ou** um staging real (onde a API já valida os JWTs do próprio Supabase). |
| **B3 — Paridade da matriz (PASS incerto por design)** | `APROVADO` exige `WOULD_ALLOW=0` **e** `WOULD_DENY=0` — o resolvedor SHADOW (`role_permissions`) deve **bater exatamente** com o RolesGuard (hierarquia) em 1000+ requests. O sistema estar ainda em **SHADOW** (não promovido a `ON`) indica que a paridade **não está provada**; uma rodada honesta pode legitimamente dar **REPROVADO com divergências**. |
| **B4 — Cobertura de 3 tenants** | Ver §2: um JWT = um org → precisa de cada role em cada tenant para observar ≥3 tenants com decisões in-tenant. |

## 7. FASE 5 — Relatório (PENDENTE de execução)

| Item | Status |
|---|---|
| 1. Ambiente | ⏳ pendente (requer staging/stack) |
| 2. Usuários/roles/tenants provisionados | ⏳ pendente |
| 3. Requests observados | ⏳ (alvo ≥1000) |
| 4. Decisions observadas (ALLOW/DENY/WOULD_*) | ⏳ |
| 5. Endpoints | ⏳ (alvo ≥10) |
| 6. Resources | ⏳ (alvo ≥5) |
| 7. Roles | ⏳ (alvo ≥5) |
| 8. Tenants | ⏳ (alvo ≥3) |
| 9. Divergências (WOULD_ALLOW/WOULD_DENY) | ⏳ |
| 10. Cross-tenant | ⏳ (alvo 0) |
| 11. Veredito | ⛔ **BLOCKED** (não executado) |

## 8. Como desbloquear

- **Preferido:** apontar `STAGING_API_URL` + `SUPABASE_URL`/`ANON_KEY` para um ambiente **não-produtivo já deployado**; provisionar os 5 usuários (§2) e rodar §4–§5. Sem risco de B2 (a API já valida os JWTs daquele Supabase).
- **Local completo:** `supabase start` + API local em SHADOW + `db:migrate`/`db:seed` + criação dos usuários; **resolver B2** (signing keys ES256/JWKS locais) antes de esperar requests válidos.
- Em ambos: se `readiness = REPROVADO`, o relatório de **divergências** por (resource, action, endpoint, tenant, role) é o entregável de valor para fechar a paridade e promover SHADOW → ON.

**Produção intocada; sem migrations aplicadas; sem Stripe; RLS/RBAC não alterados; PR #3 Draft.**
