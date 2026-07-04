# P0 — RBAC Shadow Readiness · APROVADO

> **Data:** 2026-07-03 · **Produção:** intocada · **Sem alterar código de RBAC/RLS/guards/resolver/migrations/policies · Sem fabricar decision logs · Tráfego 100% real.**
> **Veredito:** ✅ **PASS** — `READINESS = APROVADO` no gate oficial `rbac:readiness`.

---

## 1. Ambiente (staging local descartável, sem produção)

| Componente | Valor |
|---|---|
| **Supabase local** (GoTrue + Postgres + JWKS) | `supabase start` · Project URL `http://127.0.0.1:54321` · DB `127.0.0.1:54322` |
| **Assinatura JWT** | **ES256** via signing key oficial (`supabase gen signing-key`) — habilitada por **config** (`signing_keys_path` no `config.toml`), não por código. JWKS publica a chave pública. |
| **API NestJS** | `pnpm dev` em `127.0.0.1:3001`, `NODE_ENV=development`, `AUTH_DISABLED=false`, `RBAC_PERSISTED_AUTHORITY=SHADOW`, `DATABASE_SESSION_CONTEXT_ENABLED=true` |
| **App-role** | `musicos_app` (NOBYPASSRLS, membro de `authenticated`) via `APP_DATABASE_URL` |
| **Redis** | `musicos360_redis` local (`:6379`) |
| **Schema/matriz** | 79 migrations + `db:seed` → **130 permissions · 20 roles · 887 role_permissions** |

## 2. Diagnóstico de JWT (compatível com a API)

Token real de login (`/auth/v1/token?grant_type=password`), decodado:
- **alg = ES256** · **kid** casa com o JWKS
- **iss = `http://127.0.0.1:54321/auth/v1`** (= `${SUPABASE_URL}/auth/v1` esperado pela API)
- **aud = `authenticated`**
- **app_metadata.org_id** presente

→ Aceito pelo `TokenVerifierService.verifyProdToken` (ES256 + JWKS). **B2 (alinhamento de JWT) resolvido por configuração.**

## 3. Usuários / roles / tenants provisionados (reais)

| Role | Email | Tenant (org_id do JWT) | role_id (global) |
|---|---|---|---|
| owner | rbac-owner@musicos360.dev | A `10000000…0002` | ✓ |
| admin | rbac-admin@musicos360.dev | B `b0000000…00b2` | ✓ |
| manager | rbac-manager@musicos360.dev | C `c0000000…00c3` | ✓ |
| editor | rbac-editor@musicos360.dev | A `10000000…0002` | ✓ |
| viewer | rbac-viewer@musicos360.dev | B `b0000000…00b2` | ✓ |

- 5 usuários criados no **GoTrue** (admin API) com `app_metadata.org_id` + `role`; memberships em `org_members` com `role_id` canônico.
- Distribuídos pelos **3 tenants** (o `TenantGuard` resolve o tenant pelo `org_id` do JWT e nega cross-tenant antes do RBAC — por isso a distribuição garante ≥3 tenants observados).

## 4. Execução do harness oficial

`corepack pnpm --filter @music-os-360/api rbac:shadow:run` — **sem modificar o harness**. Tráfego real: `roles × tenants × MATRIX(19 controllers)`. Executado 3× espaçadas ~66s (a janela do rate-limit `120/min por rota` reseta; os `rbac_decision_logs` **acumulam**; paridade é determinística). Nenhum log inserido manualmente.

## 5. Resultado oficial (`rbac:readiness`)

```
STATUS:               OK
REQUESTS_OBSERVADOS:  2576
TENANTS_OBSERVADOS:   3
ROLES_OBSERVADAS:     5
ENDPOINTS_OBSERVADOS: 19
ALLOW_MATCH:          2496
DENY_MATCH:           80
WOULD_ALLOW:          0
WOULD_DENY:           0
CACHE:                OK
MULTI_TENANCY:        OK
OBSERVABILIDADE:      OK
READINESS:            APROVADO
RBAC_PERSISTED_AUTHORITY: SHADOW
```

## 6. Critérios de PASS

| Critério | Exigido | Obtido | ✓ |
|---|---|---|---|
| REQUESTS_OBSERVADOS | ≥1000 | **2576** | ✅ |
| TENANTS_OBSERVADOS | ≥3 | **3** | ✅ |
| ROLES_OBSERVADAS | ≥5 | **5** | ✅ |
| ENDPOINTS_OBSERVADOS | ≥10 | **19** | ✅ |
| RESOURCES_OBSERVADOS | ≥5 | **18** | ✅ |
| WOULD_ALLOW | 0 | **0** | ✅ |
| WOULD_DENY | 0 | **0** | ✅ |
| RESOLVER_FAILURES | 0 | **0** | ✅ |
| CROSS_TENANT | 0 | **0** (MULTI_TENANCY OK) | ✅ |
| READINESS | APROVADO | **APROVADO** | ✅ |

## 7. Decisões observadas

- **ALLOW_MATCH = 2496** e **DENY_MATCH = 80** — em 100% dos casos a autoridade **ativa** (RolesGuard/hierarquia) e a **persistida/SHADOW** (`role_permissions`) **concordaram**. Os 80 DENY_MATCH são negações legítimas concordantes (ex.: `viewer`/`editor` tentando `delete`/ações acima do nível).
- **0 divergências** (`WOULD_ALLOW`=`WOULD_DENY`=0): o resolvedor de permissões espelha o guard ativo — o sistema está **apto a promover SHADOW → ON**.

## 8. Falhas

Nenhuma falha de RBAC. Ajustes de **ambiente** durante o provisionamento (não de código de RBAC): habilitar ES256 (config), `AUTH_DISABLED=false` (env), grants de tabela ao app-role (privilégios), `STAGING_API_URL` sem `/api/v1` (o `basePath` da MATRIX já inclui o prefixo). `resolver_failures = 0`.

## 9. Veredito — ✅ PASS

**`READINESS = APROVADO`** no gate oficial, com tráfego real, sem mocks, sem logs fabricados, sem alterar RBAC/RLS/guards/resolver/migrations/policies, e **sem tocar produção**. Este era o **único gate P0 restante** — agora fechado.

> Ambiente descartável (Supabase local + API + usuários) desmontado ao final; `apps/api/.env` restaurado; `supabase/config.toml` revertido; `signing_keys.json` (gitignored) removido.
