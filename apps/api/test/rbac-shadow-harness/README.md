# RBAC SHADOW E2E Harness (PASSO 12-J.5)

Gera **tráfego HTTP real autenticado** contra a API de **staging** para popular
`rbac_decision_logs` (modo `RBAC_PERSISTED_AUTHORITY=SHADOW`) e permitir o GO/NO-GO
de cutover do RBAC persistido.

> **Não** insere/edita/apaga linhas em `rbac_decision_logs`. A API as grava sozinha ao
> processar cada request real. **Não** mocka JWT/tenant/guards. **Nunca** commitar segredos.

## Pré-requisitos
- API deployada em staging com a instrumentação 12-J.3A e `RBAC_PERSISTED_AUTHORITY=SHADOW`.
- Migrations Enterprise 001–007 aplicadas + `04_rbac_seed` (catálogo 130 / 887 grants).
- **Usuários reais de homologação** (1 por role) que sejam **membros** de ≥3 tenants de staging.

## Configuração (.env — não commitar)
```env
STAGING_API_URL=https://staging-api.exemplo.com
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=...

RBAC_HARNESS_TENANT_A=<tenant_id_A>
RBAC_HARNESS_TENANT_B=<tenant_id_B>
RBAC_HARNESS_TENANT_C=<tenant_id_C>

RBAC_HARNESS_OWNER_EMAIL=...      RBAC_HARNESS_OWNER_PASSWORD=...
RBAC_HARNESS_ADMIN_EMAIL=...      RBAC_HARNESS_ADMIN_PASSWORD=...
RBAC_HARNESS_MANAGER_EMAIL=...    RBAC_HARNESS_MANAGER_PASSWORD=...
RBAC_HARNESS_EDITOR_EMAIL=...     RBAC_HARNESS_EDITOR_PASSWORD=...
RBAC_HARNESS_VIEWER_EMAIL=...     RBAC_HARNESS_VIEWER_PASSWORD=...
# opcionais (preferenciais):
RBAC_HARNESS_ACCOUNTING_EMAIL=... RBAC_HARNESS_ACCOUNTING_PASSWORD=...
RBAC_HARNESS_ARTIST_EMAIL=...     RBAC_HARNESS_ARTIST_PASSWORD=...

# alvos (opcional; defaults entre parênteses)
RBAC_HARNESS_TARGET_REQUESTS=5000   # (1000)
RBAC_HARNESS_TARGET_ENDPOINTS=20    # (10)
RBAC_HARNESS_TARGET_RESOURCES=5     # (5)
RBAC_HARNESS_TARGET_ROLES=5         # (5)
RBAC_HARNESS_TARGET_TENANTS=3       # (3)
```

## Execução
```bash
# 1) gerar tráfego real (popula rbac_decision_logs via API)
pnpm --filter @music-os-360/api rbac:shadow:run

# 2) decidir GO/NO-GO (lê rbac_decision_logs, somente leitura)
DATABASE_URL=<staging_db_url> DB_SSL=false \
  pnpm --filter @music-os-360/api rbac:shadow:go-no-go
```

## O que o runner faz
1. Autentica cada role via **Supabase password grant** (token real).
2. Para cada `role × tenant × controller × ação` da matriz (`rbac-shadow-harness.matrix.ts`),
   envia request real com headers `Authorization`, `X-Tenant-ID`, `X-Request-ID`, `X-Trace-ID`.
3. Roles **sem** permissão executam mesmo assim e validam **403** (gera `DENY_MATCH` legítimo).
4. Repete READS até atingir o alvo de requests.
5. Recursos criados levam marcador `metadata.testRunId` + `createdBy: rbac-shadow-harness`;
   o harness tenta **limpar via API** (DELETE) ao final, respeitando RBAC. Cleanup bloqueado é reportado.
6. Salva resumo em `test/rbac-shadow-harness/out/harness-run-<runId>.json`.

## Critério de aprovação (aplicado pelo go-no-go)
```
requests≥1000 ∧ endpoints≥10 ∧ roles≥5 ∧ tenants≥3
∧ would_allow=0 ∧ would_deny=0 ∧ cross_tenant=0 ∧ resolver_divergence=0
```
Atendido → `APROVADO — APTO PARA ON`. Caso contrário → `REPROVADO — MANTER SHADOW`.

## Segurança
- Somente requests reais; sem bypass de Auth/Tenant/Roles/Permissions guards.
- Sem manipulação direta de banco. Sem segredos no repositório.
- Reversão do cutover (após ON) é por flag (`RBAC_PERSISTED_AUTHORITY=SHADOW`/`OFF`), instantânea.
