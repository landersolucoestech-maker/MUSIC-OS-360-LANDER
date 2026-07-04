# PHASE P0 - CRITICAL REMEDIATION AUDIT

Data: 2026-07-01
Projeto: MUSIC OS 360
Escopo: pipeline, testes, banco, multi-tenancy, RBAC, storage, Admin SaaS, codigo morto e readiness de homologacao.

Legenda:

- FATO: comprovado por codigo ou comando executado.
- RISCO: impacto tecnico/operacional.
- PENDENCIA: item ainda nao concluido.
- ACAO NECESSARIA: correcao objetiva.

## 1. Executive Summary

Veredito: **PARTIAL**.

Motivo:

- Pipeline local foi remediado parcialmente e agora passa: `lint`, `typecheck`, `build`, API unit tests e Web tests.
- API unit tests foram corrigidos: 81/81 suites e 681/681 testes passaram.
- Web tests foram corrigidos/configurados: 35/35 arquivos e 395/395 testes passaram quando executados fora da restricao de sandbox.
- Banco, tenant isolation, RBAC readiness, storage e e2e reais continuam falhando.
- Admin SaaS ainda possui mocks e fallback local em arquivos criticos, portanto nao cumpre o criterio "Admin deve usar apenas fonte real".

PASS nao pode ser atribuido porque os criterios obrigatorios exigem todos os gates verdes e Admin sem mocks.

## 2. Pipeline

### Comandos auditados

| Comando | Resultado | Evidencia |
|---|---|---|
| `corepack.cmd pnpm lint` | PASS | 0 errors, 1198 warnings |
| `corepack.cmd pnpm typecheck` | PASS | API e Web typecheck passaram |
| `corepack.cmd pnpm build` | PASS | API build e Web Vite build passaram |

### Achados

#### P0-PIPE-001 - Root lint varria artefatos fora do escopo

- FATO: `eslint .` varria `.tmp`, `.local`, coverage aninhado e `scripts/runtime-visual-validation.mjs`.
- Evidencia: antes da correcao, lint falhava com erro em `.tmp/chrome-cdp` e parsing error em script com bytes invalidos.
- Correcao aplicada:
  - `eslint.config.js` agora ignora `dist/**`, `coverage/**`, `.tmp/**`, `.turbo/**`, `.local/**`, `.validation-shots/**`, `.tmp-audit/**`, `node_modules/**`, `attached_assets/**`, `apps/**/coverage/**`, `apps/**/dist/**`, `packages/**/dist/**` e `scripts/runtime-visual-validation.mjs`.
- Criterio validado: `corepack.cmd pnpm lint` passou.

#### P0-PIPE-002 - Lint RBAC tinha erro `prefer-const`

- FATO: `apps/api/scripts/verify-fase4-rbac.ts` declarava `let SEED_IDS` sem reassignment.
- Correcao aplicada: alterado para `const SEED_IDS`.
- Criterio validado: root lint passou.

### Warnings remanescentes

- FATO: root lint ainda emite 1198 warnings.
- Categorias principais:
  - `@typescript-eslint/no-explicit-any`.
  - `@typescript-eslint/no-require-imports`.
  - `@typescript-eslint/ban-ts-comment`.
  - `react-hooks/exhaustive-deps`.
  - `react-refresh/only-export-components`.
  - `no-empty`.
- RISCO: nao bloqueia pipeline atualmente, mas representa divida tecnica relevante para hardening.
- Prioridade: P2.

## 3. Testes API

### Comando

`corepack.cmd pnpm --filter @music-os-360/api test`

### Resultado

PASS.

- Test Suites: 81 passed, 81 total.
- Tests: 681 passed, 681 total.

### Achados corrigidos

#### P0-API-TEST-001 - Billing tables novas sem categoria de reports

- Arquivo: `apps/api/src/modules/reports/entity-metadata.service.ts`
- Teste afetado: `reports/entity-metadata.service.spec.ts`
- Motivo da falha: tabelas `billing_plans`, `billing_settings`, `payment_events` e `tenant_billing_state` eram classificadas como `UNKNOWN`.
- Correcao aplicada: as tabelas foram mapeadas para `EntityCategory.BILLING`.
- Criterio validado: API test passou 100%.

#### P0-API-TEST-002 - Labels PT-BR ausentes em invoices

- Arquivo: `apps/api/src/modules/reports/i18n/field-labels.pt-br.ts`
- Teste afetado: `report-entity-definition.service.spec.ts`
- Motivo da falha: campos de `invoices` sem labels PT-BR.
- Correcao aplicada: labels adicionadas para `amountDue`, `amountPaid`, `attemptCount`, `hostedInvoiceUrl` e `invoicePdf`.
- Criterio validado: API test passou 100%.

## 4. Testes Web

### Comando

`corepack.cmd pnpm --filter @music-os-360/web test`

### Resultado

PASS com permissao elevada de execucao.

- Test Files: 35 passed, 35 total.
- Tests: 395 passed, 395 total.

### Causa raiz

- FATO: no sandbox restrito, Vitest/esbuild tentava ler `../../../..` atraves de junctions do pnpm e falhava com `Acesso negado`.
- FATO: com permissao elevada, o mesmo comando executou e passou.
- INFERENCIA: o erro inicial era restricao do ambiente/sandbox somada a resolucao de junctions no Windows, nao falha funcional dos testes.

### Correcao aplicada

- Arquivo: `apps/web/vitest.config.mjs`
- Ajustes:
  - `defineConfig` importado de `vitest/config`.
  - `root` fixado em `apps/web`.
  - `cacheDir` isolado em `node_modules/.vite/web-vitest`.
  - `setupFiles` convertido para path absoluto dentro do workspace.

### Pendencia

- PENDENCIA: em ambientes sandboxados, o comando pode exigir permissao para atravessar junctions do pnpm.
- ACAO NECESSARIA: CI normal nao deve usar sandbox restrito; se usar, precisa permitir leitura dos junction targets dentro do workspace.

## 5. Banco

### Comando

`corepack.cmd pnpm --filter @music-os-360/api db:check`

### Resultado

FAIL.

Evidencia:

- `[db:check] Verificando estado das migrations...`
- `AggregateError [ECONNREFUSED]`

### Inventario

- FATO: existem 79 migrations em `apps/api/src/database/migrations`.
- FATO: `.env` contem `DATABASE_URL`.
- FATO: `.env` nao contem `APP_DATABASE_URL`.
- FATO: `.env` nao contem `DATABASE_SESSION_CONTEXT_ENABLED`.
- FATO: `.env` nao contem `DATABASE_RLS_ENFORCEMENT`.

### Matriz de inconsistencias

| Item | Status | Evidencia | Impacto | Acao necessaria |
|---|---|---|---|---|
| Conexao DB local | FAIL | `ECONNREFUSED` | Migrations nao validadas contra banco real | Subir Postgres local/staging e validar `DATABASE_URL` |
| App DB role | PENDENTE | `APP_DATABASE_URL` ausente no `.env` | Nao prova role sem `BYPASSRLS` | Criar app role e configurar `APP_DATABASE_URL` |
| Session context | PENDENTE | env ausente | RLS por contexto nao validado | Definir `DATABASE_SESSION_CONTEXT_ENABLED=true` |
| RLS enforcement | PENDENTE | env ausente | Producao pode operar sem garantia fail-closed | Definir `DATABASE_RLS_ENFORCEMENT=true` |
| Ordem de migrations | PARCIAL | 79 arquivos ordenados por timestamp | Ordem existe, mas aplicacao nao validada | Rodar `db:check` e migrations em DB limpo |
| Rollback/idempotencia | NAO VALIDADO | sem DB runtime | Risco em release | Revisar migrations e testar restore/rollback |

## 6. Multi-Tenancy

### Comando

`corepack.cmd pnpm --filter @music-os-360/api verify:tenant-isolation`

### Resultado

FAIL.

Evidencia:

- Script inicia `MUSIC OS 360 - Fase 18: Tenant Isolation Test`.
- Termina com `[verify:tenant-isolation] Erro fatal:` sem detalhe util.

### E2E relacionado

`corepack.cmd pnpm --filter @music-os-360/api test:e2e`

Resultado: FAIL.

Evidencia:

- 5 suites falharam.
- 197 testes falharam.
- Falhas recorrentes: `AggregateError`, `Cannot read properties of undefined (reading 'query')`, `owner.query` e `ds.query` undefined.
- Suites afetadas:
  - `test/e2e/rls/rls-isolation.e2e-spec.ts`
  - `test/e2e/rls/phase3n-context.e2e-spec.ts`
  - `test/e2e/rls/request-context.e2e-spec.ts`
  - `test/e2e/schema/schema-reconciliation.e2e-spec.ts`
  - `test/e2e/reports/reports-data.e2e-spec.ts`

### Classificacao

- RISCO: ALTO.
- Motivo: arquitetura de TenantGuard/RLS existe, mas isolamento real nao foi comprovado com DB.

### Acao necessaria

1. Provisionar DB de teste acessivel.
2. Rodar migrations.
3. Configurar app role sem `BYPASSRLS`.
4. Reexecutar `db:check`, `test:e2e` e `verify:tenant-isolation`.
5. Ajustar scripts para falharem com mensagem clara quando datasource nao inicializa.

## 7. RBAC

### Comando

`corepack.cmd pnpm --filter @music-os-360/api rbac:readiness`

### Resultado

FAIL.

Evidencia:

- Script `apps/api/scripts/rbac-shadow-readiness.ts` exige `DATABASE_URL`.
- O comando terminou com exit 1 sem relatorio impresso.
- Como `db:check` falha por `ECONNREFUSED`, readiness nao consegue consultar `rbac_decision_logs`.

### Matriz de controllers

| Status | Quantidade/Exemplo | Risco |
|---|---|---|
| Controllers com `@RequirePermission` | 28 controllers aproximadamente | Cobertura granular parcial |
| Controllers sem `@RequirePermission`, mas com `@RequireRole` | 49 controllers aproximadamente | RBAC granular incompleto |
| Controllers sem `@RequireRole` e sem `@RequirePermission` | `dev-auth`, `health`, `public-registration` | Pode ser intencional para publico/health/dev, mas precisa allowlist formal |

### Controllers sem `@RequirePermission` encontrados

Exemplos com superficie relevante:

- `apps/api/src/modules/billing/billing.controller.ts` - 15 rotas.
- `apps/api/src/modules/integrations/integrations.controller.ts` - 56 rotas.
- `apps/api/src/modules/users/users.controller.ts` - 10 rotas.
- `apps/api/src/modules/users/rbac-admin.controller.ts` - 13 rotas.
- `apps/api/src/modules/reports/reports.controller.ts` - 5 rotas.
- `apps/api/src/modules/uploads/uploads.controller.ts` - 3 rotas.
- `apps/api/src/modules/hr/hr.controller.ts` - 10 rotas.
- `apps/api/src/modules/releases/releases.controller.ts` - 5 rotas.
- `apps/api/src/modules/campaigns/campaigns.controller.ts` - 5 rotas.
- `apps/api/src/modules/support-tickets/support-tickets.controller.ts` - 5 rotas.
- `apps/api/src/modules/registry/*` - varias rotas com `@RequireRole`, sem permissao granular.
- `apps/api/src/modules/audiovisual/*` - varias rotas com `@RequireRole`, sem permissao granular.

### Acao necessaria

1. Criar matriz endpoint -> permission.
2. Aplicar `@RequirePermission` em controllers protegidos.
3. Definir allowlist explicita para health, public registration, webhooks e dev-auth.
4. Reexecutar `rbac:readiness` com DB real.

## 8. Storage

### Comando

`corepack.cmd pnpm --filter @music-os-360/api storage:e2e`

### Resultado

FAIL.

| Operacao | Resultado |
|---|---|
| HeadBucket | FAIL |
| PutObject | FAIL |
| GetObject+hash | FAIL |
| Presigned PUT | FAIL - fetch failed |
| Presigned GET | FAIL - fetch failed |
| ListObjects(prefix) | FAIL |
| DeleteObject+confirm | FAIL |

Resumo: 0/7 passos OK.

### Env

- FATO: `.env` contem `R2_ACCOUNT_ID`, `R2_ACCESS_KEY`, `R2_SECRET_KEY` e `R2_BUCKET_NAME`.
- FATO: mesmo com envs presentes, as operacoes reais falham.

### Risco

- ALTO.
- Upload/download real, bucket, permissoes, URLs assinadas e isolamento por prefixo nao estao comprovados.

### Acao necessaria

1. Validar credenciais R2 em staging.
2. Confirmar bucket e permissoes `HeadBucket`, `PutObject`, `GetObject`, `ListObjectsV2`, `DeleteObject`.
3. Reexecutar `storage:e2e`.
4. So considerar storage pronto com 7/7 passos OK e isolamento por tenant validado.

## 9. Admin SaaS

### Resultado

FAIL para criterio "Admin deve usar apenas fonte real".

### Evidencias

- `apps/web/src/modules/admin/data/admin-source.ts`
  - `ADMIN_DATA_IS_MOCK: boolean = !IS_PROD`
  - `ADMIN_TENANTS = IS_PROD ? [] : mocks.MOCK_TENANTS`
  - `ADMIN_SUBSCRIPTIONS = IS_PROD ? [] : mocks.MOCK_SUBSCRIPTIONS`
- `apps/web/src/modules/admin/pages/AdminClients.tsx`
  - importa `ADMIN_TENANTS as MOCK_TENANTS`
  - inicializa estado local com `useState(MOCK_TENANTS)`
  - deriva subscriptions de `MOCK_SUBSCRIPTIONS`
- `apps/web/src/modules/admin/pages/AdminDashboard.tsx`
  - usa `MOCK_TENANTS.slice(0, 5)` e metricas derivadas de mocks.
- `apps/web/src/modules/admin/pages/AdminSubscriptions.tsx`
  - comentario indica modo mock sem backend.
  - inicializa `subs` com `ADMIN_SUBSCRIPTIONS`.
- `apps/web/src/modules/admin/services/admin-plans.service.ts`
  - comentario declara `MOCK_MODE (dev standalone): persiste em localStorage`.

### Risco

- ALTO.
- Super admin pode validar interface que nao opera dados reais em dev/homologacao.
- Fluxos de clientes, subscriptions, dashboards e planos podem divergir do backend.

### Acao necessaria

1. Remover `ADMIN_TENANTS` e `ADMIN_SUBSCRIPTIONS` como fonte das telas admin.
2. Conectar `AdminClients` a endpoint real de tenants.
3. Conectar `AdminSubscriptions` a endpoint real de billing/subscriptions.
4. Separar mocks em fixtures de teste/storybook, nao em fluxo runtime.
5. Criar testes garantindo que build/homologacao nao usa admin mock como fonte.

## 10. Codigo Morto E Artefatos

### Candidatos removiveis com risco baixo

| Item | Evidencia | Risco de remocao | Acao |
|---|---|---|---|
| `.tmp/**` | Artefatos temporarios afetavam lint | Baixo | Manter ignorado e limpar periodicamente |
| `.local/**` | Artefatos de skills entravam no lint | Baixo | Manter fora do pipeline |
| `.validation-shots/**` | Screenshots/artefatos locais | Baixo | Nao versionar como codigo |
| `apps/**/coverage/**` | Relatorios gerados pelo Jest/Vitest | Baixo | Ignorar no lint/CI |
| `scripts/runtime-visual-validation.mjs` | Parsing error com bytes invalidos no lint | Medio | Recriar/normalizar encoding antes de voltar ao lint |

### Candidatos que exigem revisao antes de remover

- `apps/web/_archive/**`: arquivo arquivado encontrado em busca de TODO/mock.
- `apps/web/src/modules/admin/data/mockAdmin.ts`: ainda usado por runtime admin em dev; nao remover antes de trocar telas por API real.
- `apps/web/vite.config.ts` e `apps/web/vite.config.mjs`: contem mock responses de dev; revisar uso antes de remover.
- Hooks/services com `@ts-nocheck` ou mocks: exigem analise por modulo antes de remocao.

## 11. Bloqueadores Remanescentes

### P0

| Bloqueador | Local | Impacto | Criterio de aceite |
|---|---|---|---|
| DB indisponivel para checks | `db:check`, env DB | Schema/migrations nao validados | `db:check` PASS |
| Tenant isolation nao validado | `verify:tenant-isolation`, E2E RLS | Risco cross-tenant alto | `verify:tenant-isolation` PASS |
| RBAC readiness falhando | `rbac:readiness`, controllers | Permissao granular incompleta | `rbac:readiness` PASS e endpoint matrix completa |
| Storage R2 falhando | `storage:e2e` | Upload/download real nao comprovado | 7/7 storage e2e OK |
| Admin SaaS com mocks runtime | `apps/web/src/modules/admin/*` | Admin ilusorio | Admin clients/subscriptions/dashboard usam API real |

### P1

- Reduzir warnings criticos de lint em arquivos de producao.
- Normalizar scripts de test DB para erro claro quando datasource nao inicializa.
- Remover hardcodes/fallbacks de mocks em homologacao.

### P2

- Padronizar OTel/tracing e dashboards.
- Normalizar encoding de scripts/arquivos com mojibake.
- Separar fixtures/mocks em area exclusiva de testes.

### P3

- Remover `any`, `@ts-nocheck` e warnings de fast refresh.
- Revisar chunks grandes do build web.

## 12. Plano De Correcao

### Fase 1 - Fechar banco de teste

- Objetivo: tornar DB verificavel.
- Tarefas:
  - Subir Postgres local/staging.
  - Configurar `DATABASE_URL`, `APP_DATABASE_URL`, `DATABASE_SESSION_CONTEXT_ENABLED=true`, `DATABASE_RLS_ENFORCEMENT=true`.
  - Rodar migrations em DB limpo.
- Criterio: `db:check` PASS.

### Fase 2 - Validar RLS e e2e

- Objetivo: provar isolamento cross-tenant.
- Tarefas:
  - Corrigir harness para abortar com erro claro quando datasource falha.
  - Rodar `test:e2e`.
  - Rodar `verify:tenant-isolation`.
- Criterio: 0 falhas em RLS/schema/reports e2e.

### Fase 3 - Fechar RBAC granular

- Objetivo: sair de cobertura parcial.
- Tarefas:
  - Mapear endpoint -> permission.
  - Aplicar `@RequirePermission`.
  - Definir allowlist formal.
  - Rodar readiness.
- Criterio: `rbac:readiness` PASS.

### Fase 4 - Validar storage real

- Objetivo: comprovar R2.
- Tarefas:
  - Validar credenciais/bucket.
  - Ajustar policy R2 se necessario.
  - Rodar `storage:e2e`.
- Criterio: 7/7 passos OK.

### Fase 5 - Remover Admin mock runtime

- Objetivo: Admin SaaS real em homologacao.
- Tarefas:
  - Conectar clients/subscriptions/dashboard/plans a API.
  - Remover state inicial baseado em mocks.
  - Mover mocks para testes/fixtures.
- Criterio: refresh persiste dados reais; teste garante ausencia de `ADMIN_TENANTS`/`ADMIN_SUBSCRIPTIONS` em telas runtime.

## 13. Veredito

**PARTIAL**

Justificativa:

- PASS seria incorreto porque `db:check`, `verify:tenant-isolation`, `rbac:readiness`, `storage:e2e`, `test:e2e` e Admin sem mocks ainda nao passam.
- FAIL total tambem nao representa o estado apos remediacao local, porque pipeline local, build, typecheck, API unit tests e Web tests estao verdes.
- Estado real: remediacao P0 local concluida parcialmente; readiness enterprise segue bloqueada por DB/RLS/RBAC/storage/Admin.

## 14. Comandos Executados

| Comando | Resultado |
|---|---|
| `corepack.cmd pnpm lint` | PASS, 1198 warnings |
| `corepack.cmd pnpm typecheck` | PASS |
| `corepack.cmd pnpm build` | PASS |
| `corepack.cmd pnpm --filter @music-os-360/api test` | PASS, 81 suites/681 tests |
| `corepack.cmd pnpm --filter @music-os-360/web test` | PASS com permissao elevada, 35 files/395 tests |
| `corepack.cmd pnpm --filter @music-os-360/api db:check` | FAIL, `ECONNREFUSED` |
| `corepack.cmd pnpm --filter @music-os-360/api verify:tenant-isolation` | FAIL, erro fatal sem detalhe util |
| `corepack.cmd pnpm --filter @music-os-360/api rbac:readiness` | FAIL, exit 1 |
| `corepack.cmd pnpm --filter @music-os-360/api storage:e2e` | FAIL, 0/7 passos OK |
| `corepack.cmd pnpm --filter @music-os-360/api test:e2e` | FAIL, 5 suites/197 tests por DB/datasource |

