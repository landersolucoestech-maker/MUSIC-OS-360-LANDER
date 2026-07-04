# EXECUTION BACKLOG ENGINE (EBE) — MUSIC OS 360

Data: 2026-07-01  
Fontes oficiais:

- `docs/BLUEPRINT_ENTERPRISE.md`
- `docs/PLANO_MASTER_IMPLEMENTACAO_ENTERPRISE.md`
- `docs/MASTER_FUNCTIONAL_SPECIFICATION.md`
- `docs/MASTER_TECHNICAL_IMPLEMENTATION_SPECIFICATION.md`

Este documento transforma a arquitetura, o plano master, a MFS e o MTIS em backlog executável. Cada item foi escrito para virar ticket diretamente em Jira, Linear, Azure DevOps ou GitHub Projects.

Escala de estimativa:

| Código | Esforço |
|---|---|
| XS | até 2h |
| S | até 8h |
| M | até 24h |
| L | até 40h |
| XL | acima de 40h |

Regra operacional: uma tarefa só entra em execução se suas dependências estiverem concluídas ou explicitamente mitigadas no release plan.

## PROGRAMA 01 — FOUNDATION PLATFORM

Objetivo: construir a fundação técnica obrigatória para desenvolvimento, qualidade, deploy, documentação e governança.

### ÉPICO FP-001 — Infraestrutura Base

#### FEATURE FP-001-001 — Monorepo E Tooling

**User story:** Como desenvolvedor, quero um monorepo organizado para manter web, API, worker, packages, infra e documentação com padrões consistentes.

**Technical story:** Consolidar estrutura, scripts, TSConfig, lint, format, hooks e CI básico sem quebrar os apps existentes.

| ID | Objetivo | Local afetado | Dependências | Critério de aceite | Est. |
|---|---|---|---|---|---|
| FP-001-001-001 | Validar estrutura `apps/web`, `apps/api`, `packages`, `infra` e `docs` contra o MTIS | raiz do repo | nenhuma | `rg --files` confirma pastas existentes ou lacunas documentadas | S |
| FP-001-001-002 | Criar `apps/worker` com bootstrap vazio e README operacional | `apps/worker` | FP-001-001-001 | workspace reconhece o pacote sem executar processors ainda | S |
| FP-001-001-003 | Extrair TSConfig base compartilhado para packages/apps | `tsconfig.base.json`, tsconfigs dos apps | FP-001-001-001 | `corepack pnpm typecheck` executa sem erro novo | M |
| FP-001-001-004 | Padronizar ESLint por app sem silenciar regras críticas | configs eslint | FP-001-001-003 | `corepack pnpm lint` executa e lista apenas falhas reais conhecidas ou passa | M |
| FP-001-001-005 | Padronizar Prettier sem reformat massivo não solicitado | `.prettierrc`, package scripts | FP-001-001-004 | `pnpm format:check` disponível | S |
| FP-001-001-006 | Configurar Husky para hooks locais não destrutivos | `.husky`, package scripts | FP-001-001-005 | pre-commit roda lint-staged/typecheck leve | S |
| FP-001-001-007 | Configurar Commitlint para Conventional Commits | `commitlint.config.*`, package scripts | FP-001-001-006 | commit inválido é rejeitado localmente | S |
| FP-001-001-008 | Criar pipeline CI foundation | `.github/workflows/ci.yml` | FP-001-001-004 | CI roda install, typecheck, lint, test e build | M |
| FP-001-001-009 | Criar pipeline CD staging skeleton | `.github/workflows/deploy-staging.yml`, infra docs | FP-001-001-008 | workflow manual/documentado sem secrets hardcoded | M |
| FP-001-001-010 | Documentar comandos de desenvolvimento e validação | `docs/DEVELOPMENT_RUNBOOK.md` | FP-001-001-008 | novo dev consegue instalar, rodar e validar pelo documento | S |

#### FEATURE FP-001-002 — Env, Secrets E Production Gates

**User story:** Como operador, quero que flags perigosas falhem em produção para impedir acesso indevido.

| ID | Objetivo | Local afetado | Dependências | Critério de aceite | Est. |
|---|---|---|---|---|---|
| FP-001-002-001 | Criar inventário de env vars obrigatórias por ambiente | `.env.example`, `docs/ENVIRONMENT.md` | FP-001-001-010 | documento separa local/dev/staging/prod | S |
| FP-001-002-002 | Bloquear `AUTH_DISABLED=true` em produção na API | `apps/api/src/core/auth-disabled.ts`, env schema | FP-001-002-001 | API falha startup em produção com bypass ativo | S |
| FP-001-002-003 | Bloquear `VITE_AUTH_DISABLED=true` em build web production | `apps/web/src/shared/lib/env.ts` | FP-001-002-001 | build production falha com flag ativa | S |
| FP-001-002-004 | Bloquear `MOCK_MODE=true` em produção | env schema API/web | FP-001-002-001 | teste unitário cobre falha de startup/build | S |
| FP-001-002-005 | Criar check CI para env de produção | `.github/workflows/ci.yml`, scripts | FP-001-002-002 | PR falha se production env permitir bypass | M |
| FP-001-002-006 | Documentar secret manager e rotação | `docs/SECURITY_RUNBOOK.md` | FP-001-002-001 | runbook lista secrets, owner e rotação | S |

### ÉPICO FP-002 — Banco, Migrations E RLS Base

#### FEATURE FP-002-001 — Database Foundation

| ID | Objetivo | Local afetado | Dependências | Critério de aceite | Est. |
|---|---|---|---|---|---|
| FP-002-001-001 | Auditar migrations existentes e ordem de execução | `apps/api/src/database/migrations` | FP-001-001-001 | relatório em `docs/DB_AUDIT.md` lista lacunas | M |
| FP-002-001-002 | Validar entidades TypeORM carregadas pelo módulo de banco | `apps/api/src/database/entities.ts` | FP-002-001-001 | API build passa e não há entidade órfã crítica | S |
| FP-002-001-003 | Criar script `db:check` obrigatório no CI | `apps/api/package.json`, scripts | FP-002-001-001 | script falha se migration pendente/inválida | M |
| FP-002-001-004 | Criar verificação de role sem `BYPASSRLS` | `apps/api/scripts/verify-rls.ts` | FP-002-001-003 | script confirma `rolbypassrls=false` | M |
| FP-002-001-005 | Criar seed mínimo de roles/plans para ambiente dev | `apps/api/src/database/seeds` | FP-002-001-003 | dev consegue subir sem dados mock de produção | M |

## PROGRAMA 02 — AUTH

Objetivo: fechar autenticação, sessão, contexto e proteção de rotas sem bypass em produção.

### ÉPICO AUTH-001 — Auth Core

#### FEATURE AUTH-001-001 — Login E Sessão

**User story:** Como usuário, quero realizar login para acessar meu workspace com segurança.

| ID | Objetivo | Local afetado | Dependências | Critério de aceite | Est. |
|---|---|---|---|---|---|
| AUTH-001-001-001 | Validar contrato Supabase/JWT usado pelo backend | `apps/api/src/core/auth`, docs | FP-001-002-002 | documento técnico mostra issuer/audience/claims | S |
| AUTH-001-001-002 | Criar/ajustar `AuthContextResponseDto` | `apps/api/src/modules/auth/dto` | AUTH-001-001-001 | DTO contém user, tenants, activeTenant, roles, features, billing | S |
| AUTH-001-001-003 | Implementar endpoint `GET /auth/context` | `apps/api/src/modules/auth` | AUTH-001-001-002 | retorna contexto para usuário autenticado | M |
| AUTH-001-001-004 | Criar testes de `GET /auth/context` com token válido | `apps/api/src/modules/auth/tests` | AUTH-001-001-003 | teste valida payload completo | M |
| AUTH-001-001-005 | Criar teste de token inválido/expirado | `apps/api/src/modules/auth/tests` | AUTH-001-001-003 | endpoint retorna 401 | S |
| AUTH-001-001-006 | Atualizar `AuthContext` no web para consumir contexto real | `apps/web/src/modules/auth`, `shared` | AUTH-001-001-003 | frontend renderiza tenant/roles sem mock | M |
| AUTH-001-001-007 | Criar hook `useAuthContext` com loading/error | `apps/web/src/modules/auth/hooks` | AUTH-001-001-006 | telas tratam carregamento e erro | S |
| AUTH-001-001-008 | Ajustar página `/auth` sem alterar fluxo auth | `apps/web/src/modules/auth/pages/Auth.tsx` | AUTH-001-001-006 | login funciona e não mostra app shell | M |
| AUTH-001-001-009 | Criar/validar `RequireAuth` | `apps/web/src/app/guards` | AUTH-001-001-007 | rota protegida sem sessão redireciona para `/auth` | S |
| AUTH-001-001-010 | Auditar login/logout em backend | `apps/api/src/modules/auth`, audit | AUTH-001-001-003 | audit log registra login/logout quando aplicável | M |
| AUTH-001-001-011 | Criar E2E login válido/inválido | e2e web/api | AUTH-001-001-008 | fluxo completo passa | M |

#### FEATURE AUTH-001-002 — Reset, Signup E Convites

| ID | Objetivo | Local afetado | Dependências | Critério de aceite | Est. |
|---|---|---|---|---|---|
| AUTH-001-002-001 | Mapear fluxos existentes de reset/signup | `apps/web/src/modules/auth`, `apps/api/src/modules/auth` | AUTH-001-001-001 | relatório curto em docs/auth | S |
| AUTH-001-002-002 | Criar DTO `InviteUserDto` | API auth dto | AUTH-001-002-001 | valida email, role e tenant | S |
| AUTH-001-002-003 | Criar endpoint `POST /auth/invites` | API auth controller/service | AUTH-001-002-002, RBAC-001-001-006 | cria convite e audit | M |
| AUTH-001-002-004 | Criar endpoint `POST /auth/invites/:token/accept` | API auth | AUTH-001-002-003 | convite aceito cria membership | M |
| AUTH-001-002-005 | Criar UI de convite em configurações | web settings users | AUTH-001-002-003 | owner/admin convida usuário | M |
| AUTH-001-002-006 | Testar convite expirado/inválido | API tests | AUTH-001-002-004 | retorna 400/404 apropriado | S |

## PROGRAMA 03 — RBAC

Objetivo: tornar permissões persistidas a fonte real de autorização.

### ÉPICO RBAC-001 — RBAC Core

#### FEATURE RBAC-001-001 — Roles, Permissions E Guards

| ID | Objetivo | Local afetado | Dependências | Critério de aceite | Est. |
|---|---|---|---|---|---|
| RBAC-001-001-001 | Auditar roles e permissions existentes | `apps/api/src/core/rbac`, migrations | FP-002-001-001 | `docs/RBAC_AUDIT.md` lista gaps | M |
| RBAC-001-001-002 | Criar/validar migrations de `roles` | database migrations | RBAC-001-001-001 | tabela possui tenant_id, name, scope, timestamps | M |
| RBAC-001-001-003 | Criar/validar migrations de `permissions` | database migrations | RBAC-001-001-002 | permissions têm key única | M |
| RBAC-001-001-004 | Criar/validar `role_permissions` e `user_roles` | database migrations | RBAC-001-001-003 | grants persistem por tenant | M |
| RBAC-001-001-005 | Implementar `PermissionDecisionService` | `apps/api/src/core/rbac` | RBAC-001-001-004 | retorna allow/deny com motivo | M |
| RBAC-001-001-006 | Atualizar `PermissionsGuard` para autoridade persistida | `apps/api/src/core/guards` | RBAC-001-001-005 | guard usa banco quando flag ON | M |
| RBAC-001-001-007 | Criar logs de decisão RBAC | `apps/api/src/core/rbac` | RBAC-001-001-006 | denial fica rastreável por tenant/user | M |
| RBAC-001-001-008 | Criar script readiness `rbac:readiness` | `apps/api/scripts` | RBAC-001-001-007 | CI falha se divergência crítica | M |
| RBAC-001-001-009 | Criar testes de role permitida/negada | API tests | RBAC-001-001-006 | 200/403 corretos | M |
| RBAC-001-001-010 | Criar matriz UI role x permission | `apps/web/src/modules/settings` | RBAC-001-001-006 | owner/admin edita grants | L |
| RBAC-001-001-011 | Auditar alterações de roles | API audit | RBAC-001-001-010 | before/after registrado | S |

## PROGRAMA 04 — MULTI-TENANCY

Objetivo: garantir isolamento real por tenant em API, banco, storage, jobs e relatórios.

### ÉPICO MT-001 — Tenant Context E RLS

#### FEATURE MT-001-001 — Tenant Guard

| ID | Objetivo | Local afetado | Dependências | Critério de aceite | Est. |
|---|---|---|---|---|---|
| MT-001-001-001 | Auditar rotas tenant-scoped sem `TenantGuard` | `apps/api/src/modules` | AUTH-001-001-003 | relatório lista cada rota descoberta | M |
| MT-001-001-002 | Padronizar decorator de tenant context | `apps/api/src/core` | MT-001-001-001 | services recebem tenantId sem parsing manual | M |
| MT-001-001-003 | Aplicar guard nas rotas de domínio | API modules | MT-001-001-002 | rotas sem tenant retornam 400/403 | L |
| MT-001-001-004 | Configurar session context no banco | database module/interceptor | FP-002-001-004 | queries usam `app.tenant_id` | M |
| MT-001-001-005 | Criar policies RLS para tabelas críticas | migrations | MT-001-001-004 | policies ativas para artistas/catálogo/billing/storage | L |
| MT-001-001-006 | Criar teste cross-tenant read blocked | API tests/scripts | MT-001-001-005 | tenant A não lê B | M |
| MT-001-001-007 | Criar teste cross-tenant write blocked | API tests/scripts | MT-001-001-005 | tenant A não altera B | M |
| MT-001-001-008 | Adicionar `verify:tenant-isolation` ao CI | workflows | MT-001-001-006 | CI bloqueia regressão | S |

#### FEATURE MT-001-002 — Tenant Context Em Jobs E Storage

| ID | Objetivo | Local afetado | Dependências | Critério de aceite | Est. |
|---|---|---|---|---|---|
| MT-001-002-001 | Definir payload padrão de jobs com `tenantId` | `apps/api/src/queues` | MT-001-001-002 | interface comum publicada | S |
| MT-001-002-002 | Atualizar processors para restaurar tenant context | queues/processors | MT-001-002-001 | job falha se tenant ausente | M |
| MT-001-002-003 | Padronizar storage key prefix por tenant | storage services | MT-001-001-002 | objetos incluem env/tenantId | M |
| MT-001-002-004 | Testar job cross-tenant | API queue tests | MT-001-002-002 | job não acessa dados de outro tenant | M |

## PROGRAMA 05 — BILLING

Objetivo: implementar cobrança Stripe real, estado financeiro, feature gates, read-only e suspensão.

### ÉPICO BILL-001 — Billing Core E Stripe

#### FEATURE BILL-001-001 — Schema Billing

| ID | Objetivo | Local afetado | Dependências | Critério de aceite | Est. |
|---|---|---|---|---|---|
| BILL-001-001-001 | Validar migration de `billing_subscriptions` | migrations/entities | FP-002-001-003 | campos do MTIS existem | S |
| BILL-001-001-002 | Validar migration de `tenant_billing_state` | migrations/entities | BILL-001-001-001 | status enum/check existe | S |
| BILL-001-001-003 | Validar migration de `invoices` | migrations/entities | BILL-001-001-002 | `stripe_invoice_id` unique | S |
| BILL-001-001-004 | Validar migration de `payment_events` | migrations/entities | BILL-001-001-003 | `stripe_event_id` unique | S |
| BILL-001-001-005 | Criar migration `billing_settings` | migrations/entities | BILL-001-001-004 | configura grace/read_only/suspend | M |
| BILL-001-001-006 | Seedar planos Starter/Professional/Enterprise | seeds/migrations | BILL-001-001-005 | planos e features persistidos | M |

#### FEATURE BILL-001-002 — Stripe Webhook

| ID | Objetivo | Local afetado | Dependências | Critério de aceite | Est. |
|---|---|---|---|---|---|
| BILL-001-002-001 | Validar raw body para Stripe | `apps/api/src/main.ts`, billing webhook | BILL-001-001-004 | assinatura Stripe é verificável | M |
| BILL-001-002-002 | Implementar parser seguro de eventos Stripe | billing service | BILL-001-002-001 | eventos inválidos retornam 400 | M |
| BILL-001-002-003 | Persistir `payment_events` antes de efeitos | billing service | BILL-001-002-002 | duplicado retorna 2xx idempotente | M |
| BILL-001-002-004 | Processar `checkout.session.completed` | billing service | BILL-001-002-003 | tenant recebe customer/subscription | M |
| BILL-001-002-005 | Processar subscription created/updated/deleted | billing service | BILL-001-002-003 | status subscription sincroniza | L |
| BILL-001-002-006 | Processar invoice paid/succeeded/failed/action_required/finalized/voided/uncollectible | billing service | BILL-001-002-003 | invoice e tenant state atualizam | L |
| BILL-001-002-007 | Criar testes invalid signature | billing tests | BILL-001-002-001 | retorna 400/401 sem persistir | S |
| BILL-001-002-008 | Criar testes duplicate event | billing tests | BILL-001-002-003 | não reprocessa efeitos | S |
| BILL-001-002-009 | Criar testes invoice failed -> grace | billing tests | BILL-001-002-006 | status `payment_grace` e `grace_until` | M |
| BILL-001-002-010 | Criar testes invoice paid -> active | billing tests | BILL-001-002-006 | `suspended_at=null`, `resumed_at` definido | M |

#### FEATURE BILL-001-003 — Enforcement E Feature Gates

| ID | Objetivo | Local afetado | Dependências | Critério de aceite | Est. |
|---|---|---|---|---|---|
| BILL-001-003-001 | Implementar `BillingEnforcementService.resolveState` | billing service | BILL-001-001-005 | retorna status e bloqueios | M |
| BILL-001-003-002 | Implementar `BillingEnforcementGuard` global | core guards | BILL-001-003-001, MT-001-001-003 | suspended bloqueia rotas operacionais | M |
| BILL-001-003-003 | Implementar read-only para mutações | billing guard | BILL-001-003-002 | POST/PUT/PATCH/DELETE bloqueiam | M |
| BILL-001-003-004 | Criar allowlist `/billing`, `/support`, `/health` | billing guard | BILL-001-003-002 | rotas essenciais continuam acessíveis | S |
| BILL-001-003-005 | Implementar `FeatureGateService` backend | billing/plans | BILL-001-001-006 | feature bloqueada retorna `FEATURE_BLOCKED` | M |
| BILL-001-003-006 | Implementar `BillingContext` frontend | web billing/shared | BILL-001-003-001 | banners e estados financeiros aparecem | M |
| BILL-001-003-007 | Criar `RequireBillingWritable` | web guards | BILL-001-003-006 | botões mutáveis bloqueiam visualmente | S |
| BILL-001-003-008 | Criar página `/billing/blocked` | web billing pages | BILL-001-003-006 | suspenso vê motivo e CTA de pagamento | M |
| BILL-001-003-009 | Testar backend read_only | API e2e | BILL-001-003-003 | GET passa e POST bloqueia | M |
| BILL-001-003-010 | Testar frontend banners | web tests/e2e | BILL-001-003-006 | grace/read_only/suspended renderizam corretamente | M |

#### FEATURE BILL-001-004 — Admin Billing

| ID | Objetivo | Local afetado | Dependências | Critério de aceite | Est. |
|---|---|---|---|---|---|
| BILL-001-004-001 | Criar `GET /billing/admin/subscriptions` real | API billing admin | BILL-001-001-006, RBAC-001-001-006 | lista subscriptions reais | M |
| BILL-001-004-002 | Criar ações suspend/reactivate/read-only/override | API billing admin | BILL-001-003-001 | cada ação persiste e audita | L |
| BILL-001-004-003 | Conectar `/admin/subscriptions` à API | web admin subscriptions | BILL-001-004-001 | tela não usa mock como fonte | M |
| BILL-001-004-004 | Criar modais com motivo obrigatório para ações críticas | web admin subscriptions | BILL-001-004-002 | motivo enviado e auditado | M |
| BILL-001-004-005 | Criar reconciliation job Stripe | billing queue | BILL-001-002-006 | job corrige divergência idempotente | L |
| BILL-001-004-006 | Criar dunning emails | billing + notifications | BILL-001-003-001 | emails não duplicam por transição | M |

## PROGRAMA 06 — STORAGE

Objetivo: implementar upload/download seguro, quotas, R2 e auditoria.

### ÉPICO STO-001 — Storage Core

#### FEATURE STO-001-001 — Upload Seguro

| ID | Objetivo | Local afetado | Dependências | Critério de aceite | Est. |
|---|---|---|---|---|---|
| STO-001-001-001 | Validar entidades `assets`, `asset_versions`, `upload_sessions` | API storage/entities/migrations | MT-001-001-005 | entidades têm tenant_id e índices | M |
| STO-001-001-002 | Criar `PresignUploadDto` com MIME/tamanho/categoria | uploads dto | STO-001-001-001 | validação rejeita payload inválido | S |
| STO-001-001-003 | Implementar `UploadPolicyService` | uploads/storage service | STO-001-001-002, BILL-001-003-005 | aplica MIME, extensão, size e feature | M |
| STO-001-001-004 | Implementar `StorageQuotaService` | storage service | BILL-001-003-005 | quota por plano/tenant calculada | M |
| STO-001-001-005 | Criar `POST /uploads/presign` | uploads controller | STO-001-001-003 | retorna URL e key com prefix tenant | M |
| STO-001-001-006 | Criar `POST /uploads/confirm` | uploads controller | STO-001-001-005 | metadata fica confirmed | M |
| STO-001-001-007 | Criar `POST /assets/:id/download-url` | assets controller | STO-001-001-006 | signed URL valida tenant e permissão | M |
| STO-001-001-008 | Auditar presign/confirm/download/delete | audit service | STO-001-001-007 | audit log completo | S |
| STO-001-001-009 | Criar testes MIME proibido | storage tests | STO-001-001-003 | retorna `UPLOAD_POLICY_VIOLATION` | S |
| STO-001-001-010 | Criar testes quota excedida | storage tests | STO-001-001-004 | retorna `QUOTA_EXCEEDED` | S |
| STO-001-001-011 | Criar testes tenant B não baixa A | storage e2e | STO-001-001-007, MT-001-001-006 | retorna 404/403 | M |
| STO-001-001-012 | Criar componente web `UploadModal` reutilizável | web shared/storage | STO-001-001-005 | upload usa presign e confirm | M |

#### FEATURE STO-001-002 — Scan E Retenção

| ID | Objetivo | Local afetado | Dependências | Critério de aceite | Est. |
|---|---|---|---|---|---|
| STO-001-002-001 | Adicionar status `pending_scan/clean/infected` | assets migration/entity | STO-001-001-001 | assets novos iniciam pending_scan quando scan ativo | M |
| STO-001-002-002 | Criar job `scanAsset` | queues/storage | STO-001-002-001 | job atualiza status | L |
| STO-001-002-003 | Bloquear download antes de `clean` quando scan ativo | assets controller | STO-001-002-002 | download pending/infected bloqueado | M |
| STO-001-002-004 | Documentar política de retenção por bucket | docs/STORAGE_RUNBOOK.md | STO-001-001-007 | runbook define retenção e delete físico | S |

## PROGRAMA 07 — ADMIN SAAS

Objetivo: tornar o painel admin uma operação real de plataforma.

### ÉPICO ADMIN-001 — Clientes/Tenants

#### FEATURE ADMIN-001-001 — Lista E Edição Real De Clientes

| ID | Objetivo | Local afetado | Dependências | Critério de aceite | Est. |
|---|---|---|---|---|---|
| ADMIN-001-001-001 | Criar `GET /admin/tenants` com paginação/filtros | API admin tenants | RBAC-001-001-006, MT-001-001-003 | super_admin lista tenants reais | M |
| ADMIN-001-001-002 | Criar `PATCH /admin/tenants/:tenantId` | API admin tenants | ADMIN-001-001-001 | nome, slug, país, status persistem | M |
| ADMIN-001-001-003 | Criar ações suspender/reativar tenant admin | API admin tenants | BILL-001-003-001 | altera tenant/state e audita | M |
| ADMIN-001-001-004 | Conectar `/admin/clients` ao `GET /admin/tenants` | web admin clients | ADMIN-001-001-001 | refresh mantém dados reais | M |
| ADMIN-001-001-005 | Conectar modal editar ao `PATCH` real | web admin clients | ADMIN-001-001-002 | salvar altera banco e UI | M |
| ADMIN-001-001-006 | Criar testes permissão super_admin | API tests | ADMIN-001-001-001 | não super_admin recebe 403 | S |
| ADMIN-001-001-007 | Criar E2E editar cliente | web/api e2e | ADMIN-001-001-005 | alteração persiste após reload | M |

### ÉPICO ADMIN-002 — Planos, Auditoria E Suporte Global

| ID | Objetivo | Local afetado | Dependências | Critério de aceite | Est. |
|---|---|---|---|---|---|
| ADMIN-002-001-001 | Criar CRUD real de planos admin | API admin plans | BILL-001-001-006 | cria/edita plano e features | L |
| ADMIN-002-001-002 | Conectar `/admin/plans` à API real | web admin plans | ADMIN-002-001-001 | planos não dependem de mock | M |
| ADMIN-002-001-003 | Criar `GET /admin/audit` | API admin audit | FP-002-001-001 | filtros por tenant/user/action/date | M |
| ADMIN-002-001-004 | Conectar `/admin/audit` à API | web admin audit | ADMIN-002-001-003 | tabela com filtros funciona | M |
| ADMIN-002-001-005 | Criar suporte global admin | API/web admin support | SUP-001-001-001 | super_admin vê tickets cross-tenant | M |

## PROGRAMA 08 — CORE BUSINESS MODULES

Objetivo: fechar os módulos operacionais principais com CRUD real, RBAC, tenant isolation, billing e auditoria.

### ÉPICO ART-001 — Artistas

| ID | Objetivo | Local afetado | Dependências | Critério de aceite | Est. |
|---|---|---|---|---|---|
| ART-001-001-001 | Criar/validar migration `artists` | database | MT-001-001-005 | tabela tem tenant_id, status, índices | M |
| ART-001-001-002 | Criar DTOs `CreateArtistDto`, `UpdateArtistDto`, `ListArtistsDto` | API artists/dto | ART-001-001-001 | DTOs validam campos da MFS | S |
| ART-001-001-003 | Implementar `ArtistsRepository` | API artists/repositories | ART-001-001-002 | filtros sempre incluem tenant | M |
| ART-001-001-004 | Implementar `ArtistsService` CRUD | API artists | ART-001-001-003 | cria/lista/edita/arquiva | M |
| ART-001-001-005 | Implementar `ArtistsController` endpoints | API artists | ART-001-001-004 | endpoints `/artists` funcionam | M |
| ART-001-001-006 | Emitir/auditar `artist.created/updated` | API artists/events/audit | ART-001-001-005 | audit e evento gravados | S |
| ART-001-001-007 | Criar página/lista/form Artistas | web artists | ART-001-001-005 | UI CRUD com estados | L |
| ART-001-001-008 | Criar testes CRUD/tenant/billing | API/web tests | ART-001-001-007 | testes passam | M |

### ÉPICO ART-002 — Cadastro Público De Artistas

| ID | Objetivo | Local afetado | Dependências | Critério de aceite | Est. |
|---|---|---|---|---|---|
| ART-002-001-001 | Criar endpoint `GET /public/workspaces/:slug` | API public registration | ART-001-001-001 | valida ativo, não bloqueado, allow public | M |
| ART-002-001-002 | Criar `PublicArtistRegistrationDto` | API leads/artists dto | ART-002-001-001 | valida dados e sanitiza | S |
| ART-002-001-003 | Criar `POST /public/artist-registration` | API public registration | ART-002-001-002, CRM-001-001-001 | cria lead/artista no tenant do slug | M |
| ART-002-001-004 | Aplicar rate limit anti-spam | API public registration | ART-002-001-003 | IP/email/slug limitados | M |
| ART-002-001-005 | Criar página `/cadastro/:workspaceSlug` | web public signup | ART-002-001-001 | artista não escolhe workspace | M |
| ART-002-001-006 | Criar testes link inválido/bloqueado | API/web tests | ART-002-001-005 | erro amigável | M |

### ÉPICO CAT-001 — Catálogo

| ID | Objetivo | Local afetado | Dependências | Critério de aceite | Est. |
|---|---|---|---|---|---|
| CAT-001-001-001 | Validar migrations works/recordings/shares | database catalog | MT-001-001-005 | FKs e unique por tenant | M |
| CAT-001-001-002 | Criar DTOs de obra e fonograma | API catalog/dto | CAT-001-001-001 | valida identificadores e shares | M |
| CAT-001-001-003 | Implementar CRUD works | API catalog | CAT-001-001-002 | `/catalog/works` funcional | M |
| CAT-001-001-004 | Implementar CRUD recordings | API catalog | CAT-001-001-002 | `/catalog/recordings` funcional | M |
| CAT-001-001-005 | Implementar versionamento de metadados críticos | API catalog/db | CAT-001-001-003 | alteração gera snapshot | L |
| CAT-001-001-006 | Criar UI catálogo/lista/forms | web catalog | CAT-001-001-004 | obras/fonogramas criam/editam | L |
| CAT-001-001-007 | Criar testes shares/identificadores/tenant | tests | CAT-001-001-006 | validações passam | M |

### ÉPICO CON-001 — Contratos

| ID | Objetivo | Local afetado | Dependências | Critério de aceite | Est. |
|---|---|---|---|---|---|
| CON-001-001-001 | Validar schema contracts/templates/signers | database contracts | MT-001-001-005 | FKs e status existem | M |
| CON-001-001-002 | Criar DTOs contrato/template/assinatura | API contracts/dto | CON-001-001-001 | valida partes e signatários | M |
| CON-001-001-003 | Implementar CRUD templates | API contracts | CON-001-001-002 | template cria/edita | M |
| CON-001-001-004 | Implementar CRUD contratos | API contracts | CON-001-001-002 | contrato cria/edita/arquiva | M |
| CON-001-001-005 | Implementar `send-signature` com adapter | API contracts integrations | CON-001-001-004, INT-001-001-001 | envio retorna provider id | L |
| CON-001-001-006 | Implementar webhook assinatura | API contracts webhook | CON-001-001-005 | status assinado atualiza | M |
| CON-001-001-007 | Criar UI contratos/templates | web contracts | CON-001-001-004 | lifecycle operacional | L |
| CON-001-001-008 | Criar testes lifecycle/webhook | tests | CON-001-001-006 | assinatura inválida rejeitada | M |

### ÉPICO CRM-001 — CRM E Leads

| ID | Objetivo | Local afetado | Dependências | Critério de aceite | Est. |
|---|---|---|---|---|---|
| CRM-001-001-001 | Validar schema leads/contacts/pipeline | database crm | MT-001-001-005 | stage e tenant indexados | M |
| CRM-001-001-002 | Criar DTOs lead/interação/conversão | API crm/dto | CRM-001-001-001 | valida stage e origem | S |
| CRM-001-001-003 | Implementar CRUD leads | API crm | CRM-001-001-002 | `/leads` funcional | M |
| CRM-001-001-004 | Implementar move stage | API crm | CRM-001-001-003 | stage change audita | S |
| CRM-001-001-005 | Implementar conversão lead -> artista | API crm/artists | CRM-001-001-003, ART-001-001-004 | histórico preservado | M |
| CRM-001-001-006 | Criar UI pipeline/leads | web crm | CRM-001-001-005 | board/lista funcionando | L |
| CRM-001-001-007 | Criar testes pipeline/conversão | tests | CRM-001-001-006 | conversão no tenant certo | M |

### ÉPICO FIN-001 — Financeiro

| ID | Objetivo | Local afetado | Dependências | Critério de aceite | Est. |
|---|---|---|---|---|---|
| FIN-001-001-001 | Validar schema transactions/invoices/categories | database finance | MT-001-001-005 | índices por tenant/data/status | M |
| FIN-001-001-002 | Criar DTOs transação/invoice/regra | API finance/dto | FIN-001-001-001 | valida valores positivos | S |
| FIN-001-001-003 | Implementar CRUD transações | API finance | FIN-001-001-002 | financeiro cria/edita/lista | M |
| FIN-001-001-004 | Implementar invoices operacionais | API finance | FIN-001-001-003 | invoice operacional não confunde billing SaaS | M |
| FIN-001-001-005 | Implementar regras financeiras | API finance | FIN-001-001-003 | regra aplica categoria | M |
| FIN-001-001-006 | Criar UI financeiro | web finance | FIN-001-001-004 | tabela, filtros, forms | L |
| FIN-001-001-007 | Criar testes permissão financial | tests | FIN-001-001-006 | role sem permissão recebe 403 | M |

### ÉPICO MKT-001 — Marketing

| ID | Objetivo | Local afetado | Dependências | Critério de aceite | Est. |
|---|---|---|---|---|---|
| MKT-001-001-001 | Validar schema projects/campaigns/tasks | database marketing | STO-001-001-001 | assets vinculáveis | M |
| MKT-001-001-002 | Criar DTOs projeto/campanha/tarefa | API marketing/dto | MKT-001-001-001 | valida canais e datas | M |
| MKT-001-001-003 | Implementar CRUD projetos/campanhas | API marketing | MKT-001-001-002 | endpoints funcionam | M |
| MKT-001-001-004 | Implementar fluxo aprovação de asset | API marketing/storage | MKT-001-001-003, STO-001-001-007 | aprovação auditada | M |
| MKT-001-001-005 | Criar UI marketing | web marketing | MKT-001-001-004 | briefing/campanha/tarefas | L |
| MKT-001-001-006 | Criar publish job via adapter | API marketing queues | MKT-001-001-003, INT-001-001-001 | publish idempotente | L |
| MKT-001-001-007 | Criar testes campaign/approval | tests | MKT-001-001-005 | aprovação e read_only testados | M |

### ÉPICO REL-001 — Lançamentos

| ID | Objetivo | Local afetado | Dependências | Critério de aceite | Est. |
|---|---|---|---|---|---|
| REL-001-001-001 | Validar schema releases/tracks/status | database releases | CAT-001-001-004 | release vincula recording | M |
| REL-001-001-002 | Criar DTOs release/approve/distribute | API releases/dto | REL-001-001-001 | metadata mínima validada | S |
| REL-001-001-003 | Implementar CRUD releases | API releases | REL-001-001-002 | release cria/edita/lista | M |
| REL-001-001-004 | Implementar approve release | API releases | REL-001-001-003 | status aprovado audita | S |
| REL-001-001-005 | Implementar distribute release job | API releases queues | REL-001-001-004, INT-001-001-001 | status externo persistido | L |
| REL-001-001-006 | Criar UI lançamentos | web releases | REL-001-001-004 | fluxo cria/aprova | L |
| REL-001-001-007 | Criar testes metadata/aprovação | tests | REL-001-001-006 | distribuição sem metadata falha | M |

## PROGRAMA 09 — MONITORING E REGISTRY

Objetivo: entregar monitoramento, proteção de catálogo inicial, takedowns e registry sem simular IA/fingerprint real.

### ÉPICO MON-001 — Monitoramento

| ID | Objetivo | Local afetado | Dependências | Critério de aceite | Est. |
|---|---|---|---|---|---|
| MON-001-001-001 | Validar hooks/services monitoring existentes | web/api monitoring | CAT-001-001-004 | gaps documentados | S |
| MON-001-001-002 | Implementar endpoints detecções/ECAD/divergências | API monitoring | MON-001-001-001 | tabs antigas têm dados reais | M |
| MON-001-001-003 | Implementar endpoints takedowns | API takedowns | MON-001-001-002 | criar/listar/atualizar | M |
| MON-001-001-004 | Manter aba Proteção de Catálogo sem IA real | web monitoring | MON-001-001-002 | mostra indicadores base e empty state | S |
| MON-001-001-005 | Criar testes tabs antigas e nova aba | web tests | MON-001-001-004 | tabs não quebram | S |
| MON-001-001-006 | Criar audit de takedown/status | API monitoring audit | MON-001-001-003 | evento auditado | S |

### ÉPICO REG-001 — Registry

| ID | Objetivo | Local afetado | Dependências | Critério de aceite | Est. |
|---|---|---|---|---|---|
| REG-001-001-001 | Validar schema right_holders/submissions | database registry | CAT-001-001-005 | payload snapshot possível | M |
| REG-001-001-002 | Criar DTOs titular/submission | API registry/dto | REG-001-001-001 | valida sociedade e identificadores | M |
| REG-001-001-003 | Implementar prepare submission | API registry | REG-001-001-002 | payload versionado | M |
| REG-001-001-004 | Implementar submit via adapter | API registry/integrations | REG-001-001-003, INT-001-001-001 | envio audita request/result | L |
| REG-001-001-005 | Criar UI registry | web registry | REG-001-001-003 | lista/prepare/submit | L |
| REG-001-001-006 | Criar testes payload/status | tests | REG-001-001-004 | rejeição provider registrada | M |

## PROGRAMA 10 — INTEGRATIONS E AI

Objetivo: padronizar adapters, webhooks, retries, healthchecks e uso de IA controlado por plano.

### ÉPICO INT-001 — Adapter Framework

| ID | Objetivo | Local afetado | Dependências | Critério de aceite | Est. |
|---|---|---|---|---|---|
| INT-001-001-001 | Criar interface `ProviderAdapter` | `apps/api/src/modules/integrations` | FP-001-001-001 | adapters implementam contrato comum | M |
| INT-001-001-002 | Criar token store criptografado | API integrations/db | FP-001-002-006 | tokens salvos criptografados | L |
| INT-001-001-003 | Criar healthcheck por provider | API integrations | INT-001-001-001 | status aparece no admin | M |
| INT-001-001-004 | Criar retry/DLQ para provider actions | queues integrations | INT-001-001-001 | falha temporária reprocessa | M |
| INT-001-001-005 | Criar webhook validation base | API integrations webhooks | INT-001-001-001 | provider sem assinatura é marcado explicitamente | M |
| INT-001-001-006 | Criar UI integrações | web integrations/settings | INT-001-001-003 | conectar/desconectar/status | L |

### ÉPICO AI-001 — AI Skills

| ID | Objetivo | Local afetado | Dependências | Critério de aceite | Est. |
|---|---|---|---|---|---|
| AI-001-001-001 | Criar provider router OpenAI/Anthropic/Gemini | API ai | INT-001-001-001, BILL-001-003-005 | provider seleciona por config | L |
| AI-001-001-002 | Criar entidades `ai_runs` e `ai_usage_logs` | database ai | AI-001-001-001 | custo/tenant/user registrado | M |
| AI-001-001-003 | Implementar budget por plano | API ai/billing | BILL-001-003-005, AI-001-001-002 | excedido retorna bloqueio | M |
| AI-001-001-004 | Criar endpoint `POST /ai/skills/:id/run` | API ai | AI-001-001-003 | executa skill autorizada | M |
| AI-001-001-005 | Criar componente `SkillRunner` | web shared/ai | AI-001-001-004 | UI mostra loading/result/error | M |
| AI-001-001-006 | Criar testes provider failure/budget | tests | AI-001-001-004 | falhas não vazam secrets | M |

## PROGRAMA 11 — SUPPORT, RH E AUDIOVISUAL

Objetivo: fechar módulos auxiliares com permissões, auditoria e experiência mínima enterprise.

### ÉPICO SUP-001 — Suporte

| ID | Objetivo | Local afetado | Dependências | Critério de aceite | Est. |
|---|---|---|---|---|---|
| SUP-001-001-001 | Validar schema tickets/messages/articles | database support | MT-001-001-005 | tickets tenant-scoped | M |
| SUP-001-001-002 | Criar DTOs ticket/reply/article | API support/dto | SUP-001-001-001 | valida assunto/mensagem | S |
| SUP-001-001-003 | Implementar CRUD tickets | API support | SUP-001-001-002 | criar/responder/resolver | M |
| SUP-001-001-004 | Implementar base de conhecimento | API support | SUP-001-001-003 | articles CRUD | M |
| SUP-001-001-005 | Criar UI suporte/base | web support | SUP-001-001-004 | tickets e artigos funcionam | L |
| SUP-001-001-006 | Garantir suporte acessível com tenant suspenso | billing guard/API/web | SUP-001-001-005, BILL-001-003-004 | `/support` acessível | S |
| SUP-001-001-007 | Criar testes ticket/suspenso | tests | SUP-001-001-006 | suspended ainda cria ticket | M |

### ÉPICO RH-001 — RH

| ID | Objetivo | Local afetado | Dependências | Critério de aceite | Est. |
|---|---|---|---|---|---|
| RH-001-001-001 | Validar schema employees/payroll/leave | database rh | MT-001-001-005 | dados sensíveis tenant-scoped | M |
| RH-001-001-002 | Criar DTOs employee/payroll/leave | API rh/dto | RH-001-001-001 | valida documentos e datas | M |
| RH-001-001-003 | Implementar CRUD employees | API rh | RH-001-001-002 | funcionários CRUD | M |
| RH-001-001-004 | Implementar leave approval | API rh | RH-001-001-003 | aprovar/rejeitar audita | M |
| RH-001-001-005 | Criar UI RH | web rh | RH-001-001-004 | lista/forms/aprovação | L |
| RH-001-001-006 | Criar testes PII/permission | tests | RH-001-001-005 | viewer sem permissão não vê dados sensíveis | M |

### ÉPICO AV-001 — Audiovisual

| ID | Objetivo | Local afetado | Dependências | Critério de aceite | Est. |
|---|---|---|---|---|---|
| AV-001-001-001 | Validar schema projects/shots/deliverables | database audiovisual | STO-001-001-001 | assets vinculáveis | M |
| AV-001-001-002 | Criar DTOs projeto/shot/deliverable | API audiovisual/dto | AV-001-001-001 | valida datas e responsáveis | M |
| AV-001-001-003 | Implementar CRUD projetos audiovisuais | API audiovisual | AV-001-001-002 | CRUD tenant-scoped | M |
| AV-001-001-004 | Implementar approval de deliverable | API audiovisual | AV-001-001-003 | aprovação audita | M |
| AV-001-001-005 | Criar UI audiovisual | web audiovisual | AV-001-001-004 | projetos/shots/aprovações | L |
| AV-001-001-006 | Criar testes lifecycle | tests | AV-001-001-005 | approval e storage funcionam | M |

## PROGRAMA 12 — REPORTS

Objetivo: entregar relatórios, export/import, jobs assíncronos e masking.

### ÉPICO REP-001 — Relatórios E Export

| ID | Objetivo | Local afetado | Dependências | Critério de aceite | Est. |
|---|---|---|---|---|---|
| REP-001-001-001 | Validar report definitions existentes | API reports | RBAC-001-001-006 | definitions mapeiam permissões | M |
| REP-001-001-002 | Criar `POST /reports/export` | API reports | REP-001-001-001, STO-001-001-007 | export autorizado gera arquivo/response | M |
| REP-001-001-003 | Criar job export assíncrono | queues reports | REP-001-001-002 | dataset grande não trava HTTP | L |
| REP-001-001-004 | Criar import validate/commit | API reports | REP-001-001-001 | valida antes de persistir | L |
| REP-001-001-005 | Criar PII masking por permissão | API reports | RBAC-001-001-006 | campos sensíveis ocultos | M |
| REP-001-001-006 | Criar UI reports/export/import | web reports | REP-001-001-004 | usuário exporta/importa com feedback | L |
| REP-001-001-007 | Criar testes export permission/async | tests | REP-001-001-006 | export sem permissão bloqueia | M |

## PROGRAMA 13 — OBSERVABILITY

Objetivo: tornar o sistema operável com logs, métricas, traces, dashboards e alertas.

### ÉPICO OBS-001 — Logs, Metrics E Traces

| ID | Objetivo | Local afetado | Dependências | Critério de aceite | Est. |
|---|---|---|---|---|---|
| OBS-001-001-001 | Padronizar logger JSON API | `apps/api/src/observability` | FP-001-001-001 | logs têm requestId/correlationId/tenantId | M |
| OBS-001-001-002 | Adicionar redaction de secrets/PII | observability logger | OBS-001-001-001 | logs não expõem tokens | M |
| OBS-001-001-003 | Instrumentar metrics HTTP/DB/queue | API observability | OBS-001-001-001 | `/metrics` expõe métricas | M |
| OBS-001-001-004 | Instrumentar billing/storage/webhooks metrics | API modules | BILL-001-002-006, STO-001-001-007 | métricas por fluxo crítico | M |
| OBS-001-001-005 | Configurar Sentry web/API | web/api observability | OBS-001-001-001 | erros têm release e context | M |
| OBS-001-001-006 | Configurar OpenTelemetry recomendado | packages/observability | OBS-001-001-003 | trace request->DB->queue em staging | L |
| OBS-001-001-007 | Criar dashboards Grafana | infra/monitoring | OBS-001-001-004 | painéis API, billing, queues, storage | L |
| OBS-001-001-008 | Criar alertas críticos | infra/monitoring | OBS-001-001-007 | 5xx/webhook/DLQ alertam | M |

## PROGRAMA 14 — QA, HARDENING E PRODUCTION

Objetivo: fechar validação, segurança, CI/CD, staging, rollback e go/no-go.

### ÉPICO QA-001 — Test Strategy

| ID | Objetivo | Local afetado | Dependências | Critério de aceite | Est. |
|---|---|---|---|---|---|
| QA-001-001-001 | Criar matriz de testes por módulo | `docs/TEST_STRATEGY.md` | MTIS completo | cada módulo tem cenários obrigatórios | S |
| QA-001-001-002 | Criar suíte E2E happy path tenant | e2e | AUTH-001-001-011, MT-001-001-008 | login -> CRUD core -> logout | L |
| QA-001-001-003 | Criar suíte E2E billing blocked | e2e | BILL-001-003-010 | read_only/suspended validados | M |
| QA-001-001-004 | Criar suíte E2E admin | e2e | ADMIN-001-001-007 | super_admin clients/subscriptions | M |
| QA-001-001-005 | Criar smoke test produção | scripts/smoke | OBS-001-001-003 | health/auth/billing/storage básicos | M |

### ÉPICO PROD-001 — Produção

| ID | Objetivo | Local afetado | Dependências | Critério de aceite | Est. |
|---|---|---|---|---|---|
| PROD-001-001-001 | Criar runbook staging | docs/PRODUCTION_RUNBOOK.md | FP-001-002-006 | env/secrets/deploy documentados | S |
| PROD-001-001-002 | Criar checklist backup/restore | docs/PRODUCTION_RUNBOOK.md | FP-002-001-003 | restore drill definido | S |
| PROD-001-001-003 | Criar rollback runbook | docs/PRODUCTION_RUNBOOK.md | FP-001-001-009 | rollback app/migration descrito | S |
| PROD-001-001-004 | Executar go/no-go staging | docs/GO_NO_GO.md | QA-001-001-005 | checklist sem P0 aberto | L |
| PROD-001-001-005 | Preparar release 1.0 | releases | PROD-001-001-004 | tag, changelog, rollback prontos | M |

## MATRIZ DE DEPENDÊNCIAS

| ID | Item | Depende de |
|---|---|---|
| FP-001 | Foundation Platform | nenhuma |
| FP-002 | Database/RLS Base | FP-001 |
| AUTH-001 | Auth Core | FP-001, FP-002 |
| RBAC-001 | RBAC Core | AUTH-001, FP-002 |
| MT-001 | Multi-Tenancy | AUTH-001, RBAC-001, FP-002 |
| BILL-001 | Billing | MT-001, RBAC-001, FP-002 |
| STO-001 | Storage | MT-001, BILL-001 |
| ADMIN-001 | Admin Clients | RBAC-001, MT-001, BILL-001 |
| ADMIN-002 | Admin Plans/Audit/Support | ADMIN-001, BILL-001 |
| ART-001 | Artistas | MT-001, RBAC-001, BILL-001 |
| CRM-001 | CRM/Leads | MT-001, RBAC-001, ART-001 |
| ART-002 | Cadastro Público | ART-001, CRM-001, STO-001 |
| CAT-001 | Catálogo | ART-001, STO-001 |
| CON-001 | Contratos | ART-001, STO-001, INT-001 |
| FIN-001 | Financeiro | MT-001, RBAC-001, BILL-001 |
| MKT-001 | Marketing | STO-001, INT-001, AI-001 |
| REL-001 | Lançamentos | CAT-001, INT-001 |
| MON-001 | Monitoramento | CAT-001, INT-001 |
| REG-001 | Registry | CAT-001, INT-001 |
| INT-001 | Integrações | MT-001, RBAC-001 |
| AI-001 | AI Skills | INT-001, BILL-001 |
| SUP-001 | Suporte | MT-001, RBAC-001, BILL-001 |
| RH-001 | RH | MT-001, RBAC-001 |
| AV-001 | Audiovisual | STO-001, MT-001, RBAC-001 |
| REP-001 | Relatórios | RBAC-001, STO-001 |
| OBS-001 | Observabilidade | FP-001, BILL-001, STO-001 |
| QA-001 | QA | módulos concluídos por release |
| PROD-001 | Produção | QA-001, OBS-001 |

Observação: a dependência granular de cada task está registrada na coluna `Dependências` das tabelas de execução acima.

## MATRIZ DE ESTIMATIVA

| Grupo | XS | S | M | L | XL | Observação |
|---|---:|---:|---:|---:|---:|---|
| Foundation | 0 | 10 | 9 | 0 | 0 | setup e gates |
| Auth | 0 | 8 | 9 | 0 | 0 | Supabase reduz escopo |
| RBAC | 0 | 1 | 9 | 1 | 0 | risco em rollout |
| Multi-Tenancy | 0 | 1 | 9 | 1 | 0 | RLS exige cuidado |
| Billing | 0 | 8 | 18 | 5 | 0 | Stripe e estado financeiro |
| Storage | 0 | 5 | 9 | 2 | 0 | scan pode variar |
| Admin SaaS | 0 | 1 | 10 | 1 | 0 | depende de APIs reais |
| Core Modules | 0 | 11 | 41 | 12 | 0 | CRUDs e UIs densas |
| Monitoring/Registry | 0 | 3 | 7 | 2 | 0 | provider externo é risco |
| Integrations/AI | 0 | 0 | 7 | 5 | 0 | tokens e adapters |
| Support/RH/AV | 0 | 2 | 11 | 3 | 0 | domínio médio |
| Reports | 0 | 0 | 4 | 3 | 0 | export async/import |
| Observability | 0 | 0 | 6 | 2 | 0 | dashboards/traces |
| QA/Production | 0 | 3 | 4 | 2 | 0 | go/no-go |

## MATRIZ DE RISCO

| Épico | Risco | Impacto | Probabilidade | Mitigação |
|---|---|---|---|---|
| FP-001 | CI quebrar por dívida existente | Médio | Alta | baseline inicial e correção incremental |
| FP-002 | migrations incompatíveis | Alto | Média | staging restore e db:check antes de merge |
| AUTH-001 | bypass vazar em produção | Crítico | Média | env gates e CI |
| RBAC-001 | usuários perderem acesso | Alto | Média | shadow/readiness antes de ON |
| MT-001 | vazamento cross-tenant | Crítico | Média | RLS + tests + app role sem bypass |
| BILL-001 | Stripe divergir do banco | Crítico | Média | idempotência + reconciliation |
| STO-001 | uploads indevidos/custo alto | Alto | Média | MIME, quota, scan e audit |
| ADMIN-001 | admin operar mock | Alto | Alta | APIs reais antes de release |
| ART/CRM/CAT | CRUD sem tenant filter | Crítico | Média | repository pattern + tests |
| CON/INT | webhook externo inválido | Alto | Média | assinatura + idempotência |
| MKT/REL/REG/MON | provider instável | Médio | Alta | adapter + retry + DLQ |
| AI-001 | custo e PII | Alto | Média | budget + logs redacted |
| REP-001 | export travar API | Alto | Média | jobs assíncronos |
| OBS-001 | incidente invisível | Alto | Média | logs/metrics/alerts obrigatórios |
| PROD-001 | rollback incompleto | Crítico | Média | rollback drill e feature flags |

## MATRIZ DE PULL REQUESTS

| PR | Nome | Objetivo | Arquivos afetados | Critérios de merge |
|---|---|---|---|---|
| PR-001 | Foundation Structure | Estrutura, scripts, docs dev | raiz, apps/worker, docs | typecheck/lint/build baseline |
| PR-002 | Production Env Gates | Bloquear auth/mock em produção | env schema web/api, CI | testes gates passam |
| PR-003 | Database RLS Foundation | db:check, app role, RLS scripts | database, scripts, CI | verify RLS passa |
| PR-004 | Auth Context | `/auth/context`, AuthContext web | auth API/web | login/context e2e |
| PR-005 | RBAC Core | roles/permissions/guards | core rbac, migrations | role allow/deny tests |
| PR-006 | Tenant Isolation | TenantGuard/RLS policies | core guards, migrations | tenant isolation passa |
| PR-007 | Billing Schema | subscriptions/state/invoices/events | billing migrations/entities | db:check/typecheck |
| PR-008 | Stripe Webhook | webhook assinado/idempotente | billing service/controller/tests | invalid/duplicate/paid/failed tests |
| PR-009 | Billing Enforcement | guards/context/blocked page | billing API/web | read_only/suspended e2e |
| PR-010 | Admin Billing | admin subscriptions real | admin web/API billing | actions auditadas |
| PR-011 | Storage Core | presign/confirm/download/quota | uploads/assets/storage | upload tests |
| PR-012 | Admin Clients | tenants real CRUD | admin tenants web/API | edit persists |
| PR-013 | Artists + Public Registration | artists CRUD e slug público | artists/leads web/API | cadastro por slug |
| PR-014 | CRM Core | leads/pipeline/conversion | crm web/API | conversion tests |
| PR-015 | Catalog Core | works/recordings/shares | catalog web/API | catalog validation |
| PR-016 | Contracts Core | templates/contracts/signature | contracts web/API | webhook tests |
| PR-017 | Finance Core | transactions/invoices/rules | finance web/API | financial tests |
| PR-018 | Marketing/Releases Core | campanhas/releases | marketing/releases | approval/distribute tests |
| PR-019 | Monitoring/Registry | monitoramento/takedown/registry | monitoring/registry | tabs/payload tests |
| PR-020 | Integrations Framework | adapters/token/health/DLQ | integrations/queues | provider tests |
| PR-021 | AI Skills | AI router/budget/usage | ai web/API | budget/provider tests |
| PR-022 | Support/RH/Audiovisual | módulos auxiliares | support/rh/audiovisual | CRUD/permission tests |
| PR-023 | Reports Async | export/import async | reports/queues/storage | export tests |
| PR-024 | Observability | logs/metrics/Sentry/alerts | observability/infra | metrics and smoke |
| PR-025 | Production Hardening | smoke, runbooks, go/no-go | docs/scripts/CI | release checklist verde |

## MATRIZ DE RELEASES

| Release | Nome | Funcionalidades | Dependências | Critérios de aceite | Go/No-Go |
|---|---|---|---|---|---|
| 0.1 | Foundation | monorepo, tooling, env gates, db checks | PR-001..003 | CI baseline verde | sem bypass prod |
| 0.2 | Auth + RBAC | auth context, guards, RBAC persisted shadow | PR-004..005 | login + role allow/deny | sem rota protegida aberta |
| 0.3 | Multi-Tenancy | TenantGuard, RLS, tenant tests | PR-006 | tenant isolation passa | app role sem BYPASSRLS |
| 0.4 | Billing | Stripe, enforcement, admin billing | PR-007..010 | grace/read_only/suspended | webhook tests verdes |
| 0.5 | Storage | presign, confirm, download, quota | PR-011 | upload/download seguro | quota/MIME testados |
| 0.6 | Core Business Modules | admin clients, artists, CRM, catalog, contracts, finance | PR-012..017 | CRUDs principais e2e | sem mock crítico |
| 0.7 | Integrations | marketing, releases, monitoring, registry, adapters, AI | PR-018..021 | providers com retry/DLQ | healthchecks visíveis |
| 0.8 | Support + Reports + Observability | support/RH/AV/reports/logs/metrics | PR-022..024 | export async + dashboards | alertas críticos ativos |
| 0.9 | Hardening | test strategy, E2E, smoke, security | PR-025 parcial | CI completo verde | nenhum P0/P1 aberto |
| 1.0 | Production Ready | staging aprovado, backup/restore, rollback | PR-025 final | go/no-go aprovado | deploy com rollback |

## PLANO DE EXECUÇÃO FINAL

1. FP-001 Foundation tooling.
2. FP-002 Database/RLS foundation.
3. AUTH-001 Auth context e rota `/auth`.
4. RBAC-001 roles, permissions e guard.
5. MT-001 tenant context, RLS e isolation tests.
6. BILL-001 schema billing.
7. BILL-001 Stripe webhook.
8. BILL-001 billing enforcement backend/frontend.
9. BILL-001 admin billing.
10. STO-001 storage upload/download/quota.
11. ADMIN-001 admin clients real.
12. ADMIN-002 plans/audit/support global.
13. ART-001 artistas CRUD.
14. CRM-001 leads/pipeline.
15. ART-002 cadastro público por slug.
16. CAT-001 catálogo.
17. CON-001 contratos.
18. FIN-001 financeiro.
19. INT-001 framework de integrações.
20. MKT-001 marketing.
21. REL-001 lançamentos.
22. MON-001 monitoramento.
23. REG-001 registry.
24. AI-001 AI skills.
25. SUP-001 suporte.
26. RH-001 RH.
27. AV-001 audiovisual.
28. REP-001 relatórios.
29. OBS-001 observabilidade.
30. QA-001 suítes E2E/smoke.
31. PROD-001 staging, rollback, go/no-go e release 1.0.

Nada deve ser executado fora dessa ordem sem revisão formal de dependência.

## DEFINITION OF DONE EXECUÇÃO

Uma task só pode ser concluída quando:

- código implementado no local definido;
- DTOs/schemas atualizados quando houver contrato API;
- migration criada quando houver alteração de schema;
- testes unitários criados ou atualizados;
- testes de integração/E2E criados quando o fluxo cruzar frontend/backend;
- tenant isolation validado quando a task tocar dado tenant-scoped;
- RBAC validado quando a task tocar ação protegida;
- billing read_only/suspended validado quando a task tocar mutação;
- auditoria implementada quando houver mutação crítica;
- observabilidade mínima adicionada para fluxo crítico;
- lint passando;
- typecheck passando;
- build passando;
- documentação atualizada;
- PR revisado e aprovado;
- PR mergeado sem bypass manual de CI.

