# PLANO MASTER DE IMPLEMENTAÇÃO ENTERPRISE

Base: `docs/BLUEPRINT_ENTERPRISE.md`  
Data: 2026-07-01  
Escopo: execução técnica para transformar o estado atual do MUSIC OS 360 em operação SaaS enterprise.

## 1. Diagnóstico Operacional

### Estado Atual Do Projeto

O projeto já possui uma base enterprise relevante:

- Monorepo pnpm com `apps/web`, `apps/api` e `packages/*`.
- Frontend React/Vite modular com rotas públicas, protegidas e super admin.
- Backend NestJS modular com TypeORM, PostgreSQL, Supabase Auth, RLS, guards globais, audit interceptor, eventos, BullMQ/Redis, Stripe, R2 e health/metrics.
- Banco com migrations versionadas, entidades extensas e módulos de domínio para artistas, catálogo, contratos, financeiro, CRM, marketing, monitoramento, registry, storage, relatórios, RH, audiovisual e suporte.
- Billing enforcement parcial já existe: Stripe webhook, idempotência, `tenant_billing_state`, guard backend e reflexo frontend.
- Observabilidade parcial existe: `/metrics`, healthchecks, Prometheus/Grafana e Sentry helpers.

O projeto ainda não está pronto para produção enterprise porque fluxos críticos têm lacunas:

- Admin SaaS ainda usa fonte mock/local em áreas críticas.
- RBAC persisted authority está em modo transicional/shadow.
- RLS existe, mas produção exige app DB role sem `BYPASSRLS` e verificação contínua.
- Billing precisa reconciliation, dunning, listagem admin real e feature gates persistidos.
- Storage precisa hardening de upload público, MIME/extension policy, quota e auditoria de download.
- Integrações externas precisam adapters consistentes, retries, DLQ e healthchecks por provider.
- CI/CD deve bloquear release por typecheck, lint, tests, migrations, tenant isolation, billing webhook, storage e smoke.

### Principais Bloqueadores

| Bloqueador | Local afetado | Impacto | Ordem |
|---|---|---|---|
| Bypass de auth e mock mode não podem vazar para produção | `apps/web/src/shared/lib/env.ts`, `apps/api/src/core/auth-disabled.ts`, env/schema, CI | Risco crítico de acesso indevido | 1 |
| Admin SaaS com dados mock/local em fluxos críticos | `apps/web/src/modules/admin/*`, `apps/api/src/modules/billing`, novos controllers admin | Super admin não opera tenants reais | 2 |
| RBAC ainda em transição | `apps/api/src/core/guards/*`, `apps/api/src/core/rbac/*`, RBAC UI em settings/admin | Permissões podem divergir do banco | 3 |
| RLS precisa validação production-grade | migrations, `DatabaseModule`, `RequestTenantContextInterceptor`, scripts verify | Vazamento cross-tenant | 4 |
| Billing sem reconciliation/dunning/listagem real | `apps/api/src/modules/billing/*`, queues, admin frontend | Tenants podem ficar liberados/bloqueados incorretamente | 5 |
| Upload sem antivirus/quota/download audit completo | `uploads`, `storage`, `assets`, `PlanLimitModule` | Risco de abuso e custo | 6 |
| Integrações heterogêneas | `apps/api/src/modules/integrations/*`, `shared/integrations/*` | Falhas silenciosas e suporte difícil | 7 |
| Observabilidade incompleta | `packages/observability`, `apps/api/src/main.ts`, infra | Operação sem diagnóstico | 8 |

### Riscos Críticos

- **IDOR/cross-tenant:** qualquer rota sem `tenant_id`, RLS ou `X-Tenant-ID` validado pode expor dados.
- **Billing inconsistente:** Stripe pode divergir do banco sem reconciliation job.
- **Admin ilusório:** telas admin com mock dão falsa percepção de controle.
- **Auth bypass:** `AUTH_DISABLED` precisa ser impossível em produção.
- **RBAC shadow:** produção com enforcement off permite permissões legadas inconsistentes.
- **Webhooks:** qualquer webhook sem assinatura, idempotência e retry quebra integridade.
- **Uploads:** arquivos não escaneados ou sem quota podem gerar abuso, malware e custo.

### Ordem Correta De Ataque

1. Travar ambiente de produção: auth, env schema, secrets, RLS role, CI.
2. Remover mocks de fluxos administrativos críticos.
3. Fechar multi-tenancy/RBAC: enforcement, tests, dashboards.
4. Completar billing: admin real, reconciliation, dunning, feature gates.
5. Hardening de storage/upload.
6. Padronizar integrações externas.
7. Expandir testes e CI/CD.
8. Completar observabilidade e runbooks.
9. Homologar staging e executar go/no-go.

## 2. Backlog Priorizado

### P0 — Bloqueia Produção

#### P0.1 Bloquear `AUTH_DISABLED` e `MOCK_MODE` em produção

- **Módulo:** Auth / Segurança.
- **Arquivos afetados:** `apps/api/src/core/auth-disabled.ts`, `apps/api/src/core/config/env.schema.ts`, `apps/web/src/shared/lib/env.ts`, `.env.example`, `.github/workflows/*`.
- **Dependências:** nenhum.
- **Impacto:** impede bypass de autenticação em produção.
- **Ação técnica:** adicionar validação fail-fast se `NODE_ENV=production` e `AUTH_DISABLED=true` ou `VITE_AUTH_DISABLED=true`; adicionar check CI que falha em build production com essas flags.
- **Risco:** ambientes de homologação que dependem do bypass precisarão usar `staging` ou credenciais reais.
- **Critério de aceite:** API e Web recusam iniciar/buildar em produção com bypass ativo; teste unitário cobre validação.

#### P0.2 Validar app DB role sem `BYPASSRLS`

- **Módulo:** Multi-tenancy / Banco.
- **Arquivos afetados:** `apps/api/src/database/database.module.ts`, `apps/api/src/core/interceptors/request-tenant-context.interceptor.ts`, `apps/api/scripts/verify-rls.ts`, `apps/api/scripts/verify-tenant-isolation.ts`, env `APP_DATABASE_URL`.
- **Dependências:** credencial Postgres da role app.
- **Impacto:** reduz risco de vazamento cross-tenant.
- **Ação técnica:** exigir `DATABASE_SESSION_CONTEXT_ENABLED=true`, `DATABASE_RLS_ENFORCEMENT=true` e `APP_DATABASE_URL` em staging/prod; ampliar script para verificar `rolbypassrls=false`.
- **Risco:** queries sem tenant context passarão a falhar.
- **Critério de aceite:** `verify:tenant-isolation` e `verify:critical-rls` passam usando app role.

#### P0.3 Ligar Admin Subscriptions a listagem real

- **Módulo:** Admin SaaS / Billing.
- **Arquivos afetados:** `apps/api/src/modules/billing/billing.controller.ts`, `apps/api/src/modules/billing/billing.service.ts`, `apps/web/src/modules/admin/pages/AdminSubscriptions.tsx`, `apps/web/src/modules/admin/services/admin-billing.service.ts`.
- **Dependências:** entidades `BillingSubscriptionEntity`, `TenantBillingStateEntity`, `InvoiceEntity`.
- **Impacto:** super admin opera dados reais.
- **Ação técnica:** criar `GET /billing/admin/subscriptions`, `GET /billing/admin/tenants/:tenantId/billing-state`, `GET /billing/admin/invoices`; trocar `ADMIN_SUBSCRIPTIONS` por React Query.
- **Risco:** divergência de shape entre mock e API.
- **Critério de aceite:** tela `/admin/subscriptions` renderiza dados do banco e ações suspend/reactivate/override atualizam API e UI.

#### P0.4 Ligar Admin Clients a tenants reais

- **Módulo:** Admin SaaS / Tenants.
- **Arquivos afetados:** novo controller em `apps/api/src/modules/admin` ou `apps/api/src/modules/billing/admin`, `apps/web/src/modules/admin/pages/AdminClients.tsx`, `apps/web/src/modules/admin/services`.
- **Dependências:** `TenantEntity`, `OrganizationEntity`, `OrgMemberEntity`.
- **Impacto:** elimina operação local/mock de clientes.
- **Ação técnica:** criar endpoints super admin para listar, editar, suspender/reativar tenants; substituir `ADMIN_TENANTS`.
- **Risco:** permissões super admin precisam ser estritas.
- **Critério de aceite:** editar cliente persiste no banco; refresh mantém alterações; audit log criado.

#### P0.5 Stripe webhook completo com testes de assinatura/idempotência

- **Módulo:** Billing.
- **Arquivos afetados:** `apps/api/src/modules/billing/billing.service.ts`, `billing-enforcement.service.ts`, `billing.service.spec.ts`, e2e webhook.
- **Dependências:** `STRIPE_WEBHOOK_SECRET`, raw body configurado em `main.ts`.
- **Impacto:** integridade financeira.
- **Ação técnica:** cobrir eventos obrigatórios, duplicate event, invalid signature, subscription deleted, invoice failed/succeeded; garantir 2xx só após persistência.
- **Risco:** raw body incorreto quebra validação Stripe.
- **Critério de aceite:** testes unit/e2e passam e evento duplicado não altera estado duas vezes.

#### P0.6 RBAC persisted authority production gate

- **Módulo:** RBAC.
- **Arquivos afetados:** `apps/api/src/core/guards/permissions.guard.ts`, `apps/api/src/core/rbac/*`, `apps/api/scripts/rbac-shadow-go-no-go.ts`, env schema.
- **Dependências:** RBAC decision logs consistentes.
- **Impacto:** permissões reais do banco viram fonte de verdade.
- **Ação técnica:** definir rollout `SHADOW -> ON`; CI bloqueia produção se readiness falhar; documentar exceções.
- **Risco:** usuários podem perder acesso se roles incompletos.
- **Critério de aceite:** `rbac:shadow:go-no-go` aprova e produção usa `RBAC_PERSISTED_AUTHORITY=ON`.

### P1 — Bloqueia MVP Confiável

#### P1.1 Billing reconciliation job

- **Módulo:** Billing / Queues.
- **Arquivos afetados:** `apps/api/src/queues/services`, `apps/api/src/queues/processors`, `apps/api/src/modules/billing`.
- **Dependências:** Stripe SDK, Redis.
- **Impacto:** corrige divergências Stripe x banco.
- **Ação técnica:** job diário por tenant/customer para buscar subscription/invoices e reconciliar `tenant_billing_state`.
- **Risco:** rate limits Stripe.
- **Critério de aceite:** job idempotente, auditado, com métricas de reconciliados/falhas.

#### P1.2 Dunning e emails de cobrança

- **Módulo:** Billing / Notifications.
- **Arquivos afetados:** `apps/api/src/modules/billing`, `apps/api/src/modules/notifications`, `apps/api/src/queues/services/email-queue.service.ts`.
- **Dependências:** Resend config.
- **Impacto:** reduz inadimplência manual.
- **Ação técnica:** emails para payment_grace/read_only/suspended; templates auditáveis.
- **Risco:** envio duplicado sem idempotência.
- **Critério de aceite:** cada transição dispara no máximo um email por regra/período.

#### P1.3 Feature gates persistidos por plano

- **Módulo:** Billing / Tenant / Frontend Navigation.
- **Arquivos afetados:** `tenant-labels.ts`, `TenantContext`, `billing.service.ts`, `PlanLimitModule`, `AdminPlans.tsx`.
- **Dependências:** planos e features no banco.
- **Impacto:** plano contratado controla módulos reais.
- **Ação técnica:** persistir features por plano, expor no `/auth/context` ou endpoint tenant, remover hardcode como fonte principal.
- **Risco:** navegação pode ocultar módulos indevidamente.
- **Critério de aceite:** alterar plano no admin muda features após refetch sem deploy.

#### P1.4 Upload quota e MIME policy

- **Módulo:** Storage.
- **Arquivos afetados:** `apps/api/src/modules/uploads/dto/presign-upload.dto.ts`, `uploads.controller.ts`, `storage.service.ts`, `PlanLimitModule`.
- **Dependências:** billing plan limits.
- **Impacto:** evita abuso e arquivos inválidos.
- **Ação técnica:** validar extensão, MIME, tamanho e quota antes do presign.
- **Risco:** uploads legítimos podem ser bloqueados se allowlist incompleta.
- **Critério de aceite:** testes cobrem MIME proibido, tamanho excedido e quota por tenant.

#### P1.5 Public registration hardening

- **Módulo:** Leads / Cadastro Público.
- **Arquivos afetados:** `apps/api/src/modules/leads/public-registration.controller.ts`, service associado, `ArtistaSignupPublic.tsx`.
- **Dependências:** rate limit e tenant validation.
- **Impacto:** evita spam e cadastro em tenant indevido.
- **Ação técnica:** rate limit por IP/slug/email, validação Zod, sanitização, upload opcional controlado.
- **Risco:** fricção no cadastro.
- **Critério de aceite:** link inválido/tenant bloqueado retorna erro amigável; spam é bloqueado.

#### P1.6 CI mínimo bloqueante

- **Módulo:** Infra / Qualidade.
- **Arquivos afetados:** `.github/workflows/*`, `package.json`, scripts.
- **Dependências:** comandos existentes.
- **Impacto:** impede regressões.
- **Ação técnica:** rodar install, typecheck, lint, build, unit, API e2e crítico, migrations check, tenant isolation.
- **Risco:** pipeline inicial pode falhar por warnings/legado.
- **Critério de aceite:** PR não mergeia se P0/P1 falhar.

### P2 — Necessário Para Enterprise

#### P2.1 OTel e logs JSON

- **Módulo:** Observabilidade.
- **Arquivos afetados:** `packages/observability`, `apps/api/src/main.ts`, middleware/interceptors.
- **Dependências:** collector/backend observability.
- **Impacto:** diagnóstico production-grade.
- **Ação técnica:** instrumentar HTTP, DB, Redis, Stripe, queues; logs JSON com tenant/user/request/correlation.
- **Risco:** overhead e vazamento de PII em logs.
- **Critério de aceite:** traces correlacionam request -> DB -> queue/webhook.

#### P2.2 Admin RBAC UI completa

- **Módulo:** RBAC / Settings.
- **Arquivos afetados:** `apps/web/src/modules/settings/pages/Configuracoes.tsx`, hooks `useRoles.ts`, API `rbac-admin.controller.ts`.
- **Dependências:** RBAC ON e endpoints estáveis.
- **Impacto:** operação enterprise de permissões.
- **Ação técnica:** matriz role x permission, dependências/conflitos, diff antes de salvar, audit log.
- **Risco:** UI complexa gerar grants inválidos.
- **Critério de aceite:** alterar role persiste, audita e reflete em guard.

#### P2.3 Export assíncrono de relatórios

- **Módulo:** Reports.
- **Arquivos afetados:** `apps/api/src/modules/reports`, queues, `apps/web/src/modules/reports`.
- **Dependências:** storage e jobs.
- **Impacto:** escala para grandes datasets.
- **Ação técnica:** gerar export job, salvar arquivo no R2, notificar usuário.
- **Risco:** consumo alto de DB.
- **Critério de aceite:** export grande não trava request HTTP.

#### P2.4 Integrações padronizadas

- **Módulo:** Integrations.
- **Arquivos afetados:** `apps/api/src/modules/integrations/*`, `apps/web/src/shared/integrations/*`.
- **Dependências:** queue/retry/audit.
- **Impacto:** reduz manutenção e falhas silenciosas.
- **Ação técnica:** provider adapter interface, healthcheck, token store, webhook validation, retry/DLQ.
- **Risco:** refatoração ampla.
- **Critério de aceite:** cada provider tem status, logs, retry e desconexão.

#### P2.5 Antivírus/scan de assets

- **Módulo:** Storage / Assets.
- **Arquivos afetados:** `uploads`, `assets`, queue processors.
- **Dependências:** ferramenta de scan ou serviço externo.
- **Impacto:** segurança de arquivos.
- **Ação técnica:** status `pending_scan`, `clean`, `infected`; download bloqueado até clean.
- **Risco:** latência após upload.
- **Critério de aceite:** arquivo não escaneado não é disponibilizado para download.

### P3 — Melhorias Futuras

#### P3.1 Worker app separado

- **Módulo:** Infra / Queues.
- **Arquivos afetados:** criar `apps/worker`, mover bootstrap de processors.
- **Dependências:** queues estabilizadas.
- **Impacto:** escala independente.
- **Ação técnica:** extrair processors BullMQ para runtime separado.
- **Risco:** duplicação de providers Nest.
- **Critério de aceite:** API sobe sem processors; worker processa jobs isoladamente.

#### P3.2 Data warehouse/BI

- **Módulo:** Analytics / Reports.
- **Arquivos afetados:** novo pipeline infra/documentado.
- **Dependências:** eventos e audit consistentes.
- **Impacto:** relatórios cross-tenant sem sobrecarregar OLTP.
- **Ação técnica:** replicar eventos/dados anonimizados para warehouse.
- **Risco:** compliance LGPD.
- **Critério de aceite:** dashboards agregados sem PII.

#### P3.3 Fingerprint real de proteção de catálogo

- **Módulo:** Monitoring.
- **Arquivos afetados:** `monitoring`, storage, queues, integrações externas.
- **Dependências:** catálogo e assets robustos.
- **Impacto:** nova capacidade avançada.
- **Ação técnica:** engine especializado via provider; não hand-roll.
- **Risco:** custo e falso positivo.
- **Critério de aceite:** POC validada com métricas precision/recall.

## 3. Plano Por Fases

### Fase 1 — Hardening Crítico

- **Objetivo:** eliminar riscos que impedem qualquer produção.
- **Tarefas:** P0.1, P0.2, P0.5, checks de env/secrets, CI fail-fast.
- **Arquivos/módulos afetados:** env schema, auth-disabled, database module, RLS scripts, billing webhook tests.
- **Comandos de validação:** `corepack pnpm typecheck`, `corepack pnpm --filter @music-os-360/api test`, `corepack pnpm --filter @music-os-360/api verify:tenant-isolation`, `corepack pnpm --filter @music-os-360/api verify:critical-rls`.
- **Riscos:** ambientes dev quebram se flags forem endurecidas sem documentação.
- **Critério de conclusão:** produção não inicia com bypass; RLS e webhook críticos testados.

### Fase 2 — Integração Frontend/Backend

- **Objetivo:** remover mocks de fluxos críticos do admin.
- **Tarefas:** P0.3, P0.4, services admin React Query, audit admin.
- **Arquivos/módulos afetados:** `apps/web/src/modules/admin`, API admin/billing/tenants.
- **Comandos:** web/api typecheck, build, testes de service/controller.
- **Riscos:** breaking changes em formatos de mock.
- **Critério:** `/admin/clients` e `/admin/subscriptions` operam dados reais.

### Fase 3 — Multi-Tenancy E RBAC

- **Objetivo:** tornar tenant isolation e persisted RBAC fontes de verdade.
- **Tarefas:** P0.2, P0.6, P2.2.
- **Arquivos/módulos afetados:** guards, RBAC services, migrations, settings UI.
- **Comandos:** `verify:tenant-isolation`, `rbac:shadow:run`, `rbac:shadow:go-no-go`, API e2e RLS.
- **Riscos:** permissões incompletas podem bloquear usuários reais.
- **Critério:** RBAC ON em staging, sem regressão de rotas autorizadas.

### Fase 4 — Billing E Feature Gates

- **Objetivo:** fechar billing real de ponta a ponta.
- **Tarefas:** P1.1, P1.2, P1.3, admin billing real.
- **Arquivos/módulos afetados:** billing service/enforcement, queues, notifications, TenantContext.
- **Comandos:** billing specs, webhook e2e, build web/api.
- **Riscos:** divergência Stripe x banco em tenants legados.
- **Critério:** invoice failed -> grace -> read_only -> suspended; payment succeeded -> active.

### Fase 5 — Storage E Uploads

- **Objetivo:** tornar upload seguro, controlado e auditável.
- **Tarefas:** P1.4, P2.5.
- **Arquivos/módulos afetados:** uploads controller/dto, storage service, assets, plan limit.
- **Comandos:** `storage:e2e`, testes unitários uploads, smoke upload/download.
- **Riscos:** usuários bloqueados por allowlist restrita.
- **Critério:** presign recusa arquivo inválido e download respeita tenant/status.

### Fase 6 — Integrações Externas

- **Objetivo:** padronizar providers e reduzir falhas silenciosas.
- **Tarefas:** P2.4, healthchecks por integração, webhook validation.
- **Arquivos/módulos afetados:** `integrations`, shared integration contracts.
- **Comandos:** testes por provider, health integration, queue retries.
- **Riscos:** provider sem credenciais reais em staging.
- **Critério:** cada integração tem status, logs, retries e auditoria.

### Fase 7 — Testes E CI/CD

- **Objetivo:** pipeline bloqueante enterprise.
- **Tarefas:** P1.6, e2e críticos, release check.
- **Arquivos/módulos afetados:** `.github/workflows`, scripts, tests.
- **Comandos:** todos da seção 6.
- **Riscos:** dívida técnica gerar falhas iniciais.
- **Critério:** PR só mergeia com matriz crítica verde.

### Fase 8 — Observabilidade E Produção

- **Objetivo:** operar com diagnóstico, alertas e runbooks.
- **Tarefas:** P2.1, dashboards, alertas, SLO, Sentry.
- **Arquivos/módulos afetados:** observability package, main API/web, infra observability.
- **Comandos:** docker compose observability, health, metrics scrape.
- **Riscos:** logs com PII.
- **Critério:** incidente simulado visível em logs, metrics e alertas.

### Fase 9 — Homologação Final

- **Objetivo:** go/no-go production.
- **Tarefas:** smoke completo, backup/restore, rollback drill, security checklist.
- **Arquivos/módulos afetados:** infra, docs runbooks, envs.
- **Comandos:** release check, smoke, tenant isolation, billing, storage.
- **Riscos:** credenciais e DNS/CDN.
- **Critério:** checklist go/no-go aprovado sem P0/P1 aberto.

## 4. Sequência Exata De Execução

1. Congelar baseline: rodar typecheck/build/test atuais e registrar falhas.
2. Adicionar guard de ambiente para `AUTH_DISABLED`/`MOCK_MODE` em produção.
3. Configurar app DB role sem `BYPASSRLS` em staging.
4. Ativar/verificar `DATABASE_SESSION_CONTEXT_ENABLED` e `DATABASE_RLS_ENFORCEMENT`.
5. Rodar e corrigir `verify:critical-rls` e `verify:tenant-isolation`.
6. Completar testes de Stripe webhook e raw body.
7. Criar endpoints admin reais de tenants.
8. Migrar `/admin/clients` de mock para API real.
9. Criar endpoints admin reais de subscriptions/invoices/billing state.
10. Migrar `/admin/subscriptions` para API real.
11. Garantir audit log em cada ação super admin.
12. Rodar RBAC shadow harness e corrigir divergências.
13. Ativar `RBAC_PERSISTED_AUTHORITY=ON` em staging.
14. Implementar reconciliation job Stripe.
15. Implementar dunning emails com idempotência.
16. Persistir feature gates por plano e conectar TenantContext.
17. Aplicar quota e MIME policy em uploads.
18. Implementar auditoria de download e status de scan.
19. Padronizar provider adapter de integrações.
20. Adicionar testes E2E de jornadas críticas.
21. Criar workflow CI bloqueante.
22. Integrar Sentry/OTel/logs JSON.
23. Configurar dashboards e alertas.
24. Executar backup/restore drill.
25. Executar homologação staging com dados de teste.
26. Executar go/no-go final.
27. Deploy produção com rollback pronto.

## 5. Definition Of Done Por Módulo

### Auth

- **Status atual:** parcial.
- **Tarefas restantes:** bloquear bypass prod, MFA admin, sessão revogável, audit login/logout.
- **Testes obrigatórios:** login válido/inválido, token expirado, JWKS failure, auth disabled blocked in prod.
- **Aceite enterprise:** nenhuma rota protegida acessível sem JWT válido e tenant membership.

### Admin SaaS

- **Status atual:** parcial.
- **Tarefas restantes:** remover mocks críticos, endpoints reais, audit de ações, super admin guard rígido.
- **Testes:** clients/subscriptions/plans CRUD, audit, permission denial.
- **Aceite:** admin opera tenants reais e alterações persistem após refresh.

### Billing

- **Status atual:** parcial com núcleo real.
- **Tarefas:** reconciliation, dunning, feature gates, admin listagem real.
- **Testes:** invalid signature, duplicate webhook, failed/succeeded invoice, suspended/read_only.
- **Aceite:** estado Stripe determina acesso backend e frontend reflete.

### RBAC

- **Status atual:** parcial/shadow.
- **Tarefas:** RBAC ON, UI matriz, readiness CI.
- **Testes:** role hierarchy, permission grants, denial, audit decision.
- **Aceite:** permissões persistidas são fonte de verdade.

### Multi-tenancy

- **Status atual:** forte mas precisa hardening prod.
- **Tarefas:** app role NOBYPASSRLS, tenant context em jobs, tests contínuos.
- **Testes:** cross-tenant read/write blocked, report isolation, upload isolation.
- **Aceite:** nenhum dado tenant A acessível por tenant B.

### Artistas

- **Status atual:** encontrado/parcial.
- **Tarefas:** public registration anti-spam, upload público seguro, onboarding integrado.
- **Testes:** cadastro por slug, tenant bloqueado, lead/artista criado no tenant correto.
- **Aceite:** artista cadastra sem escolher workspace.

### Catálogo

- **Status atual:** encontrado.
- **Tarefas:** versionamento metadados, validações, import/export em lote.
- **Testes:** CRUD obras/fonogramas/shares, tenant isolation, registry prepare.
- **Aceite:** catálogo íntegro e auditável.

### Contratos

- **Status atual:** encontrado.
- **Tarefas:** lifecycle assinatura, anexos versionados, expiração automática.
- **Testes:** template -> contrato -> assinatura -> status.
- **Aceite:** contrato tem trilha jurídica e audit completa.

### CRM

- **Status atual:** encontrado/parcial.
- **Tarefas:** pipeline real, automações, SLA, integração leads/artistas.
- **Testes:** lead create/update/convert, pipeline stage, interactions.
- **Aceite:** lead convertido preserva histórico.

### Financeiro

- **Status atual:** encontrado.
- **Tarefas:** centros de custo, conciliação, permissões granulares.
- **Testes:** transaction/invoice/category rules, export, tenant isolation.
- **Aceite:** financeiro auditável e separado do billing SaaS.

### Marketing

- **Status atual:** encontrado.
- **Tarefas:** approval workflow, publish real, analytics por canal.
- **Testes:** project/campaign/task/asset lifecycle.
- **Aceite:** campanha tem plano, assets, aprovação e métricas.

### Storage

- **Status atual:** encontrado.
- **Tarefas:** quota, MIME/extension policy, scan, audit download.
- **Testes:** presign/confirm/download, invalid MIME, quota exceeded.
- **Aceite:** arquivo só baixa se pertence ao tenant e está aprovado.

### Relatórios

- **Status atual:** encontrado.
- **Tarefas:** export async, templates, masking PII.
- **Testes:** definitions, export, import validate/commit, permission denied.
- **Aceite:** relatório grande não bloqueia HTTP.

### Integrações

- **Status atual:** parcial.
- **Tarefas:** adapter padrão, health, token store, webhook validation, retry/DLQ.
- **Testes:** configure/status/disconnect/webhook por provider.
- **Aceite:** falha externa é observável e reprocessável.

### Observabilidade

- **Status atual:** parcial.
- **Tarefas:** OTel, logs JSON, dashboards, alertas.
- **Testes:** health, metrics scrape, simulated error, queue failure.
- **Aceite:** incidente rastreável por requestId/correlationId/tenantId.

## 6. Comandos De Validação

### Install

```bash
corepack enable
corepack pnpm install
```

### Typecheck

```bash
corepack pnpm typecheck
corepack pnpm --filter @music-os-360/api typecheck
corepack pnpm --filter @music-os-360/web typecheck
```

### Lint

```bash
corepack pnpm lint
corepack pnpm --filter @music-os-360/api lint
corepack pnpm --filter @music-os-360/web lint
```

### Build Web

```bash
corepack pnpm --filter @music-os-360/web build
```

### Build API

```bash
corepack pnpm --filter @music-os-360/api build
```

### Build Completo

```bash
corepack pnpm build
```

### Testes Unitários

```bash
corepack pnpm --filter @music-os-360/api test
corepack pnpm --filter @music-os-360/web test
```

### Testes Integração/E2E

```bash
corepack pnpm --filter @music-os-360/api test:e2e
```

### Migrations

```bash
corepack pnpm --filter @music-os-360/api db:check
corepack pnpm --filter @music-os-360/api db:migrate
```

### Smoke Test

```bash
corepack pnpm --filter @music-os-360/api smoke-test
```

### Tenant Isolation

```bash
corepack pnpm --filter @music-os-360/api verify:rls
corepack pnpm --filter @music-os-360/api verify:critical-rls
corepack pnpm --filter @music-os-360/api verify:tenant-isolation
```

### RBAC

```bash
corepack pnpm --filter @music-os-360/api rbac:shadow:run
corepack pnpm --filter @music-os-360/api rbac:shadow:go-no-go
corepack pnpm --filter @music-os-360/api rbac:readiness
```

### Billing Webhook

```bash
corepack pnpm --filter @music-os-360/api test -- billing.service.spec.ts billing-enforcement.guard.spec.ts
```

### Upload/Download

```bash
corepack pnpm --filter @music-os-360/api storage:e2e
```

### Reports

```bash
corepack pnpm --filter @music-os-360/api reports:smoke
```

### CI/CD

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm build
corepack pnpm --filter @music-os-360/api db:check
corepack pnpm --filter @music-os-360/api verify:tenant-isolation
corepack pnpm release:check
```

## 7. Plano De Produção

### Requisitos Para Staging

- Supabase project separado.
- Postgres staging com app role sem `BYPASSRLS`.
- Redis staging.
- R2 bucket staging.
- Stripe test mode com webhook real.
- Sentry/PostHog staging.
- Prometheus/Grafana staging.
- `AUTH_DISABLED=false`, `VITE_AUTH_DISABLED=false`, `MOCK_MODE=false`.
- `RBAC_PERSISTED_AUTHORITY=ON` após readiness.

### Requisitos Para Produção

- Domínio e CDN para web.
- API com TLS, CORS restrito e rate limit.
- Postgres com PITR e backups testados.
- Redis gerenciado.
- R2 bucket production com lifecycle.
- Stripe live mode.
- Secrets em secret manager.
- Sentry/PostHog production.
- Prometheus/Grafana/alertmanager ou stack equivalente.
- Runbooks de incidentes, rollback e restore.

### Variáveis De Ambiente Obrigatórias

- `NODE_ENV=production`
- `DATABASE_URL`
- `APP_DATABASE_URL`
- `DATABASE_SESSION_CONTEXT_ENABLED=true`
- `DATABASE_RLS_ENFORCEMENT=true`
- `REDIS_QUEUE_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`
- `ENCRYPTION_KEY`
- `ENCRYPTION_IV_SECRET`
- `CORS_ORIGINS`
- `APP_URL`
- `FRONTEND_URL`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_STARTER`
- `STRIPE_PRICE_PROFESSIONAL`
- `STRIPE_PRICE_ENTERPRISE`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY`
- `R2_SECRET_KEY`
- `R2_BUCKET_NAME`
- `R2_PUBLIC_URL`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `SENTRY_DSN`

### Secrets Obrigatórios

- Supabase service role key.
- Stripe secret key e webhook secret.
- R2 access/secret key.
- Encryption key.
- JWT/dev signing secrets conforme ambiente.
- OAuth client secrets dos providers habilitados.
- Resend API key.
- Sentry DSN.

### Backup

- Postgres PITR habilitado.
- Backup diário lógico para retenção separada.
- R2 lifecycle e versionamento quando aplicável.
- Export de configuração RBAC/billing/settings antes de releases críticas.

### Restore

- Restore staging mensal a partir de backup production anonimizado.
- Runbook: restaurar DB, validar migrations, rodar smoke, validar tenant isolation.
- Critério: RTO e RPO documentados e testados.

### Rollback

- Artefato web/API versionado.
- Migrations com rollback explícito quando possível.
- Feature flags para desativar feature nova sem rollback completo.
- Stripe webhooks idempotentes para suportar reprocessamento.

### Monitoramento

- Health API live/ready.
- Metrics Prometheus.
- Dashboards API, Postgres, Redis, RBAC, billing, queues.
- Sentry errors frontend/backend.
- Logs JSON centralizados.

### Alertas

- API 5xx acima do SLO.
- p95 latency acima de 500ms em CRUD crítico.
- Stripe webhook failures.
- Queue failed/DLQ > 0.
- DB connections altas.
- RLS/tenant isolation errors.
- Billing suspended spike.
- Storage upload failures.
- Auth failure spike.

### Go/No-Go Final

Go somente se:

- Nenhum P0 aberto.
- Nenhum P1 sem mitigação documentada.
- `typecheck`, `lint`, `test`, `build` passam.
- Migrations aplicadas em staging.
- Tenant isolation passa.
- Billing webhook passa.
- Upload/download passa.
- Backup/restore validado.
- Rollback testado.
- Observabilidade com alertas ativos.

## 8. Resultado Final Esperado

Ao final da execução, o MUSIC OS 360 deve estar assim:

- Autenticação real ativa, sem bypass em produção.
- Tenants isolados por guard, banco, RLS, storage, jobs e relatórios.
- RBAC persisted authority ON com matriz administrável e auditada.
- Admin SaaS operando tenants, subscriptions, plans, suporte, auditoria e settings com dados reais.
- Billing Stripe completo com checkout, portal, webhook assinado, idempotência, reconciliation, dunning, grace, read-only, suspensão e reativação automática.
- Feature gates e limites por plano persistidos e refletidos no frontend/backend.
- Upload R2 seguro com quota, MIME policy, auditoria e proteção contra arquivo não autorizado.
- Módulos core funcionando com CRUD real, audit, permissões e testes.
- Integrações externas com adapters, status, retries, DLQ, webhooks validados e observabilidade.
- CI/CD bloqueante com validações enterprise.
- Observabilidade operacional com logs, metrics, traces, dashboards, SLOs e alertas.
- Staging e produção com secrets, backup, restore, rollback e runbooks testados.

