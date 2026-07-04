# AUDITORIA TECNICA COMPLETA DO PROJETO

Data: 2026-07-01  
Projeto: MUSIC OS 360  
Escopo auditado: monorepo, frontend, backend, banco/migrations, seguranca, multi-tenancy, billing, storage, integracoes, testes, CI/CD, UX/UI e documentacao.

Legenda:

- **FATO:** evidencia encontrada no codigo ou em comando executado.
- **INFERENCIA:** conclusao tecnica derivada das evidencias.
- **RISCO:** impacto possivel em seguranca, producao, dados ou operacao.
- **PENDENCIA:** item nao finalizado ou nao validado.
- **ACAO NECESSARIA:** correcao objetiva.

## 1. Resumo executivo

- **O projeto esta pronto para producao?** Nao.
- **O projeto esta pronto para MVP?** Parcialmente. Compila e possui muitos modulos, mas testes criticos falham, validacoes de banco/RLS/storage nao passam no ambiente atual e ainda existem fluxos mockados/standalone.
- **O projeto esta tecnicamente consistente?** Parcialmente. A arquitetura tem base modular forte, mas ha divergencia entre frontend, backend, testes e metadata de relatorios.
- **O projeto tem base enterprise?** Sim. Ha NestJS modular, React/Vite modular, TypeORM, migrations, RLS, guards globais, auditoria, billing Stripe, filas, observabilidade e runbooks/documentos.
- **Maior risco atual:** falsa sensacao de completude por telas e mocks no frontend enquanto validacoes reais de DB/RLS/storage/testes nao estao verdes.
- **Principal bloqueador:** suite critica e verificacoes de producao nao passam: API tests falham, web tests nao inicializam, `db:check`, `verify:tenant-isolation`, `storage:e2e` e `test:e2e` falham.
- **Prioridade numero 1:** estabilizar pipeline real: corrigir testes, ambiente local/staging de Postgres/R2, lint raiz e readiness de RLS/RBAC/billing/storage.

## 2. Status geral

**Classificacao:** PARCIALMENTE FUNCIONAL.

Justificativa tecnica:

- `corepack pnpm typecheck` passou.
- `corepack pnpm --filter @music-os-360/api build` passou.
- `corepack pnpm --filter @music-os-360/web build` passou.
- API e Web lint por app passam, mas com alta divida: 657 warnings na API e 345 warnings no Web.
- `corepack pnpm lint` raiz falhou por varrer `.tmp/chrome-cdp/...`, ou seja, o pipeline raiz esta mal delimitado.
- `corepack pnpm --filter @music-os-360/api test` falhou: 2 suites falhando, 2 testes falhando, 679 passando.
- `corepack pnpm --filter @music-os-360/web test` falhou antes de iniciar por erro de resolucao/permissao do `vitest.config.mjs`.
- `db:check`, `verify:tenant-isolation`, `storage:e2e` e `test:e2e` falharam.

## 3. O que esta funcionando

| Area | Arquivo/modulo | Evidencia tecnica | Status |
|---|---|---|---|
| Monorepo | `package.json`, `pnpm-workspace.yaml`, `apps/*`, `packages/*` | Estrutura detectada com apps web/api e packages | Funcional |
| Frontend build | `apps/web` | `corepack pnpm --filter @music-os-360/web build` passou | Funcional |
| Backend build | `apps/api` | `corepack pnpm --filter @music-os-360/api build` passou | Funcional |
| Typecheck geral | root | `corepack pnpm typecheck` passou | Funcional |
| API modular | `apps/api/src/app.module.ts` | 66 modules, guards globais, interceptors e modulos de dominio | Base enterprise |
| Auth backend | `core/guards/auth.guard.ts` | Valida Supabase JWT via JWKS ES256 e audiencia `authenticated` | Parcial/funcional |
| Tenant guard | `core/guards/tenant.guard.ts` | Exige `X-Tenant-ID`, resolve tenant/membership | Parcial/funcional |
| Billing guard | `core/guards/billing-enforcement.guard.ts` | Bloqueia `read_only` e `suspended` no backend | Parcial/funcional |
| Stripe webhook | `modules/billing/billing.service.ts` | Usa rawBody e `stripe.webhooks.constructEvent` | Parcial/funcional |
| Storage presign | `modules/uploads/uploads.controller.ts` | Presign, confirm e download assinado encontrados | Parcial/funcional |
| RLS migrations | `apps/api/src/database/migrations` | Varias migrations habilitam RLS/FORCE RLS e policies | Nao validado em runtime |
| Observabilidade | `main.ts`, health/metrics | Helmet, Sentry, Prometheus/metrics e health encontrados | Parcial |
| Documentacao | `docs/*.md` | Blueprint, Plano Master, MFS, MTIS, EBE, ADOS, EE existem | Funcional como artefato |

## 4. O que esta incompleto

| Funcionalidade | O que existe | O que falta | Impacto | Prioridade |
|---|---|---|---|---|
| Pipeline raiz | Scripts root existem | `lint` raiz ignora mal `.tmp` e artefatos | CI pode falhar por arquivo irrelevante | P0 |
| Testes API | 679 testes passam | 2 testes falham em reports/entity metadata | Release bloqueado | P0 |
| Testes Web | Vitest configurado | Test runner nao inicia no ambiente atual | Sem garantia funcional UI | P0 |
| DB/migrations | 79 migrations | `db:check` nao conecta ao DB local | Nao ha prova de schema aplicado | P0 |
| Tenant isolation | RLS e e2e existem | `verify:tenant-isolation` e e2e falham | Vazamento cross-tenant nao validado | P0 |
| Storage | R2 service e presign existem | `storage:e2e` 0/7 passos OK | Upload/download real nao validado | P0 |
| RBAC | Guards e persisted authority SHADOW | Muitos controllers sem `@RequirePermission`; readiness falha | Permissao granular inconsistente | P0 |
| Admin SaaS | Telas admin existem | Fontes mock/local ainda aparecem em admin-source e paginas | Admin pode operar dado nao real | P0 |
| Billing | Stripe, estado e guard existem | Feature gates/limits ainda parcialmente hardcoded; reconciliation/dunning incompletos | Controle financeiro incompleto | P1 |
| Integracoes | Muitos hooks/adapters | Diversos providers mock/standalone | Fluxos externos nao production-grade | P1 |
| Relatorios | Reports API e testes | Metadata de billing nova nao classificada e labels PT-BR ausentes | Teste falha e UX exposta a nomes tecnicos | P0 |
| Observabilidade | Sentry/metrics parciais | Traces e alertas production-grade nao validados | Incidentes dificeis de operar | P2 |

## 5. O que esta errado

| Local | Problema | Consequencia | Correcao necessaria | Prioridade |
|---|---|---|---|---|
| Root `eslint .` | Lint varre `.tmp/chrome-cdp` e falha por permissao/arquivos externos | CI raiz instavel | Configurar ignores para `.tmp`, `.turbo`, `dist`, artefatos | P0 |
| `reports/entity-metadata.service.spec.ts` | Billing tables novas aparecem como UNKNOWN: `billing_plans`, `billing_settings`, `payment_events`, `tenant_billing_state` | API tests falham; reports incompletos | Classificar entidades no inventario de reports | P0 |
| `report-entity-definition.service.spec.ts` | Labels PT-BR ausentes para colunas de `invoices` | Teste falha; enums/colunas tecnicas podem vazar | Adicionar labels PT-BR e regra de visibilidade | P0 |
| `apps/web/vitest.config.mjs` | Web test nao resolve config; tenta ler `../../../..` e recebe acesso negado | Nenhum teste web executa | Corrigir config/path/alias/root do Vitest | P0 |
| `apps/web/src/shared/lib/env.ts` | `MOCK_MODE` default true em non-prod | Dev/homologacao podem mascarar integracao real | Exigir opt-in explicito e separar demo de dev real | P1 |
| `apps/web/src/App.tsx` | AuthGuard/SuperAdminGuard fail-open em mock/auth-disabled | Testes manuais podem aprovar fluxo inseguro | Garantir banners e travas fortes por ambiente | P1 |
| `apps/web/src/modules/admin/data/admin-source.ts` | Admin tenants/subscriptions baseados em mock fora de prod | Admin nao e fonte confiavel em dev/homologacao | Conectar API real e manter mock apenas em fixtures de teste | P0 |
| Muitos controllers API | Ausencia de `@RequirePermission` em dezenas de controllers | RBAC granular nao finalizado | Padronizar permission decorators por endpoint | P0 |
| `modules/billing/billing.service.ts` | PLAN_FEATURES/PLAN_LIMITS hardcoded ainda existem | Feature gates divergem do banco | Usar planos persistidos como fonte unica | P1 |
| E2E RLS | `owner`/`ds` undefined por DB indisponivel | Isolamento nao validado | Subir Postgres/test DB e corrigir bootstrap dos testes | P0 |
| Storage E2E | HeadBucket/Put/Get/List/Delete falham | R2 real nao validado | Configurar R2 staging/local e credenciais seguras | P0 |

## 6. Frontend

**FATOS**

- Framework: React + Vite + TypeScript.
- Rotas em `apps/web/src/app/routes/*.tsx`.
- Modulos encontrados: accounting, admin, ai, artist, audiovisual, auth, catalog, contracts, CRM/leads, dashboard, events, integrations, inventory, licensing, marketing, monitoring, musicchat, projects, releases, reports, rh, settings, support, workspace.
- Design system: `apps/web/src/shared/ui`, Radix/Tailwind/lucide.
- Build production passa.
- Lint web passa com 345 warnings.

**Problemas e correcoes**

| Tema | Problema | Evidencia | Acao |
|---|---|---|---|
| Testes | Vitest nao inicia | `Could not resolve ... vitest.config.mjs` | Corrigir root/config do Vitest e rodar suite |
| Mocks | Mock mode espalhado | `MOCK_MODE` em hooks/providers/adapters | Transformar mocks em fixtures/test-only |
| Admin | `ADMIN_TENANTS` e `ADMIN_SUBSCRIPTIONS` ainda aparecem | `admin-source.ts`, `AdminClients`, `AdminDashboard`, `AdminSubscriptions` | API real obrigatoria para admin |
| Permissoes | Frontend tem guards visuais, mas fail-open em mock | `App.tsx`, `TenantContext`, `usePermissions` | Fail-open apenas em storybook/demo isolado |
| Feature gates | Menus usam flags, mas backend ainda precisa ser fonte | `AppSidebar.tsx`, `FeatureGate` | Consumir features persistidas por tenant/plano |
| Acessibilidade | Muitos icones/botoes dependem de revisao manual | Nao validado por axe/playwright | Adicionar audit a11y |
| Idioma | Ha mistura PT-BR/PT-PT e tecnicos | `Actualizar`, `projectos`, labels faltantes invoices | Normalizar PT-BR |
| Tipagem | Muitos `any` e `@ts-nocheck` em testes | lint web 345 warnings | Remover `any` em interfaces publicas e testes criticos |

## 7. Backend

**FATOS**

- Framework: NestJS.
- `AppModule` importa grande conjunto de modulos.
- Guards globais: rate limit, JWT, tenant, billing, roles, permissions.
- Interceptors: tenant context e audit.
- ValidationPipe global com whitelist e forbidNonWhitelisted.
- Helmet/CORS/compression/Sentry configurados em `main.ts`.

**Problemas e correcoes**

| Tema | Problema | Acao |
|---|---|---|
| RBAC | Controllers sem `@RequirePermission` em massa | Criar matriz endpoint->permission e aplicar decorators |
| Testes | API unit falha em reports metadata/labels | Corrigir metadata de billing e labels PT-BR |
| E2E | Falha por DB indisponivel | Provisionar DB de teste e abortar com mensagem clara se env ausente |
| Billing | Hardcodes de plano permanecem | Migrar para `billing_plans`/features persistidos |
| Jobs | Ha filas/processors, mas worker separado nao existe | Extrair `apps/worker` quando estabilizar |
| Integracoes | Adapters reais e mock coexistem | Padronizar ProviderAdapter, retries e DLQ por provider |
| Logs | Muitos logs existem, mas JSON/PII redaction nao foi validado | Padronizar logger production-grade |

## 8. Banco de dados

**FATOS**

- 79 migrations em `apps/api/src/database/migrations`.
- Entidades TypeORM: 31 arquivos `.entity.ts`.
- RLS aparece em muitas migrations, com `private_get_tenant_id()`, `current_setting('app.current_tenant_id')`, `ENABLE ROW LEVEL SECURITY` e `FORCE ROW LEVEL SECURITY`.
- Billing migrations recentes: `20260701000001_BillingEnforcement.ts`, `20260701000002_BillingPlans.ts`, `20260701000003_BillingRlsHardening.ts`.

**PENDENCIAS/RISCOS**

- `db:check` falha por `ECONNREFUSED`; schema nao validado.
- E2E RLS falha por datasource indefinido; isolamento nao validado.
- Algumas migrations antigas usam `current_setting('app.current_tenant_id', true)::uuid` e outras usam `private_get_tenant_id()`. Ha migracoes de harmonizacao, mas runtime nao foi validado.
- `billing_plans` tem policy global `USING (true) WITH CHECK (true)`; pode ser aceitavel para leitura publica de planos, mas escrita global precisa ser revisada por role/admin.

**ACAO NECESSARIA**

1. Subir Postgres local/staging com app role NOBYPASSRLS.
2. Rodar `db:check`, migrations, `verify:critical-rls`, `verify:tenant-isolation`.
3. Corrigir entidades billing no metadata de reports.
4. Garantir indices por `tenant_id`, FK, status e datas em tabelas operacionais.

## 9. Multi-tenancy

**FATOS**

- `TenantGuard` valida `X-Tenant-ID` contra tenant/membership.
- `RequestTenantContextInterceptor` existe.
- Migrations RLS existem.
- Storage service gera keys com `tenants/{tenantId}/...` em logs de teste.
- Jobs/event handlers frequentemente abortam fail-closed quando evento nao tem `tenantId`.

**Classificacao de risco de vazamento:** ALTO ate validacao verde.

**Motivo:** arquitetura aponta para isolamento forte, mas `verify:tenant-isolation` e E2E RLS falharam no ambiente auditado. Sem validacao automatizada, nao se pode declarar tenant isolation pronto.

## 10. Seguranca

| Area | Status | Evidencia | Risco | Acao |
|---|---|---|---|---|
| Auth JWT | Parcial/forte | JWKS Supabase ES256 | Dependencia de env correta | Testar token real/staging |
| Auth disabled | Parcial | API bloqueia em prod; Web limita a DEV | Dev fail-open pode mascarar falha | CI deve testar production env |
| CORS | Parcial | Prod rejeita localhost; dev permissivo | Config errada em prod bloqueia/abre indevidamente | Validar env por ambiente |
| Headers | Parcial | Helmet/HSTS/CSP em `main.ts` | CSP precisa teste real | Smoke security |
| RBAC | Parcial | Guards existem, controllers inconsistentes | Permissoes granulares incompletas | Aplicar `@RequirePermission` |
| IDOR | Parcial | TenantGuard/RLS/repos existem | E2E falha | Corrigir tenant tests |
| SQL Injection | Parcial | TypeORM + DTOs | Queries raw em reports/migrations precisam revisao | Review por modulo |
| XSS | Parcial | DOMPurify no bundle; nao auditado completo | Entradas ricas podem vazar | Sanitizar campos rich text |
| Webhooks | Parcial/forte Stripe | Stripe assinatura validada | Outros providers nao validados igualmente | Padronizar assinatura |
| Secrets | Parcial | `.env.example` usa placeholders; `.env` nao exposto na auditoria | Secret real pode existir localmente | Secret scanning CI |
| Storage | Parcial | Signed URLs | E2E storage falha | Validar R2 real |

## 11. Billing, planos e feature gates

**FATOS**

- Tabelas/migrations de `billing_subscriptions`, `tenant_billing_state`, `invoices`, `payment_events`, `billing_plans`, `billing_settings` existem.
- Webhook Stripe valida assinatura e idempotencia via `payment_events`.
- Backend tem `BillingEnforcementGuard`.
- Frontend tem `BillingProvider`, `BillingNotice`, `/billing/blocked`.

**Status:** real no nucleo, parcial na operacao enterprise.

**PENDENCIAS**

- Testes API falham justamente porque entidades billing novas nao foram integradas ao report metadata.
- Feature/limits ainda aparecem hardcoded no service.
- Reconciliation/dunning nao foram validados.
- Admin billing ainda tem historico de fontes mock no frontend.

## 12. Integracoes

| Integracao | Finalidade | Arquivos | Status | Real/mock | Riscos |
|---|---|---|---|---|---|
| Supabase Auth/Postgres | Auth e DB | `auth.guard.ts`, migrations | Parcial | Real, nao validado runtime | RLS/DB indisponivel |
| Stripe | Billing | `billing.service.ts`, `billing.controller.ts` | Parcial/real | Real quando env existe | Reconciliation pendente |
| Cloudflare R2/S3 | Storage | `storage.service.ts`, uploads | Parcial | Real, E2E falha | Arquivo nao validado |
| Resend | Emails | notifications/queues/env | Parcial | Nao validado | Dunning/notifications incompletos |
| Sentry/PostHog | Observabilidade | main/env/hooks | Parcial | Nao validado em runtime | Incidentes invisiveis |
| Autentique | Assinatura | integrations/autentique | Parcial | Webhook/service encontrado | Assinatura/webhook precisa cobertura |
| Spotify/YouTube/Deezer/SoundCloud/Apple | Musica/metricas | web hooks integrations | Parcial | Muitos stubs em MOCK_MODE | Dados simulados |
| ECAD/ABRAMUS/UBC | Direitos/registry | integrations hooks/providers | Parcial | Mock/standalone em varios hooks | Nao production-grade |
| Meta/TikTok/Google Ads | Marketing | marketing oauth hooks | Parcial | Mock em dev, real parcial | OAuth/retry/DLQ pendentes |
| AI OpenAI/Anthropic/Gemini | Skills IA | modules/ai/core skills | Parcial | Providers existem; uso nao auditado completo | Custo/PII |

## 13. Arquivos e storage

**FATOS**

- `POST /uploads/presign`, `POST /uploads/:fileId/confirm`, `GET /uploads/:fileId/download` existem.
- Controller valida tenant em confirm/download.
- Signed URLs sao usadas.
- `storage:e2e` falhou 0/7: HeadBucket, PutObject, GetObject, Presigned PUT/GET, ListObjects, DeleteObject.

**RISCO:** alto para producao ate ambiente R2 estar validado. Sem E2E verde, nao ha prova de upload/download real, permissao de bucket, prefixo tenant ou lifecycle.

## 14. Testes

**Quantidade encontrada**

- API: 81 suites `.spec.ts`; comando rodou 81 suites.
- Web: 35 arquivos de teste aproximadamente (`*.test.ts`, `*.test.tsx`).

**Resultado**

- API: 79 suites passaram, 2 falharam; 679 testes passaram, 2 falharam.
- Web: falhou antes de carregar config.
- E2E API: 5 suites falharam, 197 testes falharam por DB/datasource indisponivel.
- Tenant isolation: falhou.
- Storage E2E: falhou 0/7.

**Conclusao:** cobertura nao e aceitavel para SaaS enterprise enquanto os gates criticos estiverem vermelhos ou nao executaveis.

## 15. CI/CD e producao

**FATOS**

- Workflows: `.github/workflows/ci.yml`, `backup.yml`, `security.yml`.
- Scripts de release/check existem.
- Root `lint` falha no ambiente local por escopo errado.
- `db:check` falha sem DB.

**Nao pode ir para producao com seguranca** porque os gates que deveriam bloquear release nao estao verdes: tests, e2e, tenant isolation, storage e DB.

## 16. UX/UI e idioma

**FATOS**

- UI extensa, modular e com design system proprio.
- Build gera chunks grandes para modulos densos.
- Textos misturam PT-BR, PT-PT e termos tecnicos.
- Teste de reports acusa labels PT-BR ausentes para colunas `invoices`.

**Correcoes necessarias**

- Normalizar idioma para PT-BR: `Atualizar`, `projetos`, `usuarios`, `lançamentos`.
- Remover enums tecnicos da UI (`payment_grace`, `read_only`, nomes crus de colunas).
- Validar responsividade com Playwright/screenshot em rotas principais.
- Adicionar a11y check para dialog, tabelas, sidebar, botao de icone.

## 17. Modulos do sistema

| Modulo | Frontend | Backend | Banco | API | Integrado | Mock | Permissoes | Auditoria | Testes | Status final | Falta |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Auth | Sim | Sim | Sim | Sim | Parcial | Dev/mock | Sim | Parcial | Parcial | Parcial | E2E real |
| Admin SaaS | Sim | Parcial | Parcial | Parcial | Parcial | Sim | Parcial | Parcial | Parcial | Parcial | Dados reais completos |
| Billing | Sim | Sim | Sim | Sim | Parcial | Nao nucleo | Parcial | Sim | Falhando | Parcial | Tests/metadata/reconciliation |
| RBAC | Sim | Sim | Sim | Sim | Parcial | Nao principal | Parcial | Sim | Parcial | Parcial | Readiness e decorators |
| Multi-tenancy | Sim | Sim | Sim | Sim | Parcial | Nao | Sim | Sim | Falhando | Parcial | RLS/E2E verde |
| Artistas | Sim | Sim | Sim | Sim | Parcial | Alguns | Parcial | Sim | Parcial | Parcial | E2E e API real por tela |
| Catalogo | Sim | Sim | Sim | Sim | Parcial | Alguns | Parcial | Sim | Parcial | Parcial | Versionamento/testes |
| Contratos | Sim | Sim | Sim | Sim | Parcial | Provider mock | Parcial | Sim | Parcial | Parcial | Assinatura real E2E |
| CRM/Leads | Sim | Sim | Sim | Sim | Parcial | Alguns | Sim em leads | Sim | Parcial | Parcial | Public flow hardening |
| Financeiro | Sim | Sim | Sim | Sim | Parcial | Alguns | Parcial | Sim | Parcial | Parcial | Permissoes/reports |
| Marketing | Sim | Sim | Sim | Sim | Parcial | Sim provider | Parcial | Sim | Parcial | Parcial | Publish real |
| Lancamentos | Sim | Sim | Sim | Sim | Parcial | Alguns | Parcial | Sim | Parcial | Parcial | Distribuicao real |
| Monitoramento | Sim | Sim | Sim | Sim | Parcial | Sim | Parcial | Sim | Parcial | Parcial | Provider real |
| Registry | Sim | Sim | Sim | Sim | Parcial | Sim | Parcial | Sim | Parcial | Parcial | Provider real |
| Storage | Sim | Sim | Sim | Sim | Parcial | Nao/standalone | Parcial | Sim | Falhando | Parcial | R2 E2E |
| AI | Sim | Sim | Sim/parcial | Sim | Parcial | Sim em dev | Parcial | Parcial | Parcial | Parcial | Quotas/PII/evals |
| Suporte | Sim | Sim | Sim | Sim | Parcial | Sim em hook | Parcial | Parcial | Parcial | Parcial | Suspended access E2E |
| RH | Sim | Sim | Sim | Sim | Parcial | Nao validado | Parcial | Parcial | Parcial | Parcial | PII e RBAC |
| Audiovisual | Sim | Sim | Sim | Sim | Parcial | Nao validado | Parcial | Sim | Parcial | Parcial | E2E |
| Relatorios | Sim | Sim | Sim | Sim | Parcial | Nao principal | Parcial | Sim | Falhando | Parcial | Metadata/labels |
| Observabilidade | Parcial | Parcial | N/A | Parcial | Parcial | N/A | Interno | Parcial | Nao validado | Parcial | Dashboards/alerts |

## 18. Mapa frontend x backend

| Tela/frontend | Endpoint esperado | Endpoint existente | Service existente | Entidade | Status | Problema | Acao |
|---|---|---|---|---|---|---|---|
| `/auth` | `/auth/context` | Sim | Auth | tenants/users | Parcial | E2E real pendente | Testar login Supabase |
| `/admin/clients` | `/admin/tenants` ou billing/admin tenants | Parcial/nao confirmado | admin services | tenants | Parcial | Mock ainda importado | API real unica |
| `/admin/subscriptions` | `/billing/admin/subscriptions` | Acoes existem; listagem nao confirmada no controller lido | admin-billing | billing | Parcial | Mock subscriptions ainda importado | Fechar listagem real |
| `/admin/plans` | `/billing/plans` | Sim | billing/admin | billing_plans | Parcial | Permissao admin precisa validar | CRUD real + tests |
| `/artistas` | `/artists` | Sim | hooks artists | artists | Parcial | Integracao nao validada E2E | E2E CRUD |
| `/registro-musicas` | `/works`, `/phonograms` | Sim | catalog hooks | works/phonograms | Parcial | Permissoes inconsistentes | RBAC decorators |
| `/contratos` | `/contracts` | Sim | contracts hooks | contracts | Parcial | Assinatura externa parcial | Webhook/test |
| `/leads` | `/leads` | Sim | leads hooks | leads | Parcial | Public routes duplicadas | Unificar contrato |
| `/financeiro` | `/transactions`, `/financial-categories` | Sim | accounting hooks | transactions/categories | Parcial | Role/permission inconsistente | RBAC + E2E |
| `/marketing/*` | `/marketing/*` | Sim | marketing hooks | marketing_* | Parcial | Providers mock | Adapter real |
| `/lancamentos` | `/releases` | Sim | releases hooks | releases | Parcial | Distribuicao real pendente | Provider/job |
| `/relatorios` | `/reports/*` | Sim | reports service | dynamic | Quebrado em tests | Metadata labels falhando | Corrigir reports |
| `/support/*` | `/support-tickets` | Sim | support hook | tickets | Parcial | Hook usa mock em modo mock | API real/default |
| `/billing/blocked` | `/billing/subscription`, invoices | Parcial | BillingContext | billing state | Parcial | Visual depende backend | E2E suspended |

## 19. Lista de pendencias finais

### P0 — Bloqueia producao

| Descricao | Local | Impacto | Correcao | Aceite |
|---|---|---|---|---|
| Corrigir lint raiz | root eslint/config | CI instavel | Ignorar `.tmp`, dist, artefatos | `pnpm lint` passa |
| Corrigir API tests | reports metadata/labels | Release bloqueado | Classificar billing tables e labels invoices | API tests 100% |
| Corrigir Web tests | `apps/web/vitest.config.mjs` | Sem QA UI | Corrigir config | Web tests iniciam/passam |
| Validar DB/migrations | DB env/scripts | Schema nao validado | Subir Postgres e ajustar scripts | `db:check` passa |
| Validar tenant isolation | RLS/e2e | Vazamento nao descartado | Corrigir env/test harness | `verify:tenant-isolation` passa |
| Validar storage R2 | R2/env/scripts | Upload real nao garantido | Configurar R2 staging/local | `storage:e2e` passa |
| Fechar RBAC granular | controllers | Permissao inconsistente | `@RequirePermission` em rotas | permission tests passam |
| Remover admin mock como fonte | admin web/API | Admin ilusorio | API real para clients/subscriptions | Refresh persiste dados |

### P1 — Bloqueia MVP confiavel

- Billing reconciliation/dunning.
- Feature gates persistidos como fonte unica.
- Public registration anti-spam e hardening.
- Testes E2E de fluxos principais.
- Normalizacao PT-BR e remoção de labels tecnicas.

### P2 — Necessario para enterprise

- OTel/traces, dashboards e alertas.
- Worker separado.
- Integrations adapter framework com retry/DLQ.
- Scan antivirus/status de assets.
- Export async para reports grandes.

### P3 — Melhorias e refinamentos

- Reduzir chunks grandes.
- Remover `any` e `@ts-nocheck`.
- UX/a11y automatizada.
- BI/warehouse futuro.

## 20. Plano de execucao

### Fase 1 — Correcoes criticas

- Corrigir lint raiz, API tests, web test config, db env e storage env.
- Arquivos: root configs, reports metadata, vitest config, env docs.
- Conclusao: typecheck/lint/build/test/db/storage verdes.
- Risco: quebrar pipeline por divida antiga.

### Fase 2 — Integracao frontend/backend

- Remover admin mock como fonte, conectar clients/subscriptions/plans/audit a API real.
- Conclusao: refresh mantem alteracoes; audit log criado.

### Fase 3 — Seguranca e multi-tenancy

- Padronizar permissions, rodar RBAC readiness, RLS e tenant isolation.
- Conclusao: cross-tenant read/write bloqueado.

### Fase 4 — Billing e feature gates

- Eliminar hardcode de features/limits, reconciliation, dunning, E2E read_only/suspended.
- Conclusao: Stripe event altera acesso backend e frontend reflete.

### Fase 5 — Testes e qualidade

- E2E auth/admin/core CRUD/billing/storage/reports.
- Conclusao: CI bloqueante verde.

### Fase 6 — Infraestrutura e producao

- Staging, secrets, backup/restore, rollback, monitoring.
- Conclusao: go/no-go sem P0/P1 aberto.

### Fase 7 — Homologacao final

- Smoke com dados reais de teste, auditoria, performance, UX/a11y.
- Conclusao: release candidate aprovado.

## 21. Definition of Done enterprise

- [ ] Build frontend sem erro.
- [ ] Build backend sem erro.
- [ ] Typecheck sem erro.
- [ ] Lint raiz e por app sem erro critico.
- [ ] API tests 100%.
- [ ] Web tests executando e passando.
- [ ] E2E criticos passando.
- [ ] Banco migrado e `db:check` verde.
- [ ] Auth Supabase real validado.
- [ ] RBAC granular validado.
- [ ] Tenant isolation validado.
- [ ] Billing Stripe validado.
- [ ] Feature gates backend/frontend funcionais.
- [ ] Upload/download seguro com R2 validado.
- [ ] Auditoria append-only ativa.
- [ ] Logs estruturados ativos.
- [ ] Monitoramento e alertas ativos.
- [ ] Backup configurado.
- [ ] Restore testado.
- [ ] Staging funcional.
- [ ] Rollback testado.
- [ ] Documentacao minima atualizada.
- [ ] Fluxos principais homologados.

## 22. Comandos executados e resultados

| Comando | Resultado |
|---|---|
| `corepack pnpm typecheck` | PASS |
| `corepack pnpm --filter @music-os-360/api build` | PASS |
| `corepack pnpm --filter @music-os-360/web build` | PASS |
| `corepack pnpm lint` | FAIL/TIMEOUT: lint raiz varre `.tmp/chrome-cdp` |
| `corepack pnpm --filter @music-os-360/api lint` | PASS com 657 warnings |
| `corepack pnpm --filter @music-os-360/web lint` | PASS com 345 warnings |
| `corepack pnpm --filter @music-os-360/api test` | FAIL: 2 suites/2 testes falhando |
| `corepack pnpm --filter @music-os-360/web test` | FAIL: Vitest config nao resolve |
| `corepack pnpm --filter @music-os-360/api db:check` | FAIL: ECONNREFUSED |
| `corepack pnpm --filter @music-os-360/api verify:tenant-isolation` | FAIL: erro fatal sem detalhe util |
| `corepack pnpm --filter @music-os-360/api rbac:readiness` | FAIL: script retorna exit 1 sem detalhe impresso |
| `corepack pnpm --filter @music-os-360/api storage:e2e` | FAIL: 0/7 passos OK |
| `corepack pnpm --filter @music-os-360/api test:e2e` | FAIL: 5 suites/197 testes falhando por DB/datasource |

