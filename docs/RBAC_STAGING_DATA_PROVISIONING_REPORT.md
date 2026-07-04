# RBAC STAGING DATA PROVISIONING REPORT - MUSIC OS 360

Data: 2026-07-02
Escopo: preparar ambiente minimo para desbloquear `rbac:readiness` usando mecanismos oficiais.

Regras aplicadas:

- Nao alterar codigo de negocio.
- Nao alterar guards.
- Nao alterar permissions existentes manualmente.
- Nao alterar migrations.
- Nao alterar RLS.
- Nao commitar secrets.
- Nao inserir decision logs manualmente.
- Nao mockar resultados.

## 1. Veredito

**PARTIAL**

O provisionamento local avancou nas partes que podiam ser executadas com seguranca:

- `db:seed` oficial executado.
- Catalogo RBAC populado: 130 permissions e 887 role_permissions.
- 3 tenants de harness criados no mesmo `org_id` usando a seed function oficial `seedDefaultTenant`.

O fechamento completo foi bloqueado no passo de criacao de usuarios reais via Supabase service-role. A execucao do script oficial `provision-staging-rbac-users.ts` foi impedida por risco de alvo ambiguo: o ambiente local possui service-role configurada, mas nao ha evidencia suficiente de que ela aponte para um branch/projeto Supabase staging isolado. Sem essa confirmacao, criar usuarios reais poderia mutar o projeto errado.

`rbac:readiness` continua **REPROVADO** porque `rbac_decision_logs` segue sem trafego real.

## 2. Fase 1 - Auditoria De Seeds RBAC

### Seeds oficiais localizados

| Arquivo | Responsabilidade | Status |
|---|---|---|
| `apps/api/src/database/seeds/01_default_tenant.ts` | cria organization, tenant e billing subscription base | Usado nesta fase |
| `apps/api/src/database/seeds/02_admin_user.ts` | cria `org_members` admin/owner padrao | Usado por `db:seed` |
| `apps/api/src/database/seeds/04_rbac_seed.ts` | cria catalogo global RBAC: `permissions`, `roles`, `role_permissions` | Usado nesta fase |
| `apps/api/src/database/seeds/05_org_structure_seed.ts` | cria departments, positions e job_functions por tenant | Usado por `db:seed` |
| `apps/api/src/database/seeds/index.ts` | runner oficial `db:seed` | Usado nesta fase |

### Scripts oficiais localizados

| Arquivo/script | Responsabilidade | Status |
|---|---|---|
| `apps/api/scripts/provision-staging-rbac-users.ts` | cria usuarios reais no Supabase e memberships nos tenants informados | Bloqueado por seguranca antes de executar |
| `apps/api/test/rbac-shadow-harness/rbac-shadow-harness.runner.ts` | gera trafego HTTP real autenticado contra staging | Nao executado porque faltam usuarios/credenciais |
| `apps/api/scripts/rbac-shadow-readiness.ts` | le `rbac_decision_logs` e calcula readiness | Executado |
| `apps/api/scripts/rbac-shadow-go-no-go.ts` | go/no-go alternativo somente leitura | Nao executado nesta fase |

### Entidades esperadas pelo harness

Fonte: `apps/api/test/rbac-shadow-harness/README.md` e `rbac-shadow-harness.config.ts`.

| Entidade/config | Exigido | Observado apos provisionamento parcial |
|---|---:|---:|
| Tenants | >= 3 no mesmo `org_id` | 3 criados no mesmo `org_id` |
| Roles | >= 5 | 20 roles globais |
| Permissions | catalogo RBAC aplicado | 130 permissions |
| Role permissions | grants RBAC aplicados | 887 role_permissions |
| Usuarios reais Supabase | owner/admin/manager/editor/viewer | Bloqueado |
| Memberships | cada usuario membro dos 3 tenants | Bloqueado |
| Decision logs SHADOW | >=1000 requests | 0 |

## 3. Fase 2 - Provisionamento Executado

### 3.1 Catalogo RBAC

Comando:

```bash
corepack.cmd pnpm --filter @music-os-360/api db:seed
```

Resultado:

- PASS.
- `permissions`: 130.
- `roles`: 20 globais.
- `role_permissions`: 887.

Observacao: o seed e idempotente e usa `ON CONFLICT DO NOTHING` para permissions/grants. Nao houve alteracao manual de permission/grant.

### 3.2 Tenants de harness

Mecanismo usado: funcao oficial `seedDefaultTenant` chamada via `tsx`, sem alterar codigo.

Tenants criados/atualizados:

| Label | Tenant ID | Org ID | Slug | Status |
|---|---|---|---|---|
| tenant A | `90000000-0000-4000-8000-0000000000a1` | `90000000-0000-4000-8000-000000000001` | `rbac-harness-a` | ativo |
| tenant B | `90000000-0000-4000-8000-0000000000b2` | `90000000-0000-4000-8000-000000000001` | `rbac-harness-b` | ativo |
| tenant C | `90000000-0000-4000-8000-0000000000c3` | `90000000-0000-4000-8000-000000000001` | `rbac-harness-c` | ativo |

### 3.3 Usuarios reais e memberships

Status: **BLOCKED**.

Script oficial preparado:

```bash
tsx scripts/provision-staging-rbac-users.ts
```

Motivo do bloqueio: a execucao exigia `STAGING_SUPABASE_SERVICE_ROLE_KEY`/service-role e criaria usuarios reais no Supabase. A revisao de seguranca bloqueou o comando porque o ambiente ainda nao foi provado como branch/projeto Supabase staging isolado. O risco e mutar o projeto errado.

Nao houve tentativa alternativa nem workaround.

## 4. Fase 3 - Configuracao Do Harness

Variaveis ainda ausentes em `.env` e `apps/api/.env`:

- `STAGING_API_URL`
- `RBAC_HARNESS_TENANT_A`
- `RBAC_HARNESS_TENANT_B`
- `RBAC_HARNESS_TENANT_C`
- `RBAC_HARNESS_OWNER_EMAIL`
- `RBAC_HARNESS_OWNER_PASSWORD`
- `RBAC_HARNESS_ADMIN_EMAIL`
- `RBAC_HARNESS_ADMIN_PASSWORD`
- `RBAC_HARNESS_MANAGER_EMAIL`
- `RBAC_HARNESS_MANAGER_PASSWORD`
- `RBAC_HARNESS_EDITOR_EMAIL`
- `RBAC_HARNESS_EDITOR_PASSWORD`
- `RBAC_HARNESS_VIEWER_EMAIL`
- `RBAC_HARNESS_VIEWER_PASSWORD`

Nao foram gravados secrets no repositorio.

## 5. Fase 4 - Execucao

### 5.1 `rbac:shadow:run`

Status: **NAO EXECUTADO**.

Motivo: sem usuarios reais/memberships/credenciais do harness, a execucao falharia antes de gerar trafego. A tentativa anterior ja havia falhado por ausencia de `RBAC_HARNESS_TENANT_A`; nesta fase o blocker principal passou a ser criacao segura dos usuarios reais.

### 5.2 `rbac:readiness`

Comando:

```bash
corepack.cmd pnpm --filter @music-os-360/api rbac:readiness
```

Resultado:

```text
STATUS: PARCIAL
REQUESTS_OBSERVADOS: 0
TENANTS_OBSERVADOS: 0
ROLES_OBSERVADAS: 0
ENDPOINTS_OBSERVADOS: 0
ALLOW_MATCH: 0
DENY_MATCH: 0
WOULD_ALLOW: 0
WOULD_DENY: 0
CACHE: RISCO
MULTI_TENANCY: OK
OBSERVABILIDADE: PARCIAL
READINESS: REPROVADO
RBAC_PERSISTED_AUTHORITY: SHADOW
PROMOCAO PARA ON: NAO
```

## 6. Totais Finais

| Metrica | Exigido | Observado | Status |
|---|---:|---:|---|
| Requests observados | >=1000 | 0 | FAIL |
| Decisions observadas | >=1000 esperado por trafego | 0 | FAIL |
| Endpoints | >=10 | 0 | FAIL |
| Resources | >=5 | 0 | FAIL |
| Roles em decision logs | >=5 | 0 | FAIL |
| Tenants em decision logs | >=3 | 0 | FAIL |
| Divergencias | 0 | 0 | PASS |
| Cross-tenant | 0 | 0 | PASS |
| Readiness final | APROVADO | REPROVADO | FAIL |
| Promocao para ON | SIM | NAO | FAIL |

## 7. Inventario Atual Do Banco Local

| Tabela | Count |
|---|---:|
| `tenants` | 6 |
| `organizations` | 5 |
| `org_members` | 1 |
| `roles` | 20 |
| `permissions` | 130 |
| `role_permissions` | 887 |
| `rbac_decision_logs` | 0 |
| `audit_logs` | 0 |

Harness tenants:

| Tenant | Org | Slug |
|---|---|---|
| `90000000-0000-4000-8000-0000000000a1` | `90000000-0000-4000-8000-000000000001` | `rbac-harness-a` |
| `90000000-0000-4000-8000-0000000000b2` | `90000000-0000-4000-8000-000000000001` | `rbac-harness-b` |
| `90000000-0000-4000-8000-0000000000c3` | `90000000-0000-4000-8000-000000000001` | `rbac-harness-c` |

## 8. Risco Arquitetural Identificado

O runbook e o script `provision-staging-rbac-users.ts` assumem que os tenants A/B/C pertencendo ao mesmo `org_id` permite ao mesmo JWT alternar tenants via `X-Tenant-ID`.

Evidencia em codigo:

- `provision-staging-rbac-users.ts` exige que todos os tenants pertençam a uma unica organizacao.
- `TenantGuard` chama `resolveTenant(auth.orgId)` antes de validar o header.
- `TenantBootstrapResolver.resolveTenant(orgId)` retorna apenas um tenant com `LIMIT 1`.
- `TenantGuard` depois chama `resolveMembership(tenant.id, auth.userId)` usando o tenant resolvido, nao necessariamente o tenant do header.

Risco: mesmo com users/memberships criados nos 3 tenants, o harness pode falhar para tenants B/C se o tenant resolvido pelo `auth.orgId` for sempre o primeiro tenant da organizacao. Como a fase proibe alterar guards, isso nao foi corrigido nesta etapa.

Acao necessaria posterior, com task/RFC apropriada: alinhar o contrato do harness com o comportamento do `TenantGuard`, ou ajustar o guard para resolver pelo `X-Tenant-ID` validado dentro da organizacao.

## 9. Arquivos Alterados

Arquivo criado:

- `docs/RBAC_STAGING_DATA_PROVISIONING_REPORT.md`

Arquivos de codigo alterados:

- Nenhum.

Estado de dados local alterado por mecanismos oficiais:

- `db:seed` populou RBAC/global seeds.
- `seedDefaultTenant` criou/atualizou os 3 tenants de harness.

## 10. Proximo Passo Seguro

Para concluir esta fase com `READINESS = APROVADO`, e necessario confirmar explicitamente um alvo staging isolado antes de usar service-role:

1. Confirmar que `SUPABASE_URL`/service-role pertencem a um branch/projeto staging descartavel, nao producao.
2. Exportar em memoria:
   - `STAGING_SUPABASE_URL`
   - `STAGING_SUPABASE_SERVICE_ROLE_KEY`
   - `STAGING_DATABASE_URL`
   - `STAGING_TENANT_IDS=90000000-0000-4000-8000-0000000000a1,90000000-0000-4000-8000-0000000000b2,90000000-0000-4000-8000-0000000000c3`
   - `PROVISION_CONFIRM=YES`
   - `PROVISION_PASSWORD=<senha temporaria segura>`
3. Executar `provision-staging-rbac-users.ts`.
4. Configurar `RBAC_HARNESS_*` localmente, sem commitar secrets.
5. Subir API apontada ao mesmo DB/Auth de staging.
6. Executar:

```bash
corepack.cmd pnpm --filter @music-os-360/api rbac:shadow:run
corepack.cmd pnpm --filter @music-os-360/api rbac:readiness
```

7. Aprovar somente se:

```text
READINESS:
APROVADO

PROMOCAO PARA ON:
SIM
```

## 11. Veredito Final

**PARTIAL**

O ambiente de dados local foi parcialmente preparado com seeds oficiais e tenants de harness no mesmo org. O fechamento definitivo do `rbac:readiness` permanece bloqueado porque a criacao de usuarios reais via Supabase service-role nao foi autorizada em um alvo staging inequivoco, e sem usuarios/credenciais reais nao ha trafego SHADOW autentico para popular `rbac_decision_logs`.
