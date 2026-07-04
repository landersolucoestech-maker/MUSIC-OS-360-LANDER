# RBAC SHADOW VALIDATION REPORT - MUSIC OS 360

Data: 2026-07-02
Escopo: validacao do bloqueador `rbac:readiness` em modo SHADOW.

Regras aplicadas:

- Nao alterar migrations.
- Nao alterar schema.
- Nao alterar RLS.
- Nao alterar permissoes existentes.
- Nao inserir decision logs sinteticos.
- Nao mockar resultados.
- Usar somente trafego real para popular `rbac_decision_logs`.

## 1. Veredito

**FAIL**

Motivo: `rbac:readiness` executou, mas retornou `READINESS: REPROVADO` com 0 requests, 0 decisions, 0 endpoints, 0 resources, 0 roles e 0 tenants observados em `rbac_decision_logs`.

O harness oficial de trafego real nao conseguiu iniciar porque variaveis obrigatorias de tenants e credenciais RBAC nao estao configuradas em `apps/api/.env`. Como o criterio exige amostra real e a tarefa proibe mockar resultados, nao foi possivel gerar as >=1000 decisoes exigidas.

## 2. Authority Mode Atual

| Item | Resultado | Evidencia |
|---|---|---|
| `RBAC_PERSISTED_AUTHORITY` em `.env` raiz | MISSING | checagem sanitizada de env |
| `RBAC_PERSISTED_AUTHORITY` em `apps/api/.env` | MISSING | checagem sanitizada de env |
| Modo efetivo no codigo | SHADOW | `apps/api/src/core/rbac/rbac-authority-mode.ts` retorna `SHADOW` quando env nao e `OFF/SHADOW/ON` e `RBAC_PERMISSION_ENFORCEMENT` nao e `true` |
| Default no schema de env | SHADOW | `apps/api/src/core/config/env.schema.ts` define `RBAC_PERSISTED_AUTHORITY` default `SHADOW` |
| Readiness reportado pelo script | SHADOW | `rbac:readiness` imprime `RBAC_PERSISTED_AUTHORITY: SHADOW` |

## 3. Persistencia De Decision Logs

| Item | Resultado | Evidencia |
|---|---|---|
| Tabela `rbac_decision_logs` | EXISTS | consulta local retornou `TABLE=rbac_decision_logs` |
| Persistencia | IMPLEMENTADA | `apps/api/src/core/rbac/rbac-telemetry.service.ts` faz `INSERT INTO rbac_decision_logs` |
| Auditoria espelho | IMPLEMENTADA | `RbacTelemetryService` tambem grava `audit_logs` quando `RBAC_AUDIT_MIRROR_ENABLED` nao e `false` |
| Migration | EXISTS | `apps/api/src/database/migrations/20260614000008_CreateRbacDecisionLogs.ts` cria tabela particionada, indices e RLS |
| Logs atuais | EMPTY | agregados locais indicam 0 decisions |

## 4. Criterios Exigidos Pelo Readiness

Fonte: `apps/api/scripts/rbac-shadow-readiness.ts`.

| Criterio | Exigido | Atual | Status |
|---|---:|---:|---|
| Requests distintos | >= 1000 | 0 | FAIL |
| Endpoints distintos | >= 10 | 0 | FAIL |
| Resources distintos | >= 5 | 0 | FAIL |
| Roles distintas | >= 5 | 0 | FAIL |
| Tenants distintos | >= 3 | 0 | FAIL |
| `WOULD_ALLOW` | 0 | 0 | PASS |
| `WOULD_DENY` | 0 | 0 | PASS |
| Resolver failures | 0 | 0 | PASS |
| Cross-tenant role mismatch | 0 | 0 | PASS |

Resultado funcional: **READINESS REPROVADO**.

Observacao tecnica: o comando retornou exit code 0 mesmo com `READINESS: REPROVADO`; portanto o texto do output e o criterio funcional sao a evidencia determinante.

## 5. Ambiente De Validacao Local

| Tabela | Count |
|---|---:|
| `tenants` | 3 |
| `organizations` | 3 |
| `org_members` | 0 |
| `roles` | 20 |
| `permissions` | 0 |
| `role_permissions` | 0 |
| `rbac_decision_logs` | 0 |

Conclusao: existe base local com tenants e roles, mas nao ha memberships, permissions, grants nem decision logs. Esse estado nao e suficiente para gerar readiness real sem provisionamento de usuarios/memberships/permissoes e sem credenciais do harness.

## 6. Harness Oficial

Fonte: `apps/api/test/rbac-shadow-harness/rbac-shadow-harness.runner.ts`.

Fatos:

- O harness faz requests HTTP reais contra `STAGING_API_URL`.
- Autentica usuarios reais via Supabase password grant.
- Envia `Authorization`, `X-Tenant-ID`, `X-Request-ID` e `X-Trace-ID`.
- Nao escreve diretamente em `rbac_decision_logs`.
- A API deve popular os logs ao processar cada request.
- O reporter agrega resultados HTTP, mas o go/no-go/readiness continua lendo `rbac_decision_logs`.

## 7. Variaveis Do Harness

Checagem sanitizada em `.env` e `apps/api/.env`.

| Arquivo | Obrigatorias presentes | Obrigatorias ausentes |
|---|---:|---|
| `.env` | 2/16 | `STAGING_API_URL`, `RBAC_HARNESS_TENANT_A`, `RBAC_HARNESS_TENANT_B`, `RBAC_HARNESS_TENANT_C`, `RBAC_HARNESS_OWNER_EMAIL`, `RBAC_HARNESS_OWNER_PASSWORD`, `RBAC_HARNESS_ADMIN_EMAIL`, `RBAC_HARNESS_ADMIN_PASSWORD`, `RBAC_HARNESS_MANAGER_EMAIL`, `RBAC_HARNESS_MANAGER_PASSWORD`, `RBAC_HARNESS_EDITOR_EMAIL`, `RBAC_HARNESS_EDITOR_PASSWORD`, `RBAC_HARNESS_VIEWER_EMAIL`, `RBAC_HARNESS_VIEWER_PASSWORD` |
| `apps/api/.env` | 2/16 | `STAGING_API_URL`, `RBAC_HARNESS_TENANT_A`, `RBAC_HARNESS_TENANT_B`, `RBAC_HARNESS_TENANT_C`, `RBAC_HARNESS_OWNER_EMAIL`, `RBAC_HARNESS_OWNER_PASSWORD`, `RBAC_HARNESS_ADMIN_EMAIL`, `RBAC_HARNESS_ADMIN_PASSWORD`, `RBAC_HARNESS_MANAGER_EMAIL`, `RBAC_HARNESS_MANAGER_PASSWORD`, `RBAC_HARNESS_EDITOR_EMAIL`, `RBAC_HARNESS_EDITOR_PASSWORD`, `RBAC_HARNESS_VIEWER_EMAIL`, `RBAC_HARNESS_VIEWER_PASSWORD` |

## 8. Comandos Executados

### 8.1 `rbac:readiness`

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

### 8.2 `rbac:shadow:run`

Comando:

```bash
corepack.cmd pnpm --filter @music-os-360/api rbac:shadow:run
```

Resultado:

```text
[harness] ERRO: [harness] variavel obrigatoria ausente: RBAC_HARNESS_TENANT_A
```

## 9. Totais Solicitados

| Metrica | Exigido | Obtido | Status |
|---|---:|---:|---|
| Total requests | >= 1000 | 0 | FAIL |
| Total decisions | >= 1000 esperado por trafego | 0 | FAIL |
| Resources | >= 5 | 0 | FAIL |
| Roles | >= 5 | 0 | FAIL |
| Tenants | >= 3 | 0 | FAIL |
| Endpoints | >= 10 | 0 | FAIL |
| Divergencias | 0 | 0 | PASS |
| Cross-tenant | 0 | 0 | PASS |
| Readiness final | PASS | REPROVADO | FAIL |

## 10. Falhas E Bloqueadores

### P0-RBAC-001 - Sem amostra real em `rbac_decision_logs`

- FATO: `rbac_decision_logs` existe, mas esta vazia.
- IMPACTO: `rbac:readiness` nao atende os criterios minimos.
- ACAO NECESSARIA: gerar trafego real via harness oficial.
- CRITERIO: `rbac_decision_logs` deve conter >=1000 requests SHADOW cobrindo >=10 endpoints, >=5 resources, >=5 roles e >=3 tenants.

### P0-RBAC-002 - Harness sem configuracao obrigatoria

- FATO: `rbac:shadow:run` aborta por ausencia de `RBAC_HARNESS_TENANT_A`.
- FATO: tambem faltam tenants B/C, `STAGING_API_URL` e credenciais das roles obrigatorias owner/admin/manager/editor/viewer.
- IMPACTO: nao ha como gerar trafego real sem mock.
- ACAO NECESSARIA: configurar no ambiente local/CI de staging, sem commitar secrets:
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
- CRITERIO: `rbac:shadow:run` executa ate salvar relatorio em `apps/api/test/rbac-shadow-harness/out`.

### P0-RBAC-003 - Base local sem grants/memberships

- FATO: `org_members=0`, `permissions=0`, `role_permissions=0`.
- IMPACTO: mesmo com tenants/roles existentes, nao ha matriz persistida suficiente para validacao real de permissao.
- ACAO NECESSARIA: provisionar dados reais de staging ou seeds de validacao aprovados que criem memberships, permissions e grants sem alterar regras de autorizacao.
- CRITERIO: harness autentica 5 roles reais e cobre 3 tenants reais.

## 11. Arquivos Alterados

Arquivo criado:

- `docs/RBAC_SHADOW_VALIDATION_REPORT.md`

Arquivos de codigo alterados:

- Nenhum.

## 12. Proximo Passo Recomendado

1. Provisionar ambiente de staging/homologacao com:
   - 3 tenants reais.
   - 5 usuarios reais, um por role obrigatoria: owner, admin, manager, editor, viewer.
   - Memberships ativos desses usuarios nos tenants de teste.
   - Permissoes e grants persistidos existentes conforme matriz oficial.
2. Configurar as variaveis do harness somente em ambiente local/CI seguro, sem commitar secrets.
3. Executar:

```bash
corepack.cmd pnpm --filter @music-os-360/api rbac:shadow:run
corepack.cmd pnpm --filter @music-os-360/api rbac:readiness
```

4. Aprovar somente se o output final indicar:

```text
READINESS:
APROVADO
```

## 13. Veredito Final

**FAIL**

Nao foi possivel fechar definitivamente o bloqueador `rbac:readiness` nesta rodada porque a base nao possui logs SHADOW reais e o harness oficial nao esta configurado com tenants/credenciais de staging. Qualquer tentativa de inserir logs diretamente ou fabricar amostra violaria as regras da fase.
