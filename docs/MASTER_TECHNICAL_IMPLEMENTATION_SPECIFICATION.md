# MASTER TECHNICAL IMPLEMENTATION SPECIFICATION (MTIS) — MUSIC OS 360

Data: 2026-07-01  
Fontes oficiais:

- `docs/BLUEPRINT_ENTERPRISE.md`
- `docs/PLANO_MASTER_IMPLEMENTACAO_ENTERPRISE.md`
- `docs/MASTER_FUNCTIONAL_SPECIFICATION.md`

Este documento é a especificação técnica de implementação do MUSIC OS 360. Ele transforma o Blueprint Enterprise, o Plano Master e a MFS em contratos técnicos para frontend, backend, banco, eventos, filas, integrações, segurança, observabilidade, testes e CI/CD.

Legenda obrigatória:

- **Existente:** encontrado no projeto ou documentado como já presente.
- **Parcial:** existe base implementada, mas falta robustez, integração real ou fechamento enterprise.
- **Necessário:** obrigatório para produção enterprise.
- **Recomendado:** evolução técnica desejável, mas não bloqueante para MVP confiável quando explicitado.

Regra de engenharia: nenhuma funcionalidade é considerada concluída se não possuir contrato frontend, backend, banco, eventos quando aplicável, testes, auditoria, tenant isolation e validação de billing quando mutável.

## 1. Arquitetura Técnica

### 1.1 Frontend

- **Framework:** React + Vite + TypeScript.
- **UI:** Tailwind CSS, Radix UI e componentes compartilhados em `apps/web/src/shared/ui`.
- **Roteamento:** React Router, com rotas públicas, rotas autenticadas tenant-scoped e rotas super admin.
- **Estado global:** contexts para autenticação, tenant, billing e configurações globais; stores locais apenas para estado de tela.
- **Cache de servidor:** React Query deve ser a camada padrão para queries/mutations HTTP.
- **Formulários:** React Hook Form ou padrão existente do projeto; validação compartilhada com Zod sempre que houver DTO equivalente.
- **Validação:** frontend valida UX e reduz erro de usuário; backend continua sendo fonte de verdade.
- **Feature gates:** resolvidos a partir do contexto do tenant/plano; não devem ser hardcoded como fonte final.
- **Tenant context:** obtido no bootstrap autenticado e enviado em chamadas tenant-scoped via header ou client configurado.
- **Billing context:** expõe `active`, `trial`, `payment_grace`, `read_only`, `suspended`, `cancelled`; componentes mutáveis devem consultar esse contexto.
- **Permission wrappers:** componentes e botões mutáveis devem ser protegidos por wrapper de permissão e pelo estado financeiro.
- **Error boundaries:** cada área de módulo deve ter fallback local para falhas de carregamento sem derrubar o shell.
- **Loading/empty/error:** obrigatório em todas as páginas de dados.

Decisão: React Query deve ser usado para dados remotos porque separa cache, invalidação e mutation lifecycle de estado visual. Context deve carregar apenas dados transversais pequenos, como sessão, tenant, billing e permissões.

### 1.2 Backend

- **Framework:** NestJS + TypeScript.
- **Camadas:** controllers, DTOs, services, repositories/TypeORM, guards, interceptors, events, queues e integrations.
- **ORM/Banco:** TypeORM com PostgreSQL.
- **Auth:** JWT/Supabase Auth validado por guard.
- **Tenant:** `TenantGuard` e contexto de request para toda rota tenant-scoped.
- **RBAC:** `PermissionsGuard` e decorators de permissão/papel.
- **Billing enforcement:** guard global ou guard aplicado a rotas autenticadas tenant-scoped.
- **Audit:** interceptor/service append-only para mutações críticas.
- **Eventos:** event bus interno para domínio; payloads sempre carregam `tenantId`, `actorUserId`, `correlationId`.
- **Jobs/Filas:** BullMQ/Redis para processamento assíncrono, retries e DLQ.
- **Webhooks:** endpoints dedicados por provider, sempre com validação de assinatura quando provider suportar.
- **Rate limit:** obrigatório em auth, cadastro público, webhooks e endpoints sensíveis.

Decisão: regras de negócio ficam em services de domínio, não em controllers. Controllers só validam entrada, autorização declarativa e delegam execução.

### 1.3 Banco

- **Estratégia:** PostgreSQL relacional tenant-scoped com `tenant_id` nas entidades de domínio.
- **Multi-tenancy:** shared database, shared schema, isolamento por `tenant_id`, guards e RLS.
- **RLS:** necessário em produção para tabelas tenant-scoped críticas; app DB role deve ter `rolbypassrls=false`.
- **Índices:** todo FK, `tenant_id`, campos de busca frequente, status e timestamps de listagem devem ter índices apropriados.
- **Constraints:** uniques compostos por tenant quando aplicável; enums/check constraints para status financeiros e operacionais críticos.
- **Soft delete:** recomendado para dados de domínio e obrigatório para entidades com histórico/auditoria relevante.
- **Auditoria:** audit log append-only, com before/after para mutações críticas.
- **Migrations:** todo contrato público ou schema change exige migration versionada.

Decisão: RLS não substitui guards; ele é camada de defesa adicional. O backend continua validando membership, RBAC e billing antes de acessar dados.

## 2. Estrutura Final De Pastas

```text
apps/
  web/
    src/
      app/
        routes/
        providers/
        guards/
      modules/
        admin/
        artists/
        auth/
        billing/
        catalog/
        contracts/
        crm/
        finance/
        integrations/
        marketing/
        monitoring/
        registry/
        releases/
        reports/
        settings/
        storage/
        support/
      shared/
        components/
        hooks/
        lib/
        services/
        types/
        ui/
  api/
    src/
      core/
        auth/
        guards/
        interceptors/
        rbac/
        config/
      database/
        entities/
        migrations/
      modules/
        admin/
        artists/
        assets/
        auth/
        billing/
        catalog/
        contracts/
        crm/
        finance/
        integrations/
        marketing/
        monitoring/
        registry/
        releases/
        reports/
        storage/
        support/
      queues/
      observability/
      shared/
  worker/
    src/
      processors/
      schedulers/
      bootstrap.ts
packages/
  auth/
  billing/
  contracts/
  database/
  observability/
  storage/
  ui/
  validation/
infra/
  docker/
  terraform/
  monitoring/
docs/
```

Responsabilidades:

- `apps/web`: interface React, rotas, páginas, componentes, hooks, services HTTP e guards visuais.
- `apps/api`: API NestJS, regras de negócio, DTOs, guards, controllers, entities, migrations e integrações.
- `apps/worker`: recomendado para isolar processadores BullMQ de jobs pesados em runtime separado.
- `packages/auth`: contratos comuns de sessão, roles e claims quando extração for necessária.
- `packages/billing`: tipos compartilhados de planos, status e feature gates.
- `packages/contracts`: tipos API compartilhados e schemas Zod reutilizáveis.
- `packages/database`: entidades compartilhadas ou helpers de migrations quando monorepo amadurecer.
- `packages/observability`: logging, metrics, tracing, correlation helpers.
- `packages/storage`: contratos de assets, upload policies e storage keys.
- `packages/ui`: design system reutilizável se o projeto extrair componentes do web.
- `packages/validation`: schemas Zod comuns para DTOs e formulários.
- `infra`: infraestrutura, docker, deploy, monitoramento e IaC.
- `docs`: contratos arquiteturais, funcionais, técnicos e runbooks.

## 3. Mapeamento Técnico Por Módulo

### 3.1 Auth

- **Status:** parcial.
- **Responsabilidade:** autenticação, sessão, logout, reset, bootstrap de contexto e bloqueio de bypass em produção.
- **Dependências:** Supabase Auth, JWT, tenants, memberships, RBAC.
- **Entidades:** `users`, `organizations`, `org_members`, `tenants`, sessões externas Supabase.
- **DTOs:** `LoginDto` quando backend autenticar diretamente, `AuthContextDto`, `ResetPasswordDto`, `InviteUserDto`, `AcceptInviteDto`.
- **Controllers:** `AuthController`, `InvitesController`.
- **Services:** `AuthService`, `AuthContextService`, `InviteService`.
- **Repositories:** `UserRepository`, `OrgMemberRepository`, `TenantRepository`.
- **Events:** `user.invited`, `user.joined`, `tenant.created`, `auth.login_failed`.
- **Jobs:** envio de convite/reset quando assíncrono.
- **Queues:** `notifications`.
- **Integrações:** Supabase Auth.
- **Permissões:** login público; contexto exige membership ativo.
- **Feature gates:** sempre ativo.
- **Auditoria:** login/logout, convite, alteração de membership, tentativa inválida relevante.
- **Testes:** login, logout, token inválido, membership ausente, auth bypass bloqueado em produção.

### 3.2 Admin SaaS

- **Status:** parcial.
- **Responsabilidade:** operação global da plataforma por super admin.
- **Dependências:** tenants, billing, audit, support, observability.
- **Entidades:** `tenants`, `organizations`, `org_members`, `billing_subscriptions`, `tenant_billing_state`, `plans`, `audit_logs`.
- **DTOs:** `ListAdminTenantsDto`, `UpdateAdminTenantDto`, `AdminTenantActionDto`, `ListAdminSubscriptionsDto`, `UpdatePlanDto`.
- **Controllers:** `AdminTenantsController`, `AdminSubscriptionsController`, `AdminPlansController`, `AdminAuditController`.
- **Services:** `AdminTenantsService`, `AdminBillingService`, `AdminPlansService`, `AdminAuditService`.
- **Repositories:** tenant, plan, subscription, invoice e audit repositories.
- **Events:** `tenant.suspended`, `tenant.reactivated`, `billing.override_enabled`, `plan.updated`.
- **Jobs:** nenhum obrigatório; export admin pode ir para queue.
- **Queues:** `reports` para exports.
- **Integrações:** Stripe para links customer/invoice.
- **Permissões:** `super_admin`.
- **Feature gates:** interno.
- **Auditoria:** toda mutação super admin com before/after e motivo.
- **Testes:** acesso negado para não super admin, listagem real, editar tenant persiste, ações billing auditam.

### 3.3 Billing

- **Status:** parcial com núcleo real.
- **Responsabilidade:** assinatura, invoice, estado financeiro, enforcement, Stripe webhook, reconciliation e feature gates.
- **Dependências:** Stripe, tenants, plans, Redis, audit, notifications.
- **Entidades:** `plans`, `billing_subscriptions`, `tenant_billing_state`, `invoices`, `payment_events`, `billing_settings`.
- **DTOs:** `CreateCheckoutSessionDto`, `CreatePortalSessionDto`, `StripeWebhookDto`, `ApplyOverrideDto`, `ExtendGraceDto`, `ChangePlanDto`.
- **Controllers:** `BillingController`, `StripeWebhookController`, `AdminBillingController`.
- **Services:** `BillingService`, `BillingEnforcementService`, `StripeWebhookService`, `BillingReconciliationService`, `FeatureGateService`.
- **Repositories:** subscription, invoice, payment event, tenant billing state, plan repositories.
- **Events:** `stripe.webhook_processed`, `billing.grace_started`, `billing.read_only`, `tenant.suspended`, `tenant.reactivated`, `subscription.cancelled`.
- **Jobs:** reconciliation diário, dunning emails, billing state transition scheduler.
- **Queues:** `billing`, `notifications`.
- **Integrações:** Stripe SDK.
- **Permissões:** owner/admin/financial para tenant billing; super_admin para admin billing.
- **Feature gates:** todos os gates persistidos por plano.
- **Auditoria:** webhooks, invoice updates, overrides, suspensão, reativação, cancelamento.
- **Testes:** assinatura inválida, duplicado, invoice paid/failed, read_only bloqueia mutação, suspended bloqueia rota.

### 3.4 RBAC

- **Status:** parcial/shadow.
- **Responsabilidade:** autorização persistida por roles, permissions, hierarchy e grants.
- **Dependências:** users, org_members, tenants, audit.
- **Entidades:** `roles`, `permissions`, `role_permissions`, `user_roles`, `permission_decision_logs`.
- **DTOs:** `CreateRoleDto`, `UpdateRoleDto`, `AssignRoleDto`, `GrantPermissionDto`, `ListPermissionsDto`.
- **Controllers:** `RbacController`, `RbacAdminController`.
- **Services:** `RbacService`, `PermissionDecisionService`, `RoleService`.
- **Repositories:** roles, permissions, grants, decision logs.
- **Events:** `role.created`, `role.updated`, `permission.granted`, `permission.revoked`.
- **Jobs:** shadow comparison/readiness job recomendado.
- **Queues:** `rbac` recomendado.
- **Integrações:** nenhuma externa.
- **Permissões:** `role:*`, `permission:*`.
- **Feature gates:** settings/rbac.
- **Auditoria:** todas as alterações de roles e grants.
- **Testes:** role autorizada, role negada, tenant isolation de roles, readiness para `RBAC_PERSISTED_AUTHORITY=ON`.

### 3.5 Multi-Tenancy

- **Status:** forte, mas precisa hardening production-grade.
- **Responsabilidade:** isolamento por tenant em API, banco, storage, jobs, relatórios e logs.
- **Dependências:** Auth, RLS, RequestTenantContext, storage prefix.
- **Entidades:** `tenants`, `organizations`, `org_members`, `tenant_settings`.
- **DTOs:** `TenantContextDto`, `SwitchTenantDto`, `UpdateTenantSettingsDto`.
- **Controllers:** `TenantController`, `TenantSettingsController`.
- **Services:** `TenantService`, `TenantContextService`, `TenantIsolationVerifier`.
- **Repositories:** tenant e organization repositories.
- **Events:** `tenant.created`, `tenant.updated`, `tenant.context_resolved`.
- **Jobs:** tenant isolation verification em CI/staging.
- **Queues:** nenhuma obrigatória.
- **Integrações:** Postgres/Supabase/R2.
- **Permissões:** membership ativo e roles.
- **Feature gates:** sempre ativo.
- **Auditoria:** criação/alteração tenant, troca de contexto, falhas suspeitas.
- **Testes:** cross-tenant read/write, RLS, storage isolation, jobs tenant context.

### 3.6 Artistas

- **Status:** encontrado/parcial.
- **Responsabilidade:** CRUD, cadastro público, dados artísticos, redes, anexos e conversão de leads.
- **Dependências:** CRM, storage, catalog, contracts.
- **Entidades:** `artists`, `artist_profiles`, `artist_social_links`, `artist_files`, `leads`.
- **DTOs:** `CreateArtistDto`, `UpdateArtistDto`, `ListArtistsDto`, `PublicArtistRegistrationDto`.
- **Controllers:** `ArtistsController`, `PublicArtistRegistrationController`.
- **Services:** `ArtistsService`, `PublicRegistrationService`.
- **Repositories:** artists, leads, assets.
- **Events:** `artist.created`, `artist.updated`, `lead.converted`.
- **Jobs:** notificação de novo artista; processamento de upload público quando existir.
- **Queues:** `notifications`, `storage`.
- **Integrações:** Spotify/YouTube/SoundCloud quando habilitadas.
- **Permissões:** `artist:read/create/update/delete/export`.
- **Feature gates:** `moduleArtists`, limite `artists`.
- **Auditoria:** CRUD, cadastro público e conversão.
- **Testes:** CRUD, cadastro por slug, tenant bloqueado, billing read_only bloqueia criação.

### 3.7 Catálogo

- **Status:** encontrado.
- **Responsabilidade:** obras, fonogramas, titulares, shares, identificadores e metadados.
- **Dependências:** artists, registry, releases, storage.
- **Entidades:** `works`, `recordings`, `right_holders`, `catalog_shares`, `identifiers`, `catalog_metadata_versions`.
- **DTOs:** `CreateWorkDto`, `UpdateWorkDto`, `CreateRecordingDto`, `UpdateRecordingDto`, `CatalogSearchDto`.
- **Controllers:** `WorksController`, `RecordingsController`, `CatalogController`.
- **Services:** `WorksService`, `RecordingsService`, `CatalogValidationService`.
- **Repositories:** works, recordings, holders, shares.
- **Events:** `catalog.work.created`, `catalog.recording.created`, `catalog.metadata_changed`.
- **Jobs:** validação registry, export catalog.
- **Queues:** `registry`, `reports`.
- **Integrações:** ECAD/ABRAMUS/registry.
- **Permissões:** `catalog:*`.
- **Feature gates:** `moduleCatalog`.
- **Auditoria:** alteração de metadados, shares e identificadores.
- **Testes:** shares, identificadores únicos por tenant, exports, tenant isolation.

### 3.8 Contratos

- **Status:** encontrado.
- **Responsabilidade:** templates, contratos, signatários, anexos, assinatura e status jurídico.
- **Dependências:** artists, clients, storage, signature providers.
- **Entidades:** `contracts`, `contract_templates`, `contract_parties`, `contract_signers`, `contract_events`, `contract_files`.
- **DTOs:** `CreateContractDto`, `UpdateContractDto`, `SendContractForSignatureDto`, `ContractWebhookDto`.
- **Controllers:** `ContractsController`, `ContractTemplatesController`, `SignatureWebhookController`.
- **Services:** `ContractsService`, `ContractTemplatesService`, `SignatureProviderService`.
- **Repositories:** contracts, templates, signers.
- **Events:** `contract.created`, `contract.sent_for_signature`, `contract.signed`, `contract.expired`.
- **Jobs:** reminder de assinatura, expiração.
- **Queues:** `contracts`, `notifications`.
- **Integrações:** Autentique existente; DocuSign recomendado por env.
- **Permissões:** `contracts:*`.
- **Feature gates:** `moduleContracts`, limite de contratos.
- **Auditoria:** criação, envio, assinatura, cancelamento.
- **Testes:** lifecycle template -> contrato -> assinatura -> status, webhook inválido rejeitado.

### 3.9 CRM / Leads

- **Status:** encontrado/parcial.
- **Responsabilidade:** leads, contatos, empresas, pipeline, interações e conversão.
- **Dependências:** public registration, artists, notifications.
- **Entidades:** `leads`, `contacts`, `companies`, `pipeline_stages`, `interactions`, `lead_sources`.
- **DTOs:** `CreateLeadDto`, `UpdateLeadDto`, `MoveLeadStageDto`, `ConvertLeadDto`, `CreateInteractionDto`.
- **Controllers:** `LeadsController`, `CrmController`, `InteractionsController`.
- **Services:** `LeadsService`, `CrmPipelineService`, `LeadConversionService`.
- **Repositories:** leads, contacts, companies, interactions.
- **Events:** `lead.created`, `lead.updated`, `lead.stage_changed`, `lead.converted`.
- **Jobs:** follow-up reminders.
- **Queues:** `notifications`.
- **Integrações:** email/forms.
- **Permissões:** `lead:*`, `crm:*`.
- **Feature gates:** `moduleCrm`.
- **Auditoria:** stage changes, conversion, delete/archive.
- **Testes:** pipeline, conversion, spam public registration, tenant isolation.

### 3.10 Financeiro

- **Status:** encontrado.
- **Responsabilidade:** transações, invoices operacionais, categorias, regras, relatórios financeiros.
- **Dependências:** clients, contracts, reports.
- **Entidades:** `financial_transactions`, `financial_categories`, `financial_rules`, `operational_invoices`, `cost_centers`.
- **DTOs:** `CreateTransactionDto`, `UpdateTransactionDto`, `CreateOperationalInvoiceDto`, `CreateFinancialRuleDto`.
- **Controllers:** `FinanceController`, `TransactionsController`, `OperationalInvoicesController`.
- **Services:** `FinanceService`, `TransactionService`, `FinancialRulesService`.
- **Repositories:** transactions, invoices, categories, rules.
- **Events:** `transaction.created`, `transaction.paid`, `invoice.created`, `financial_rule.triggered`.
- **Jobs:** reminders de vencimento, export financeiro.
- **Queues:** `finance`, `reports`, `notifications`.
- **Integrações:** NFe/bancos recomendado.
- **Permissões:** `accounting:*`.
- **Feature gates:** `moduleAccounting`.
- **Auditoria:** todas as mutações financeiras.
- **Testes:** permissão financial, export, tenant isolation, read_only bloqueia mutação.

### 3.11 Marketing

- **Status:** encontrado.
- **Responsabilidade:** projetos, campanhas, briefings, tarefas, assets, aprovações e métricas.
- **Dependências:** storage, AI, integrations, releases.
- **Entidades:** `marketing_projects`, `campaigns`, `marketing_tasks`, `briefings`, `asset_links`, `approvals`.
- **DTOs:** `CreateMarketingProjectDto`, `UpdateCampaignDto`, `CreateMarketingTaskDto`, `ApproveAssetDto`.
- **Controllers:** `MarketingProjectsController`, `CampaignsController`, `MarketingTasksController`.
- **Services:** `MarketingService`, `CampaignService`, `MarketingApprovalService`.
- **Repositories:** projects, campaigns, tasks, approvals.
- **Events:** `marketing.project_created`, `campaign.started`, `marketing.task_completed`, `asset.approved`.
- **Jobs:** publish/sync externo, geração assistida por AI.
- **Queues:** `marketing`, `integrations`, `ai`.
- **Integrações:** Meta, TikTok, Google Ads.
- **Permissões:** `marketing:*`.
- **Feature gates:** `moduleMarketing`.
- **Auditoria:** campanha, aprovação, publicação.
- **Testes:** lifecycle campanha, approvals, falha provider, billing read_only.

### 3.12 Lançamentos

- **Status:** encontrado.
- **Responsabilidade:** releases, vínculos de obras/fonogramas, aprovação e distribuição.
- **Dependências:** catalog, artists, integrations.
- **Entidades:** `releases`, `release_tracks`, `release_assets`, `release_distribution_status`.
- **DTOs:** `CreateReleaseDto`, `UpdateReleaseDto`, `ApproveReleaseDto`, `DistributeReleaseDto`.
- **Controllers:** `ReleasesController`, `ReleaseDistributionController`.
- **Services:** `ReleasesService`, `ReleaseValidationService`, `DistributionService`.
- **Repositories:** releases, tracks, distribution status.
- **Events:** `release.created`, `release.approved`, `release.distributed`, `release.distribution_failed`.
- **Jobs:** distribuição, sync status.
- **Queues:** `releases`, `integrations`.
- **Integrações:** distribuidores externos quando habilitados.
- **Permissões:** `releases:*`.
- **Feature gates:** `moduleReleases`.
- **Auditoria:** status, aprovação, distribuição.
- **Testes:** metadata mínima, aprovação, tenant isolation.

### 3.13 Monitoramento

- **Status:** parcial.
- **Responsabilidade:** detecções, ECAD, divergências, takedowns e proteção de catálogo inicial.
- **Dependências:** catalog, reports, integrations.
- **Entidades:** `detections`, `ecad_reports`, `monitoring_rules`, `takedowns`, `catalog_protection_items`.
- **DTOs:** `CreateDetectionDto`, `UpdateMonitoringRuleDto`, `CreateTakedownDto`, `ListMonitoringDto`.
- **Controllers:** `MonitoringController`, `TakedownsController`, `EcadReportsController`.
- **Services:** `MonitoringService`, `TakedownService`, `EcadService`.
- **Repositories:** detections, reports, takedowns, rules.
- **Events:** `takedown.requested`, `monitoring.detection_found`.
- **Jobs:** sync externo, takedown follow-up.
- **Queues:** `monitoring`, `integrations`.
- **Integrações:** ECAD/ABRAMUS/ACRCloud futuro.
- **Permissões:** `monitoring:*`.
- **Feature gates:** `moduleMonitoring`.
- **Auditoria:** takedowns, imports, status.
- **Testes:** tabs existentes, proteção catálogo não simula IA real, export, tenant isolation.

### 3.14 Registry

- **Status:** encontrado.
- **Responsabilidade:** titulares, sociedades, identificadores, submissões e payloads.
- **Dependências:** catalog, integrations.
- **Entidades:** `registry_accounts`, `society_submissions`, `submission_payloads`, `right_holders`, `external_identifiers`.
- **DTOs:** `CreateRightHolderDto`, `PrepareSubmissionDto`, `SubmitToSocietyDto`, `UpdateSubmissionStatusDto`.
- **Controllers:** `RegistryController`, `SocietySubmissionsController`.
- **Services:** `RegistryService`, `SocietySubmissionService`, `RegistryPayloadService`.
- **Repositories:** accounts, submissions, payloads.
- **Events:** `society.submission_created`, `society.status_updated`.
- **Jobs:** provider submission, status polling.
- **Queues:** `registry`, `integrations`.
- **Integrações:** ABRAMUS/ECAD.
- **Permissões:** `registry:*`.
- **Feature gates:** `moduleRegistry`.
- **Auditoria:** payload, submissão e status.
- **Testes:** payload snapshot, rejeição provider, tenant isolation.

### 3.15 Storage / Assets

- **Status:** encontrado.
- **Responsabilidade:** presign, upload, confirm, download, versionamento, quota e auditoria.
- **Dependências:** R2/S3, billing limits, tenant context.
- **Entidades:** `assets`, `asset_versions`, `asset_links`, `upload_sessions`, `storage_usage`.
- **DTOs:** `PresignUploadDto`, `ConfirmUploadDto`, `CreateSignedDownloadDto`, `ListAssetsDto`.
- **Controllers:** `UploadsController`, `AssetsController`, `DownloadsController`.
- **Services:** `StorageService`, `AssetsService`, `UploadPolicyService`, `StorageQuotaService`.
- **Repositories:** assets, versions, upload sessions.
- **Events:** `asset.uploaded`, `asset.deleted`, `asset.downloaded`, `asset.linked_to_project`.
- **Jobs:** scan/antivirus recomendado, storage usage recalculation.
- **Queues:** `storage`.
- **Integrações:** Cloudflare R2/S3 compatible.
- **Permissões:** `storage:*`, `asset:*`.
- **Feature gates:** `storageGb`.
- **Auditoria:** presign, confirm, download, delete.
- **Testes:** MIME, size, quota, tenant prefix, read_only bloqueia upload.

### 3.16 AI / Skills

- **Status:** parcial.
- **Responsabilidade:** execução de skills IA com budget, logs, provider abstraction e validação de output.
- **Dependências:** providers AI, feature gates, usage logs.
- **Entidades:** `ai_skills`, `ai_runs`, `ai_usage_logs`, `ai_provider_configs`.
- **DTOs:** `RunSkillDto`, `SkillResultDto`, `ListAiUsageDto`.
- **Controllers:** `AiSkillsController`, `AiUsageController`.
- **Services:** `AiSkillService`, `AiProviderRouter`, `AiUsageService`.
- **Repositories:** runs, usage, skills.
- **Events:** `skill.started`, `skill.completed`, `skill.failed`.
- **Jobs:** skill assíncrona para outputs longos.
- **Queues:** `ai`.
- **Integrações:** OpenAI, Anthropic, Gemini.
- **Permissões:** `ai:*` e permissão do módulo origem.
- **Feature gates:** `aiFeatures`, budget por plano.
- **Auditoria:** prompt metadata, provider, custo, usuário, tenant.
- **Testes:** provider failure, budget exceeded, permission denied, output validation.

### 3.17 Suporte

- **Status:** encontrado/parcial.
- **Responsabilidade:** tickets, base de conhecimento e solicitações de suporte.
- **Dependências:** users, notifications, admin.
- **Entidades:** `support_tickets`, `ticket_messages`, `knowledge_articles`, `support_categories`.
- **DTOs:** `CreateTicketDto`, `UpdateTicketDto`, `ReplyTicketDto`, `CreateKnowledgeArticleDto`.
- **Controllers:** `SupportController`, `KnowledgeBaseController`.
- **Services:** `SupportService`, `KnowledgeBaseService`.
- **Repositories:** tickets, messages, articles.
- **Events:** `support.ticket.created`, `support.ticket.updated`, `ticket.resolved`.
- **Jobs:** SLA reminders.
- **Queues:** `support`, `notifications`.
- **Integrações:** email.
- **Permissões:** `support:*`.
- **Feature gates:** `support`.
- **Auditoria:** ticket update, article update.
- **Testes:** ticket acessível com tenant suspenso, SLA, permission denial.

### 3.18 RH

- **Status:** encontrado.
- **Responsabilidade:** funcionários, folha, afastamentos e aprovações.
- **Dependências:** tenant, finance, audit.
- **Entidades:** `employees`, `payrolls`, `leave_requests`, `employee_documents`.
- **DTOs:** `CreateEmployeeDto`, `UpdateEmployeeDto`, `CreatePayrollDto`, `ApproveLeaveRequestDto`.
- **Controllers:** `EmployeesController`, `PayrollController`, `LeaveRequestsController`.
- **Services:** `EmployeesService`, `PayrollService`, `LeaveRequestService`.
- **Repositories:** employees, payrolls, leave requests.
- **Events:** `employee.created`, `leave.approved`, `leave.rejected`.
- **Jobs:** payroll reminders.
- **Queues:** `notifications`.
- **Integrações:** folha/contabilidade futura.
- **Permissões:** `rh:*`.
- **Feature gates:** `moduleRh`.
- **Auditoria:** dados sensíveis de RH.
- **Testes:** permissões granulares, PII masking, tenant isolation.

### 3.19 Audiovisual

- **Status:** encontrado.
- **Responsabilidade:** projetos audiovisuais, briefings, shots, produção, assets e aprovações.
- **Dependências:** storage, users, marketing.
- **Entidades:** `audiovisual_projects`, `shots`, `production_days`, `crew_members`, `deliverables`, `approvals`.
- **DTOs:** `CreateAudiovisualProjectDto`, `UpdateShotDto`, `CreateProductionDayDto`, `ApproveDeliverableDto`.
- **Controllers:** `AudiovisualProjectsController`, `ShotsController`, `DeliverablesController`.
- **Services:** `AudiovisualService`, `ProductionService`, `DeliverableApprovalService`.
- **Repositories:** projects, shots, deliverables.
- **Events:** `audiovisual.project_created`, `deliverable.approved`.
- **Jobs:** reminders de produção.
- **Queues:** `notifications`.
- **Integrações:** storage.
- **Permissões:** `audiovisual:*`.
- **Feature gates:** `moduleAudiovisual`.
- **Auditoria:** projeto, aprovação, assets.
- **Testes:** lifecycle produção, approvals, tenant isolation.

### 3.20 Relatórios

- **Status:** encontrado.
- **Responsabilidade:** definitions, export, import validate/commit, async exports e auditoria.
- **Dependências:** DB, RBAC, storage.
- **Entidades:** `report_definitions`, `report_exports`, `report_imports`, `report_jobs`.
- **DTOs:** `ListReportsDto`, `ExportReportDto`, `ValidateImportDto`, `CommitImportDto`.
- **Controllers:** `ReportsController`, `ImportsController`, `ExportsController`.
- **Services:** `ReportsService`, `ReportExportService`, `ReportImportService`.
- **Repositories:** definitions, exports, imports.
- **Events:** `report.export_requested`, `report.export_ready`, `report.import_committed`.
- **Jobs:** export grande, import commit.
- **Queues:** `reports`.
- **Integrações:** storage para arquivos exportados.
- **Permissões:** `reports:*` + permissão do recurso.
- **Feature gates:** `reports`.
- **Auditoria:** export/import e filtros sensíveis.
- **Testes:** permission export, PII masking, async job, tenant isolation.

### 3.21 Observabilidade

- **Status:** parcial.
- **Responsabilidade:** logs, metrics, traces, health, alertas e SLO.
- **Dependências:** API, web, queues, infra.
- **Entidades:** não persistir observabilidade principal no banco operacional, exceto logs/audit quando domínio exigir.
- **DTOs:** `HealthResponseDto`, `MetricsResponse`.
- **Controllers:** `HealthController`, `MetricsController`.
- **Services:** `HealthService`, `MetricsService`, `LoggingService`.
- **Repositories:** não aplicável.
- **Events:** operational alerts.
- **Jobs:** synthetic checks recomendados.
- **Queues:** observability interno recomendado.
- **Integrações:** Sentry, Prometheus, Grafana, OpenTelemetry.
- **Permissões:** system/observability read.
- **Feature gates:** interno.
- **Auditoria:** acesso administrativo a painéis sensíveis.
- **Testes:** health, metrics scrape, simulated error, queue failure.

## 4. Frontend

### 4.1 Contratos Globais

- Rotas públicas: `/auth`, `/cadastro/:orgSlug`, reset/signup quando habilitados.
- Rotas autenticadas: módulos tenant-scoped sob app shell.
- Rotas super admin: `/admin/*` com `SuperAdminGuard`.
- Layouts: `AuthLayout`, `AppLayout`, `AdminLayout`, `PublicRegistrationLayout`.
- Contexts obrigatórios: `AuthContext`, `TenantContext`, `BillingContext`, `PermissionContext`.
- Guards visuais: `RequireAuth`, `RequireTenant`, `RequirePermission`, `RequireFeature`, `RequireBillingWritable`, `RequireSuperAdmin`.
- Services HTTP: axios/fetch client com token, tenant header, correlation id e tratamento 401/403/402/423.
- Error states: `Unauthorized`, `Forbidden`, `FeatureBlocked`, `ReadOnlyBlocked`, `TenantSuspended`.

### 4.2 Frontend Por Módulo

| Módulo | Rotas | Pages | Components/Modals | Hooks/Queries | Guards |
|---|---|---|---|---|---|
| Auth | `/auth`, reset/signup | AuthPage | LoginForm, PasswordToggle, AuthHero | `useAuth`, `useSession` | public/auth redirect |
| Admin SaaS | `/admin/*` | Dashboard, Clients, Plans, Subscriptions, Audit, Support | TenantModal, PlanModal, BillingActionModal | `useAdminTenants`, `useAdminBilling` | `RequireSuperAdmin` |
| Billing | `/configuracoes/billing`, `/billing/blocked` | BillingSettings, BillingBlocked | InvoiceTable, BillingBanner, PortalButton | `useBillingState`, `useInvoices` | `RequireBillingAccess` |
| RBAC | `/configuracoes` tabs | RolesSettings | RoleMatrix, PermissionToggle | `useRoles`, `usePermissions` | `RequirePermission(role:update)` |
| Artistas | `/artists` | ArtistsPage, ArtistDetail | ArtistForm, ArtistTable | `useArtists` | feature + permission + billing |
| Catálogo | `/catalog` | CatalogPage, WorkDetail | WorkForm, RecordingForm | `useWorks`, `useRecordings` | feature + permission |
| Contratos | `/contracts` | ContractsPage | ContractForm, TemplateModal | `useContracts` | feature + permission |
| CRM | `/crm`, `/leads` | LeadsPage, PipelinePage | LeadForm, StageBoard | `useLeads` | feature + permission |
| Financeiro | `/finance` | FinancePage | TransactionForm, InvoiceTable | `useTransactions` | feature + financial permission |
| Marketing | `/marketing` | MarketingPage | CampaignForm, ApprovalModal | `useCampaigns` | feature + permission |
| Lançamentos | `/releases` | ReleasesPage | ReleaseForm, TrackLinker | `useReleases` | feature + permission |
| Monitoramento | `/monitoring` | Monitoramento, Takedowns | MonitoringTabs, TakedownForm | `useDeteccoes`, `useTakedowns` | feature + permission |
| Registry | `/registry` | RegistryPage | SubmissionForm | `useRegistry` | feature + permission |
| Storage | `/assets` | AssetsPage | UploadModal, AssetPreview | `useAssets`, `useUpload` | feature + quota + permission |
| AI | embedded | SkillRunner | SkillModal, OutputPanel | `useSkillRun` | feature + budget |
| Suporte | `/support` | SupportPage, KnowledgeBase | TicketForm, ArticleEditor | `useTickets` | support access |
| RH | `/rh` | EmployeesPage, PayrollPage | EmployeeForm | `useEmployees` | feature + permission |
| Audiovisual | `/audiovisual` | AudiovisualPage | ProjectForm, ShotList | `useAudiovisual` | feature + permission |
| Relatórios | `/reports` | ReportsPage | ExportModal, ImportModal | `useReports` | reports permission |
| Observabilidade | `/admin/health` | AdminHealth | MetricsCards | `useHealth` | super_admin |

### 4.3 Frontend Query/Mutation Rules

- Toda listagem usa query key com `tenantId` quando tenant-scoped.
- Toda mutation invalida query do recurso e audit/activity quando exposto.
- Mutations devem tratar `TENANT_READ_ONLY`, `TENANT_SUSPENDED`, `FEATURE_BLOCKED`, `PERMISSION_DENIED`.
- Forms nunca enviam `tenantId` escolhido pelo usuário em fluxos públicos; tenant vem do contexto ou slug validado.
- Botões mutáveis devem usar disabled visual quando sem permissão, feature ou billing writable.

## 5. Backend

### 5.1 Endpoints Por Módulo

#### Auth

- `GET /auth/context`
- `POST /auth/logout`
- `POST /auth/invites`
- `POST /auth/invites/:token/accept`
- `POST /auth/reset-password`

DTOs: `AuthContextResponseDto`, `InviteUserDto`, `AcceptInviteDto`, `ResetPasswordDto`.

Policies: JWT obrigatório exceto reset/accept quando público; membership ativo para context tenant.

#### Admin SaaS

- `GET /admin/tenants`
- `GET /admin/tenants/:tenantId`
- `PATCH /admin/tenants/:tenantId`
- `POST /admin/tenants/:tenantId/suspend`
- `POST /admin/tenants/:tenantId/reactivate`
- `GET /admin/plans`
- `POST /admin/plans`
- `PATCH /admin/plans/:id`
- `GET /admin/audit`

Policies: super_admin only; audit obrigatório em mutações.

#### Billing

- `POST /billing/checkout`
- `POST /billing/portal`
- `GET /billing/state`
- `GET /billing/invoices`
- `POST /billing/webhooks/stripe`
- `GET /billing/admin/subscriptions`
- `GET /billing/admin/invoices`
- `POST /billing/admin/tenants/:tenantId/suspend`
- `POST /billing/admin/tenants/:tenantId/reactivate`
- `POST /billing/admin/tenants/:tenantId/read-only`
- `POST /billing/admin/tenants/:tenantId/override`
- `DELETE /billing/admin/tenants/:tenantId/override`
- `POST /billing/admin/tenants/:tenantId/extend-grace`

Policies: tenant owner/admin/financial para tenant endpoints; super_admin para admin endpoints; webhook valida assinatura Stripe.

#### RBAC

- `GET /rbac/roles`
- `POST /rbac/roles`
- `PATCH /rbac/roles/:id`
- `DELETE /rbac/roles/:id`
- `GET /rbac/permissions`
- `POST /rbac/roles/:id/permissions`
- `DELETE /rbac/roles/:id/permissions/:permissionId`
- `POST /rbac/users/:userId/roles`

Policies: owner/admin com `role:update`; super_admin para sistema.

#### Artistas

- `GET /artists`
- `POST /artists`
- `GET /artists/:id`
- `PATCH /artists/:id`
- `DELETE /artists/:id`
- `POST /public/artist-registration`
- `GET /public/workspaces/:slug`

Policies: permission `artist:*`; public registration com rate limit e slug validation.

#### Catálogo

- `GET /catalog/works`
- `POST /catalog/works`
- `GET /catalog/works/:id`
- `PATCH /catalog/works/:id`
- `DELETE /catalog/works/:id`
- `GET /catalog/recordings`
- `POST /catalog/recordings`
- `PATCH /catalog/recordings/:id`

Policies: `catalog:*`; shares/identifiers validation.

#### Contratos

- `GET /contracts`
- `POST /contracts`
- `GET /contracts/:id`
- `PATCH /contracts/:id`
- `DELETE /contracts/:id`
- `POST /contracts/:id/send-signature`
- `POST /contracts/webhooks/:provider`
- `GET /contract-templates`
- `POST /contract-templates`

Policies: `contracts:*`; webhook provider signature.

#### CRM / Leads

- `GET /leads`
- `POST /leads`
- `PATCH /leads/:id`
- `POST /leads/:id/move-stage`
- `POST /leads/:id/convert`
- `GET /crm/interactions`
- `POST /crm/interactions`

Policies: `lead:*`, `crm:*`.

#### Financeiro

- `GET /finance/transactions`
- `POST /finance/transactions`
- `PATCH /finance/transactions/:id`
- `DELETE /finance/transactions/:id`
- `GET /finance/invoices`
- `POST /finance/invoices`
- `GET /finance/categories`
- `POST /finance/rules`

Policies: `accounting:*`, role financial for sensitive actions.

#### Marketing

- `GET /marketing/projects`
- `POST /marketing/projects`
- `PATCH /marketing/projects/:id`
- `GET /marketing/campaigns`
- `POST /marketing/campaigns`
- `POST /marketing/assets/:assetId/approve`
- `POST /marketing/campaigns/:id/publish`

Policies: `marketing:*`.

#### Lançamentos

- `GET /releases`
- `POST /releases`
- `GET /releases/:id`
- `PATCH /releases/:id`
- `POST /releases/:id/approve`
- `POST /releases/:id/distribute`

Policies: `releases:*`.

#### Monitoramento

- `GET /monitoring/detections`
- `GET /monitoring/ecad`
- `GET /monitoring/divergences`
- `GET /monitoring/catalog-protection`
- `GET /takedowns`
- `POST /takedowns`
- `PATCH /takedowns/:id`

Policies: `monitoring:*`.

#### Registry

- `GET /registry/right-holders`
- `POST /registry/right-holders`
- `GET /registry/submissions`
- `POST /registry/submissions/prepare`
- `POST /registry/submissions/:id/submit`

Policies: `registry:*`.

#### Storage / Assets

- `POST /uploads/presign`
- `POST /uploads/confirm`
- `GET /assets`
- `GET /assets/:id`
- `PATCH /assets/:id`
- `DELETE /assets/:id`
- `POST /assets/:id/download-url`

Policies: `storage:*`; read_only blocks presign/confirm/delete.

#### AI / Skills

- `GET /ai/skills`
- `POST /ai/skills/:skillId/run`
- `GET /ai/runs/:id`
- `GET /ai/usage`

Policies: `ai:*`, feature `aiFeatures`, budget limit.

#### Suporte

- `GET /support/tickets`
- `POST /support/tickets`
- `GET /support/tickets/:id`
- `POST /support/tickets/:id/replies`
- `PATCH /support/tickets/:id`
- `GET /support/knowledge`
- `POST /support/knowledge`

Policies: support accessible when tenant suspended for billing/support routes.

#### RH

- `GET /rh/employees`
- `POST /rh/employees`
- `PATCH /rh/employees/:id`
- `GET /rh/payrolls`
- `POST /rh/payrolls`
- `POST /rh/leave-requests/:id/approve`

Policies: `rh:*`.

#### Audiovisual

- `GET /audiovisual/projects`
- `POST /audiovisual/projects`
- `PATCH /audiovisual/projects/:id`
- `GET /audiovisual/shots`
- `POST /audiovisual/shots`
- `POST /audiovisual/deliverables/:id/approve`

Policies: `audiovisual:*`.

#### Relatórios

- `GET /reports/definitions`
- `POST /reports/export`
- `POST /reports/import/validate`
- `POST /reports/import/commit`
- `GET /reports/jobs/:id`

Policies: `reports:*` plus resource permission.

#### Observabilidade

- `GET /health/live`
- `GET /health/ready`
- `GET /metrics`
- `GET /admin/health`

Policies: public for live/ready when safe; metrics restricted by environment/network/token; admin health super_admin.

## 6. Banco De Dados

### 6.1 Regras Globais De Entidade

Campos padrão para entidades tenant-scoped:

```text
id uuid primary key
tenant_id uuid not null references tenants(id)
created_at timestamptz not null
updated_at timestamptz not null
deleted_at timestamptz null
created_by uuid null
updated_by uuid null
```

Regras:

- `tenant_id` obrigatório em domínios operacionais.
- Índice composto `(tenant_id, created_at)` para listas.
- Índice composto `(tenant_id, status)` quando houver status.
- Unique de negócio deve ser composto por tenant quando dado for tenant-scoped.
- RLS: policy por `tenant_id = current_setting('app.tenant_id')::uuid`.
- Soft delete: `deleted_at` com filtros padrão no repository.

### 6.2 Entidades Centrais

| Entidade | Campos principais | Constraints/Índices | RLS | Soft delete | Auditoria |
|---|---|---|---|---|---|
| tenants | id, name, slug, status, is_active, allow_public_registration | unique slug, index status | sistema/admin | sim | sim |
| organizations | id, tenant_id, name, slug | unique tenant slug | sim | sim | sim |
| org_members | tenant_id, user_id, role, status | unique tenant/user | sim | sim | sim |
| users | id, email, name, status | unique email | depende | sim | sim |
| roles | tenant_id, name, scope | unique tenant/name | sim | sim | sim |
| permissions | key, module, action | unique key | sistema | não | sim |
| role_permissions | role_id, permission_id | unique role/permission | via role | não | sim |
| audit_logs | tenant_id, user_id, action, entity, before, after | index tenant/action/date | sim/admin | não | append-only |

### 6.3 Billing

| Entidade | Campos | Constraints/Índices | Relações |
|---|---|---|---|
| plans | tier, name, prices, limits, features, stripe_product_id, stripe_price_ids | unique tier | subscriptions |
| billing_subscriptions | tenant_id, stripe_customer_id, stripe_subscription_id, status, periods, grace_until, suspended_at | unique stripe_subscription_id, index tenant/status | tenants |
| tenant_billing_state | tenant_id, status, last_payment_at, next_payment_at, grace_until, manual_override | unique tenant_id, check status | tenants |
| invoices | tenant_id, stripe_invoice_id, amount_due, amount_paid, status, due_date, url | unique stripe_invoice_id | tenants |
| payment_events | stripe_event_id, tenant_id, event_type, payload, processed_at | unique stripe_event_id | tenants |
| billing_settings | grace_period_days, read_only_after_days, suspend_after_days, retry config | singleton or tenant/system scope | billing service |

RLS: tenant rows visíveis ao tenant; super_admin por rota/admin role.  
Auditoria: toda alteração de status financeiro.

### 6.4 Domínios Operacionais

| Domínio | Entidades mínimas | Relacionamentos | Índices críticos |
|---|---|---|---|
| Artistas | artists, artist_profiles, artist_social_links | artist -> tenant, leads | tenant/status, tenant/name |
| Catálogo | works, recordings, catalog_shares, identifiers | work/recording -> artists/right holders | tenant/title, tenant/identifier |
| Contratos | contracts, templates, parties, signers | contract -> artist/client/files | tenant/status, tenant/expires_at |
| CRM | leads, contacts, companies, interactions | lead -> artist conversion | tenant/stage, tenant/source |
| Financeiro | transactions, operational_invoices, categories, rules | transaction -> category/client | tenant/date, tenant/status |
| Marketing | projects, campaigns, tasks, approvals | project -> assets/users | tenant/status, tenant/date |
| Releases | releases, release_tracks, distribution_status | release -> recordings/assets | tenant/status |
| Monitoring | detections, ecad_reports, takedowns | detection -> catalog | tenant/risk, tenant/status |
| Registry | right_holders, submissions, payloads | submission -> catalog/provider | tenant/status |
| Storage | assets, asset_versions, upload_sessions | asset -> linked entity | tenant/key, tenant/status |
| Support | tickets, messages, knowledge_articles | ticket -> user/tenant | tenant/status |
| RH | employees, payrolls, leave_requests | employee -> tenant | tenant/status |
| Audiovisual | projects, shots, deliverables | project -> assets/tasks | tenant/status |
| Reports | definitions, exports, imports | report -> user/tenant | tenant/status |

## 7. Contratos API

### 7.1 Padrão De Request

- Autenticado: `Authorization: Bearer <jwt>`.
- Tenant-scoped: `X-Tenant-ID: <uuid>` ou tenant resolvido de contexto validado.
- Correlation: `X-Correlation-ID` opcional; API gera quando ausente.
- Content type: JSON, exceto upload direto para R2.

### 7.2 Padrão De Response

Listagem:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 0
  }
}
```

Objeto:

```json
{
  "data": {
    "id": "uuid"
  }
}
```

Erro:

```json
{
  "error": "PERMISSION_DENIED",
  "message": "User does not have permission to perform this action",
  "correlationId": "..."
}
```

### 7.3 Status Codes

- `200`: leitura/ação concluída.
- `201`: recurso criado.
- `202`: job aceito.
- `204`: exclusão/ação sem corpo.
- `400`: validação.
- `401`: não autenticado.
- `403`: sem permissão.
- `404`: recurso não encontrado ou não visível ao tenant.
- `409`: conflito/unique/idempotência.
- `422`: regra de negócio.
- `423`: tenant suspenso ou recurso bloqueado.
- `429`: rate limit.
- `500`: erro interno.

### 7.4 Erros Obrigatórios

- `TENANT_READ_ONLY`
- `TENANT_SUSPENDED`
- `FEATURE_BLOCKED`
- `PLAN_LIMIT_EXCEEDED`
- `PERMISSION_DENIED`
- `TENANT_NOT_FOUND`
- `PUBLIC_REGISTRATION_DISABLED`
- `INVALID_WEBHOOK_SIGNATURE`
- `DUPLICATE_WEBHOOK_EVENT`
- `UPLOAD_POLICY_VIOLATION`
- `QUOTA_EXCEEDED`

### 7.5 Contrato Por Endpoint

Para todo endpoint listado na seção 5:

- Request DTO deve existir.
- Response DTO deve existir para contratos públicos/externos.
- Permissão declarada no controller.
- Feature gate declarado quando módulo não for core.
- Billing guard aplicado a mutações tenant-scoped.
- Audit decorator/interceptor aplicado em mutações críticas.
- Teste de autorização e validação obrigatório.

## 8. Eventos E Domínio

| Evento | Trigger | Payload mínimo | Consumidores | Efeitos |
|---|---|---|---|---|
| user.invited | convite criado | tenantId, userId/email, invitedBy | notifications, audit | email convite |
| tenant.created | onboarding/admin | tenantId, ownerId | audit, billing setup | provisionamento |
| tenant.suspended | billing/admin | tenantId, reason, actor | notifications, audit | bloqueio |
| tenant.reactivated | pagamento/admin | tenantId, reason | notifications, audit | desbloqueio |
| billing.grace_started | invoice failed | tenantId, invoiceId, graceUntil | notifications | banner/email |
| billing.read_only | grace expired | tenantId | notifications, guards | bloqueio mutações |
| stripe.webhook_processed | webhook válido | tenantId, eventId, type | audit, metrics | idempotência |
| artist.created | create artist | tenantId, artistId, actor | notifications, audit | activity |
| lead.created | public/manual | tenantId, leadId, source | notifications, CRM | follow-up |
| lead.converted | conversion | tenantId, leadId, artistId | artists, audit | vínculo |
| catalog.work.created | create work | tenantId, workId | registry/audit | validação |
| contract.signed | provider webhook | tenantId, contractId | notifications, finance | status |
| asset.uploaded | upload confirmed | tenantId, assetId, key | scan, notifications | asset ready |
| report.export_requested | export | tenantId, reportId, userId | reports queue | job |
| report.export_ready | job done | tenantId, exportId, url | notifications | download |
| support.ticket.created | ticket | tenantId, ticketId | support queue | SLA |

Regras:

- Payload nunca deve depender de dados sensíveis completos; usar ids e snapshot mínimo.
- Eventos assíncronos devem ser idempotentes por `eventId`.
- Consumidores devem restaurar tenant context antes de acessar banco.

## 9. Filas E Jobs

| Queue | Job | Trigger | Retry | DLQ | Timeout | Observabilidade |
|---|---|---|---|---|---|---|
| billing | reconcileStripeTenant | cron diário/admin | exponential 5 | sim | 120s | count success/fail |
| billing | advanceBillingState | cron horário | exponential 3 | sim | 60s | state transitions |
| notifications | sendEmail | domain event | exponential 5 | sim | 30s | provider latency |
| storage | scanAsset | asset.uploaded | exponential 3 | sim | 300s | clean/infected |
| reports | exportReport | request export | exponential 2 | sim | 600s | file size/duration |
| reports | importCommit | import commit | exponential 2 | sim | 600s | rows processed |
| integrations | providerSync | user/cron | exponential 5 | sim | 300s | provider errors |
| contracts | signatureReminder | cron | fixed 3 | sim | 60s | reminders |
| marketing | publishCampaign | user/schedule | exponential 3 | sim | 180s | provider status |
| monitoring | syncDetections | cron/provider | exponential 5 | sim | 600s | detection count |
| rbac | shadowReadiness | CI/cron | no retry | no | 120s | divergence count |

Regras:

- Todo job carrega `tenantId`, `actorUserId` quando aplicável, `correlationId` e `idempotencyKey`.
- DLQ deve permitir reprocessamento manual por super_admin técnico.
- Falhas permanentes geram audit/evento operacional.

## 10. Storage

### 10.1 Buckets

- `music-os-assets-{env}`: assets operacionais.
- `music-os-public-registration-{env}`: uploads públicos temporários, se separado.
- `music-os-reports-{env}`: exports assíncronos.
- `music-os-contracts-{env}`: contratos e PDFs, se política exigir separação.

### 10.2 Prefixos

```text
env/{tenantId}/assets/{entityType}/{entityId}/{assetId}/{version}/{filename}
env/{tenantId}/reports/{reportId}/{exportId}.{ext}
env/{tenantId}/contracts/{contractId}/{fileId}.pdf
env/public-registration/{workspaceSlug}/{submissionId}/{fileId}
```

### 10.3 Regras Técnicas

- Upload usa presigned URL com expiração curta.
- Download usa signed URL com expiração curta.
- Tenant nunca informa prefixo final; backend gera.
- MIME, extensão, tamanho e quota são validados antes do presign.
- `read_only` bloqueia upload, delete, confirm, import e export mutável.
- Objeto só vira disponível após confirm e, quando implementado, scan `clean`.
- Delete físico segue retenção; metadata usa soft delete.
- Auditoria registra presign, confirm, download e delete.

## 11. Integrações

### 11.1 Adapter Pattern

Cada provider deve implementar:

```text
ProviderAdapter
  getProviderKey()
  validateConfig()
  connect()
  refreshToken()
  disconnect()
  healthcheck()
  handleWebhook()
  executeAction()
```

### 11.2 Providers

| Provider | Adapter | OAuth/Token | Webhook | Retry | Healthcheck | Auditoria |
|---|---|---|---|---|---|---|
| Stripe | `StripeBillingAdapter` | secret key | assinatura obrigatória | sim | API ping/list product | webhook/action |
| Supabase | `SupabaseAuthAdapter` | env keys | auth events se usado | não padrão | auth reachable | auth/admin |
| R2/S3 | `R2StorageAdapter` | access keys | não obrigatório | sim | head bucket | upload/download |
| Resend | `EmailAdapter` | API key | bounce recomendado | sim | send test/domain | notification |
| Autentique | `SignatureAdapter` | token | assinatura/secret | sim | API status | contract |
| DocuSign | `SignatureAdapter` | OAuth | assinatura/secret | sim | API status | contract |
| Meta Ads | `MarketingAdapter` | OAuth | provider webhook | sim | account status | campaign |
| TikTok | `MarketingAdapter` | OAuth | provider webhook | sim | account status | campaign |
| Google Ads | `MarketingAdapter` | OAuth | provider webhook | sim | account status | campaign |
| ECAD/ABRAMUS | `RegistryAdapter` | token/credential | quando disponível | sim | credential status | submission |
| AI providers | `AiProviderAdapter` | API key | não obrigatório | sim | model list/ping | ai run |

Regras:

- Tokens devem ser criptografados em repouso.
- Webhooks exigem assinatura quando provider suportar.
- Falhas transitórias vão para retry; falhas permanentes vão para DLQ e audit.
- Healthcheck por provider aparece no admin técnico.

## 12. Segurança

### 12.1 Auth/JWT

- Validar JWT em backend por issuer/audience/chave.
- Não confiar em metadata do usuário para autorização.
- Refresh/session lifecycle é responsabilidade do client/Supabase, mas backend deve aceitar apenas token válido.
- MFA para super_admin é necessário para produção enterprise.

### 12.2 RBAC

- `RBAC_PERSISTED_AUTHORITY=ON` em produção.
- Guards avaliam role, permission e tenant membership.
- Permission decision logs devem existir para divergências e auditoria.

### 12.3 RLS/IDOR

- Toda tabela tenant-scoped com RLS em produção.
- App DB role sem `BYPASSRLS`.
- Repositories sempre filtram por tenant mesmo com RLS.
- 404 preferível a 403 quando recurso de outro tenant for solicitado por id.

### 12.4 Rate Limit

- Auth, public registration, webhooks, upload presign, AI run e exports devem ter rate limit.
- Rate limit deve considerar IP, userId e tenantId conforme endpoint.

### 12.5 CORS/CSP/CSRF/XSS

- CORS restrito a `APP_URL`/`FRONTEND_URL`.
- CSP configurado para assets, API e providers necessários.
- CSRF aplicado se houver cookies/sessão stateful.
- Sanitizar HTML/textos ricos.
- Inputs refletidos em UI devem escapar por padrão.

### 12.6 Secrets/Criptografia

- Secrets fora do repositório, em secret manager.
- Tokens de integração criptografados com `ENCRYPTION_KEY`.
- Logs nunca incluem tokens, secrets, full payloads sensíveis ou arquivos.

## 13. Observabilidade

### 13.1 Logs

- JSON estruturado.
- Campos: `timestamp`, `level`, `service`, `requestId`, `correlationId`, `tenantId`, `userId`, `route`, `status`, `durationMs`, `errorCode`.
- Redaction obrigatório para secrets e PII sensível.

### 13.2 Metrics

- HTTP request count/duration/error.
- DB latency/connection pool.
- Redis/queue jobs active/completed/failed/DLQ.
- Stripe webhook success/failure/duplicate.
- Billing state counts.
- Upload success/failure/quota.
- Auth failures.

### 13.3 Traces

- OpenTelemetry recomendado para request -> DB -> queue -> provider.
- Propagar correlation id para jobs e integrations.

### 13.4 Dashboards/Alertas/SLOs

- API p95 < 500ms para CRUD crítico.
- API 5xx abaixo de threshold definido.
- Webhook Stripe failures alertam imediatamente.
- DLQ > 0 alerta.
- Tenant isolation verification failure bloqueia release.
- Billing suspended spike alerta produto/suporte.

## 14. Testes

| Módulo | Unit | Integration | E2E | Security | Tenant Isolation | Billing | Webhooks/Upload |
|---|---|---|---|---|---|---|---|
| Auth | guards/services | auth context | login/logout | JWT inválido | membership | bypass prod | n/a |
| Admin SaaS | services | controllers | admin flows | super_admin only | admin scoped | actions | n/a |
| Billing | enforcement | Stripe webhook | grace/read_only/suspended | signature | tenant mapping | completo | webhook |
| RBAC | decision | guards | role matrix | denial | role tenant | n/a | n/a |
| Artistas | service | CRUD | create/edit | permission | sim | read_only | public upload |
| Catálogo | validation | CRUD | work/recording | permission | sim | read_only | n/a |
| Contratos | lifecycle | provider webhook | send/sign | signature | sim | read_only | webhook |
| CRM | pipeline | CRUD | convert lead | permission | sim | read_only | public |
| Financeiro | rules | CRUD | invoice/transaction | financial role | sim | read_only | n/a |
| Marketing | approvals | CRUD | campaign | permission | sim | read_only | provider |
| Releases | validation | CRUD | approve/distribute | permission | sim | read_only | provider |
| Monitoring | service | CRUD/import | tabs/takedown | permission | sim | read_only | provider |
| Registry | payload | submissions | submit/status | permission | sim | read_only | provider |
| Storage | policy | presign/confirm | upload/download | MIME/quota | prefix | read_only | upload |
| AI | provider router | run | skill flow | budget/PII | sim | feature | provider |
| Support | service | CRUD | ticket | permission | sim | accessible suspended | email |
| RH | service | CRUD | leave/payroll | PII | sim | read_only | n/a |
| Audiovisual | service | CRUD | approval | permission | sim | read_only | upload |
| Reports | export/import | jobs | export ready | permission/PII | sim | read_only export | storage |
| Observability | services | metrics | health | restricted metrics | n/a | n/a | n/a |

## 15. CI/CD

### 15.1 Pipelines

Stages:

1. install frozen lockfile;
2. typecheck web/api;
3. lint web/api;
4. unit tests;
5. integration tests;
6. build web/api;
7. migrations check;
8. RLS/tenant isolation verification;
9. RBAC readiness;
10. billing webhook tests;
11. storage upload/download tests;
12. smoke tests;
13. deploy staging;
14. post-deploy smoke;
15. manual go/no-go production.

### 15.2 Gates

- Produção falha se `AUTH_DISABLED=true`, `VITE_AUTH_DISABLED=true` ou `MOCK_MODE=true`.
- Produção falha se DB role tiver `BYPASSRLS`.
- Produção falha se RBAC readiness estiver vermelho.
- Produção falha se migrations pendentes não aplicadas.
- Produção falha se Stripe webhook tests críticos falharem.

### 15.3 Deploy/Rollback

- Artefatos versionados para web e API.
- Migrations antes do deploy quando backward compatible.
- Rollback de app preparado; rollback de migration só com plano explícito.
- Feature flags para desligar features novas sem rollback total.
- Smoke pós-deploy obrigatório.

## 16. Matriz De Arquivos

### 16.1 Padrão Por Módulo

```text
apps/web/src/modules/{module}/
  pages/
  components/
  modals/
  forms/
  hooks/
  services/
  types/
  tests/

apps/api/src/modules/{module}/
  {module}.module.ts
  {module}.controller.ts
  {module}.service.ts
  dto/
  entities/
  repositories/
  events/
  policies/
  tests/
```

### 16.2 Arquivos Necessários Por Módulo

| Módulo | Frontend | Backend | Banco/Migrations | Tests |
|---|---|---|---|---|
| Auth | `modules/auth/pages/Auth.tsx`, hooks/services | `modules/auth/*`, core guards | users/org_members/tenants | auth guard/context |
| Admin SaaS | `modules/admin/pages/*`, services | `modules/admin/*`, billing admin | tenants/plans/audit | admin e2e |
| Billing | `modules/billing/*`, admin subscriptions | `modules/billing/*` | subscriptions/state/invoices/events | webhook/enforcement |
| RBAC | settings roles UI | `core/rbac`, `modules/rbac` | roles/permissions/grants | guard/readiness |
| Artistas | `modules/artists/*`, public signup | `modules/artists/*`, leads public | artists/leads | CRUD/public |
| Catálogo | `modules/catalog/*` | `modules/catalog/*` | works/recordings/shares | validation |
| Contratos | `modules/contracts/*` | `modules/contracts/*` | contracts/templates | lifecycle |
| CRM | `modules/crm/*` | `modules/crm/*` | leads/contacts | pipeline |
| Financeiro | `modules/finance/*` | `modules/finance/*` | transactions/invoices | accounting |
| Marketing | `modules/marketing/*` | `modules/marketing/*` | campaigns/tasks | approvals |
| Releases | `modules/releases/*` | `modules/releases/*` | releases/tracks | approve |
| Monitoring | `modules/monitoring/*` | `modules/monitoring/*` | detections/takedowns | tabs/takedown |
| Registry | `modules/registry/*` | `modules/registry/*` | submissions/holders | payload |
| Storage | `modules/storage/*`, shared upload | `modules/uploads`, `modules/assets` | assets/upload_sessions | upload |
| AI | shared skill components | `modules/ai/*` | ai_runs/usage | provider |
| Support | `modules/support/*`, admin support | `modules/support/*` | tickets/articles | ticket |
| RH | `modules/rh/*` | `modules/rh/*` | employees/payroll | PII |
| Audiovisual | `modules/audiovisual/*` | `modules/audiovisual/*` | projects/shots | production |
| Reports | `modules/reports/*` | `modules/reports/*` | report_jobs | export |
| Observability | admin health UI | `observability`, health/metrics | n/a | health/metrics |

## 17. Matriz De Implementação

| Módulo | Frontend | Backend | Banco | API | Eventos | Jobs | Testes | Status |
|---|---|---|---|---|---|---|---|---|
| Auth | parcial | parcial | parcial | parcial | parcial | necessário | necessário | Parcial |
| Admin SaaS | parcial | necessário | parcial | necessário | parcial | recomendado | necessário | Parcial |
| Billing | parcial | parcial | parcial | parcial | parcial | necessário | necessário | Parcial |
| RBAC | parcial | parcial | parcial | parcial | parcial | recomendado | necessário | Parcial |
| Multi-tenancy | parcial | parcial | parcial | parcial | parcial | necessário CI | necessário | Parcial forte |
| Artistas | parcial | parcial | parcial | parcial | parcial | recomendado | necessário | Parcial |
| Catálogo | parcial | parcial | parcial | parcial | parcial | recomendado | necessário | Existente |
| Contratos | parcial | parcial | parcial | parcial | parcial | necessário | necessário | Existente |
| CRM | parcial | parcial | parcial | parcial | parcial | recomendado | necessário | Parcial |
| Financeiro | parcial | parcial | parcial | parcial | parcial | recomendado | necessário | Existente |
| Marketing | parcial | parcial | parcial | parcial | parcial | necessário | necessário | Existente |
| Lançamentos | parcial | parcial | parcial | parcial | parcial | necessário | necessário | Existente |
| Monitoramento | parcial | parcial | parcial | parcial | parcial | necessário | necessário | Parcial |
| Registry | parcial | parcial | parcial | parcial | parcial | necessário | necessário | Existente |
| Storage | parcial | parcial | parcial | parcial | parcial | necessário | necessário | Existente |
| AI/Skills | parcial | parcial | parcial | parcial | parcial | necessário | necessário | Parcial |
| Suporte | parcial | parcial | parcial | parcial | parcial | recomendado | necessário | Parcial |
| RH | parcial | parcial | parcial | parcial | necessário | recomendado | necessário | Existente |
| Audiovisual | parcial | parcial | parcial | parcial | necessário | recomendado | necessário | Existente |
| Relatórios | parcial | parcial | parcial | parcial | parcial | necessário | necessário | Existente |
| Observabilidade | parcial | parcial | n/a | parcial | recomendado | recomendado | necessário | Parcial |

## 18. Definition Of Done Técnico

Um módulo só pode ser considerado tecnicamente concluído quando:

- frontend possui rotas, pages, components, forms, tables, modals, guards, loading, empty, error e success states;
- backend possui module, controller, DTOs, service, repositories, policies/guards, audit hooks e error handling;
- endpoints implementados seguem contratos de request, response, status codes e erros;
- banco possui migrations versionadas, constraints, índices, FK, soft delete quando aplicável e RLS para tenant-scoped;
- permissões RBAC foram declaradas e testadas;
- feature gates foram declarados no backend e refletidos no frontend;
- billing `read_only` e `suspended` foram testados para todas as mutações;
- auditoria registra mutações críticas com before/after quando aplicável;
- eventos de domínio são emitidos com payload mínimo e idempotência quando assíncronos;
- jobs possuem retry, DLQ, timeout e observabilidade;
- integrações possuem adapter, healthcheck, token handling seguro e webhook validation quando aplicável;
- logs/metrics/traces mínimos existem para fluxo crítico;
- testes unitários, integração, E2E, segurança, tenant isolation, billing, upload e webhook passam conforme módulo;
- CI executa validações obrigatórias sem exceções manuais;
- documentação funcional e técnica foi atualizada;
- o módulo foi validado em desktop, tablet e mobile quando possui UI;
- não há mock como fonte de verdade em produção;
- não há bypass de autenticação/autorização/billing em produção.

Próximo artefato natural: Execution Backlog Engine, decompondo este MTIS em épicos, features, stories, tarefas técnicas, branches e PRs executáveis por equipe.
