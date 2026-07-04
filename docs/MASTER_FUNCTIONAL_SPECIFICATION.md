# MASTER FUNCTIONAL SPECIFICATION (MFS) — MUSIC OS 360

Data: 2026-07-01  
Fontes oficiais:

- `docs/BLUEPRINT_ENTERPRISE.md`
- `docs/PLANO_MASTER_IMPLEMENTACAO_ENTERPRISE.md`

Esta MFS é a especificação funcional oficial do produto MUSIC OS 360. Ela define como o sistema deve operar do ponto de vista de produto, UX, frontend, backend, QA, DevOps e operação enterprise.

Legenda usada no documento:

- **Encontrado no Blueprint:** comportamento, módulo ou entidade já identificado no blueprint.
- **Encontrado no Plano Master:** item priorizado no plano de implementação.
- **Regra obrigatória:** comportamento que deve ser implementado para produção enterprise.
- **Regra opcional:** comportamento permitido, mas não bloqueante para MVP confiável.
- **Recomendação funcional:** evolução desejada, sem afirmar que já existe.

## 1. Visão Funcional Do Produto

### Nome

MUSIC OS 360.

### Objetivo

Centralizar a operação musical de empresas, gravadoras, selos, editoras, managers e equipes de catálogo em uma plataforma SaaS multi-tenant com módulos de artistas, catálogo, contratos, lançamentos, marketing, CRM, financeiro, monitoramento, suporte, relatórios, integrações, billing e administração SaaS.

### Público

- Gravadoras e selos independentes.
- Editoras musicais.
- Managers e agências.
- Produtoras audiovisuais ligadas ao catálogo.
- Equipes internas de A&R, jurídico, financeiro, marketing, suporte, distribuição e operações.
- Super admins da plataforma SaaS.
- Artistas convidados por link público de cadastro.

### Problema Resolvido

O produto substitui operações fragmentadas em planilhas, drives, CRMs genéricos, ferramentas de assinatura, controles financeiros manuais, calendários soltos, formulários públicos não integrados e integrações externas sem rastreabilidade.

### Jornada Principal Do Usuário Tenant

1. Usuário acessa `/auth`.
2. Autentica via Supabase/Auth.
3. API resolve tenant, organization e membership.
4. Frontend carrega contexto de tenant, plano, features e billing.
5. Usuário acessa módulos permitidos no sidebar.
6. Usuário cria/edita recursos do tenant: artistas, obras, contratos, lançamentos, campanhas, leads, transações, tickets.
7. Toda ação relevante gera audit log, domain event ou activity log.
8. Se billing estiver em `payment_grace`, o usuário vê banner.
9. Se billing estiver em `read_only`, ações mutáveis são bloqueadas.
10. Se billing estiver em `suspended`, o usuário é direcionado para `/billing/blocked`.

### Jornada Administrativa Do Tenant

1. Owner/admin acessa configurações.
2. Gerencia usuários, papéis, permissões e configurações operacionais.
3. Gerencia billing do próprio tenant em `/configuracoes/billing`.
4. Acompanha auditoria em `/auditoria` quando autorizado.
5. Configura integrações disponíveis conforme plano.

### Jornada Do Super Admin

1. Super admin acessa `/admin/dashboard`.
2. Visualiza KPIs SaaS globais.
3. Gerencia clientes/tenants em `/admin/clients`.
4. Gerencia planos em `/admin/plans`.
5. Gerencia assinaturas e enforcement em `/admin/subscriptions`.
6. Acessa logs e auditoria em `/admin/audit`.
7. Gerencia suporte e base de conhecimento.
8. Gerencia configurações globais e integrações da plataforma.

Regra obrigatória: telas super admin devem operar dados reais, não mock, para produção.

### Jornada Do Artista

1. Artista recebe link público `/cadastro/:workspaceSlug`.
2. Sistema resolve workspace pelo slug.
3. Sistema valida workspace ativo, não bloqueado, não excluído e com cadastro público permitido.
4. Artista preenche dados pessoais, redes, biografia e anexos quando disponíveis.
5. Sistema cria lead/artista vinculado automaticamente ao tenant.
6. Responsáveis do tenant recebem notificação.

Regra obrigatória: artista nunca escolhe workspace manualmente.

### Jornada Do Cliente

No contexto do produto, cliente pode significar:

- tenant contratante do SaaS;
- cliente/contato gerenciado dentro do CRM.

Regras:

- Cliente SaaS é gerenciado no painel admin.
- Cliente CRM é gerenciado dentro do tenant.
- As duas camadas não devem compartilhar permissões nem endpoints sem escopo explícito.

## 2. Matriz Completa De Módulos

| Módulo | Objetivo | Status atual | Dependências | Feature gate | Plano mínimo | Plano recomendado | Prioridade |
|---|---|---|---|---|---|---|---|
| Auth | Login, sessão e contexto | Parcial | Supabase, JWT, tenants | Sempre ativo | Starter | Enterprise | P0 |
| Admin SaaS | Operação global da plataforma | Parcial | Billing, tenants, audit | super_admin | Enterprise interno | Enterprise | P0 |
| Billing | Planos, assinatura, Stripe, bloqueio | Parcial com núcleo real | Stripe, tenants, invoices | billing | Starter | Enterprise | P0 |
| RBAC | Papéis e permissões | Parcial/shadow | users, org_members | settings/rbac | Professional | Enterprise | P0 |
| Multi-tenancy | Isolamento por tenant | Parcial/forte | Auth, DB, RLS | Sempre ativo | Starter | Enterprise | P0 |
| Artistas | Gestão de artistas | Encontrado/parcial | leads, uploads, catalog | moduleArtists | Starter | Professional | P1 |
| Catálogo | Obras, fonogramas, shares | Encontrado | artists, registry | moduleCatalog | Starter | Professional | P1 |
| Contratos | Contratos e templates | Encontrado | artists, clients, signing | moduleContracts | Starter | Professional | P1 |
| CRM/Leads | Leads, contatos, pipeline | Encontrado/parcial | forms, artists | moduleCrm | Starter | Professional | P1 |
| Financeiro | Transações, invoices, categorias | Encontrado | billing, clients | moduleAccounting | Professional | Enterprise | P1 |
| Marketing | Campanhas, briefings, assets | Encontrado | assets, AI, integrations | moduleMarketing | Professional | Enterprise | P1 |
| Lançamentos | Gestão de releases | Encontrado | catalog, integrations | moduleReleases | Professional | Enterprise | P1 |
| Monitoramento | Detecções, ECAD, takedowns | Parcial | catalog, integrations | moduleMonitoring | Professional | Enterprise | P2 |
| Registry | Titulares, identificadores, sociedades | Encontrado | catalog, integrations | moduleRegistry | Professional | Enterprise | P2 |
| Storage/Assets | Upload, download e versionamento | Encontrado | R2, tenant, billing | storage | Starter | Enterprise | P1 |
| AI/Skills | IA operacional e automações | Parcial | OpenAI/Anthropic/Gemini | aiFeatures | Enterprise | Enterprise | P2 |
| Suporte | Tickets e base de conhecimento | Encontrado/parcial | users, notifications | support | Starter | Enterprise | P1 |
| RH | Funcionários e folha | Encontrado | tenant, finance | moduleRh | Professional | Enterprise | P2 |
| Audiovisual | Produção audiovisual | Encontrado | projects, assets | moduleAudiovisual | Professional | Enterprise | P2 |
| Relatórios | Export/import e análise | Encontrado | DB, permissions | reports | Professional | Enterprise | P1 |
| Observabilidade | Saúde, logs, métricas | Parcial | infra, API, web | interno | Enterprise interno | Enterprise | P0 |
| Integrações | Conexões externas | Parcial | OAuth, queues, audit | por provider | Professional | Enterprise | P2 |

## 3. Especificação Funcional Por Módulo

### 3.1 Auth

- **Objetivo:** autenticar usuários, resolver sessão, tenant e membership.
- **Descrição funcional:** usuário entra por `/auth`, autentica com Supabase, recebe sessão/JWT, frontend injeta token e tenant nas chamadas, backend valida JWT e membership.
- **Perfis autorizados:** todos os perfis autenticados; rotas públicas dispensam login.
- **Permissões necessárias:** não se aplica ao login; bootstrap exige membership ativo.
- **Feature gate:** sempre ativo.
- **Dependências:** Supabase Auth, `JwtAuthGuard`, `TenantGuard`, `AuthContext`, `TenantContext`.
- **Fluxos suportados:** login, logout, reset de senha, cadastro, onboarding, bootstrap de workspace.
- **Eventos emitidos:** `tenant.created`, `user.invited` quando aplicável.
- **Eventos consumidos:** nenhum obrigatório.
- **Integrações:** Supabase Auth.
- **Auditoria:** login/logout, convite, criação de usuário, alteração de role.
- **Notificações:** convite de usuário e reset de senha quando habilitado.
- **Logs:** falhas JWT, token expirado, tenant não encontrado, membership inválido.
- **Relatórios:** auditoria de acesso e usuários.
- **KPIs:** logins ativos, falhas de login, usuários por tenant, convites pendentes.
- **Limitações:** MFA e revogação de sessão são recomendados e ainda não confirmados.
- **Regras de negócio:** `AUTH_DISABLED` e `MOCK_MODE` não podem estar ativos em produção; `user_metadata` não deve ser fonte de autorização.

### 3.2 Admin SaaS

- **Objetivo:** operar a plataforma como SaaS multi-tenant.
- **Descrição funcional:** super admin acessa `/admin/*` para gerenciar tenants, planos, assinaturas, auditoria, suporte, base de conhecimento e integrações globais.
- **Perfis autorizados:** `super_admin`.
- **Permissões necessárias:** acesso sistema; não deve depender de permissões tenant comuns.
- **Feature gate:** interno de plataforma.
- **Dependências:** Billing, tenants, audit logs, support, settings.
- **Fluxos suportados:** listar tenants, editar tenant, suspender/reativar, gerenciar planos, gerenciar subscriptions, consultar auditoria.
- **Eventos emitidos:** `tenant.suspended`, `tenant.reactivated`, `billing.override_enabled`, `billing.override_disabled`.
- **Eventos consumidos:** eventos de billing, suporte e audit.
- **Integrações:** Stripe, observabilidade, suporte.
- **Auditoria:** toda ação super admin deve registrar antes/depois, userId, tenantId afetado, IP, motivo.
- **Notificações:** alertas internos para bloqueio/reactivação e incidentes críticos.
- **Logs:** ações admin, falhas API, tentativas não autorizadas.
- **Relatórios:** SaaS KPIs, MRR, tenants ativos, inadimplentes, tickets.
- **KPIs:** MRR, churn, tenants ativos, trials, inadimplentes, tickets abertos.
- **Limitações:** blueprint indica fonte mock/local em partes do admin.
- **Regras de negócio:** produção não pode depender de `ADMIN_TENANTS` ou `ADMIN_SUBSCRIPTIONS` mock.

### 3.3 Billing

- **Objetivo:** controlar monetização, planos, cobrança, bloqueio financeiro e reativação.
- **Descrição funcional:** Stripe gera checkout/portal; webhooks atualizam assinatura, invoices e estado financeiro do tenant; backend bloqueia rotas conforme status.
- **Perfis autorizados:** super_admin, owner, admin financeiro conforme escopo.
- **Permissões necessárias:** billing:read, billing:update, billing:admin, invoice:read.
- **Feature gate:** billing sempre ativo.
- **Dependências:** Stripe, tenants, invoices, audit, notifications, queues.
- **Fluxos suportados:** checkout, portal, webhook, payment_grace, read_only, suspended, override, reativação.
- **Eventos emitidos:** `stripe.webhook_processed`, `billing.grace_started`, `billing.read_only`, `tenant.suspended`, `tenant.reactivated`.
- **Eventos consumidos:** Stripe webhook events.
- **Integrações:** Stripe.
- **Auditoria:** webhook processado, falha webhook, override, suspensão, reativação, cancelamento.
- **Notificações:** pagamento pendente, workspace somente leitura, workspace suspenso, pagamento confirmado.
- **Logs:** assinatura inválida, evento duplicado, reconciliation, mudança de estado.
- **Relatórios:** MRR, ARR, invoices, inadimplência, churn.
- **KPIs:** MRR, ARR, past_due, suspended, recovery rate.
- **Limitações:** reconciliation e dunning estão no plano, não totalmente fechados.
- **Regras de negócio:** backend é fonte de verdade; frontend nunca decide liberação financeira sozinho.

### 3.4 RBAC

- **Objetivo:** controlar acesso por papel, permissão, tenant e módulo.
- **Descrição funcional:** roles e permissions são persistidos; guards avaliam papel mínimo e permissões explícitas; modo final deve ser `RBAC_PERSISTED_AUTHORITY=ON`.
- **Perfis autorizados:** owner/admin gerenciam RBAC do tenant; super_admin opera plataforma.
- **Permissões necessárias:** role:read, role:create, role:update, permission:assign.
- **Feature gate:** settings/rbac.
- **Dependências:** users, org_members, permissions, roles.
- **Fluxos suportados:** criar role, duplicar, arquivar, restaurar, conceder/remover permissões, herança.
- **Eventos emitidos:** role created/updated, permission granted/removed, decision logs.
- **Eventos consumidos:** user invited, membership changed.
- **Integrações:** nenhuma externa obrigatória.
- **Auditoria:** todas as mudanças de role/permission.
- **Notificações:** opcional para mudança de permissão crítica.
- **Logs:** decision logs, denial logs, errors.
- **Relatórios:** matriz de permissões, decisões negadas, roles por tenant.
- **KPIs:** denials por módulo, roles custom, permissões órfãs.
- **Limitações:** status atual é parcial/shadow.
- **Regras de negócio:** departments/positions não concedem permissão diretamente; role é a fonte de permissão.

### 3.5 Multi-Tenancy

- **Objetivo:** garantir isolamento de dados, storage, logs e jobs por tenant.
- **Descrição funcional:** todas as rotas protegidas exigem JWT, membership e `X-Tenant-ID`; banco usa `tenant_id` e RLS; eventos e jobs carregam `tenantId`.
- **Perfis autorizados:** todos, dentro do tenant; super_admin em endpoints globais específicos.
- **Permissões necessárias:** dependem do módulo.
- **Feature gate:** sempre ativo.
- **Dependências:** Auth, DB, RLS, TenantGuard, RequestTenantContextInterceptor.
- **Fluxos suportados:** resolver tenant, validar membership, escopar queries, bloquear cross-tenant.
- **Eventos emitidos:** todos os eventos devem carregar tenantId.
- **Eventos consumidos:** todos os jobs devem reconstituir tenant context.
- **Integrações:** Supabase/Postgres/R2.
- **Auditoria:** tenantId obrigatório em audit logs.
- **Notificações:** escopadas ao tenant.
- **Logs:** sempre com tenantId quando disponível.
- **Relatórios:** tenant-scoped; cross-tenant apenas super_admin.
- **KPIs:** violações bloqueadas, requests sem tenant, falhas RLS.
- **Limitações:** produção exige app role sem BYPASSRLS.
- **Regras de negócio:** nenhum usuário tenant pode acessar dados de outro tenant.

### 3.6 Artistas

- **Objetivo:** cadastrar, gerir e acompanhar artistas.
- **Descrição funcional:** usuário cria artistas manualmente ou via cadastro público; artista pode ter dados pessoais, redes, biografia, plataforma e vínculo com catálogo/contratos/leads.
- **Perfis autorizados:** owner, admin, manager, editor; viewer lê; artist acessa escopo próprio quando portal existir.
- **Permissões necessárias:** artist:read/create/update/delete/export.
- **Feature gate:** moduleArtists.
- **Dependências:** leads, uploads, catalog, contracts.
- **Fluxos suportados:** criar artista, editar, listar, anexar arquivos, sincronizar perfis de plataforma.
- **Eventos emitidos:** `artist.created`, `artist.updated`, `artist.status_changed`, `artist.deleted`.
- **Eventos consumidos:** `lead.converted`.
- **Integrações:** Spotify/SoundCloud/YouTube quando habilitadas.
- **Auditoria:** criação, alteração, exclusão, sync externo.
- **Notificações:** novo artista, artista convertido de lead.
- **Logs:** falha de sync, validação, upload.
- **Relatórios:** artistas por status, origem, período, plano.
- **KPIs:** artistas ativos, novos artistas, conversão lead->artista.
- **Limitações:** portal artista completo é recomendação.
- **Regras de negócio:** artista público sempre vincula pelo slug do workspace.

### 3.7 Catálogo

- **Objetivo:** gerenciar obras, fonogramas, shares e metadados musicais.
- **Descrição funcional:** usuários registram obras/fonogramas, vinculam artistas, titulares, identificadores e releases.
- **Perfis autorizados:** owner, admin, manager, editor; viewer lê; radio/tv podem ler monitoring/licensing conforme RBAC.
- **Permissões necessárias:** catalog:read/create/update/delete/export.
- **Feature gate:** moduleCatalog.
- **Dependências:** artists, registry, releases, uploads.
- **Fluxos suportados:** criar obra, criar fonograma, vincular artista, preparar submissão registry, exportar.
- **Eventos emitidos:** `catalog.work.created`, `catalog.recording.created`.
- **Eventos consumidos:** `asset.uploaded`, registry status.
- **Integrações:** ABRAMUS/ECAD/registry.
- **Auditoria:** mudanças de metadados e direitos.
- **Notificações:** erro de validação registry, status de submissão.
- **Logs:** validações, sync externo.
- **Relatórios:** catálogo por artista, status, identificadores, pendências.
- **KPIs:** obras cadastradas, fonogramas, pendências registry.
- **Limitações:** fingerprint real é futuro.
- **Regras de negócio:** metadados críticos devem ser versionados antes de produção enterprise.

### 3.8 Contratos

- **Objetivo:** criar e acompanhar contratos musicais e templates.
- **Descrição funcional:** usuário cria templates, gera contratos, associa partes, envia para assinatura, acompanha status e expiração.
- **Perfis autorizados:** owner/admin/manager/editor; viewer lê.
- **Permissões necessárias:** contracts:read/create/update/delete/export/approve.
- **Feature gate:** moduleContracts.
- **Dependências:** artists, clients, uploads, Autentique/DocuSign.
- **Fluxos suportados:** template -> contrato -> assinatura -> status -> arquivo final.
- **Eventos emitidos:** `contract.created`, `contract.sent_for_signature`, `contract.signed`, `contract.expired`.
- **Eventos consumidos:** webhook assinatura.
- **Integrações:** Autentique encontrado; DocuSign previsto por env.
- **Auditoria:** criação, alteração, envio, assinatura, cancelamento.
- **Notificações:** assinatura pendente, contrato assinado, expiração.
- **Logs:** webhook assinatura, falhas provider.
- **Relatórios:** contratos por status, vencimento, artista.
- **KPIs:** contratos ativos, expirando, assinados, pendentes.
- **Limitações:** lifecycle jurídico completo está no plano.
- **Regras de negócio:** assinatura externa deve validar webhook com segredo.

### 3.9 CRM / Leads

- **Objetivo:** gerenciar relacionamento comercial e captação de artistas/clientes.
- **Descrição funcional:** leads entram por formulário público ou manual; contatos, empresas, interações e pipelines acompanham avanço até conversão.
- **Perfis autorizados:** owner/admin/manager/editor; viewer lê.
- **Permissões necessárias:** lead:read/create/update/delete, crm:read/create/update/delete.
- **Feature gate:** moduleCrm.
- **Dependências:** forms, artists, notifications.
- **Fluxos suportados:** criar lead, registrar interação, mover pipeline, converter lead.
- **Eventos emitidos:** `lead.created`, `lead.updated`, `lead.converted`.
- **Eventos consumidos:** public registration.
- **Integrações:** formulários, e-mail futuramente.
- **Auditoria:** alterações de estágio, conversão, exclusão.
- **Notificações:** novo lead, follow-up pendente, lead convertido.
- **Logs:** submissões públicas, spam bloqueado.
- **Relatórios:** origem, conversão, pipeline, SLA.
- **KPIs:** leads novos, taxa de conversão, tempo por etapa.
- **Limitações:** automações/SLA são recomendação.
- **Regras de negócio:** cadastro público nunca deve permitir escolha manual de tenant.

### 3.10 Financeiro

- **Objetivo:** controlar transações, invoices operacionais e categorias financeiras do tenant.
- **Descrição funcional:** usuários registram receitas/despesas, categorizam, aplicam regras, emitem/acompanham invoices operacionais.
- **Perfis autorizados:** owner/admin/financial/manager; viewer lê conforme permissão.
- **Permissões necessárias:** accounting:read/create/update/delete/export/approve.
- **Feature gate:** moduleAccounting.
- **Dependências:** clients, contracts, billing separado, reports.
- **Fluxos suportados:** criar transação, categorizar, aplicar regra, exportar.
- **Eventos emitidos:** `transaction.created`, `transaction.paid`, `invoice.created`, `financial_rule.triggered`.
- **Eventos consumidos:** contract signed, invoice overdue.
- **Integrações:** NFe prevista, bancos futuros.
- **Auditoria:** todas as mutações financeiras.
- **Notificações:** vencimento, pagamento, falha regra.
- **Logs:** regra aplicada, erro fiscal.
- **Relatórios:** DRE operacional, categorias, invoices, cashflow.
- **KPIs:** receita, despesa, saldo, inadimplência operacional.
- **Limitações:** conciliação bancária é recomendação.
- **Regras de negócio:** financeiro operacional não substitui billing SaaS.

### 3.11 Marketing

- **Objetivo:** planejar e executar campanhas, briefings, ativos e conteúdo.
- **Descrição funcional:** usuário cria projeto/campanha, define tarefas, assets, calendário, aprovações e posts.
- **Perfis autorizados:** owner/admin/marketing/manager/editor; viewer lê.
- **Permissões necessárias:** marketing:read/create/update/delete/export/approve.
- **Feature gate:** moduleMarketing.
- **Dependências:** assets, AI, integrations, releases.
- **Fluxos suportados:** briefing -> campanha -> tarefas -> assets -> aprovação -> publicação.
- **Eventos emitidos:** `marketing.project_created`, `campaign.started`, `marketing.tasks_generated`.
- **Eventos consumidos:** `asset.uploaded`, release events.
- **Integrações:** Meta, TikTok, Google Ads quando habilitados.
- **Auditoria:** alterações de campanha, aprovação, publicação.
- **Notificações:** tarefa atribuída, asset aprovado, campanha iniciada.
- **Logs:** falhas de publicação e integração.
- **Relatórios:** campanha por canal, calendário, assets.
- **KPIs:** campanhas ativas, tarefas atrasadas, alcance/conversão quando integrado.
- **Limitações:** publish real ainda precisa padronização.
- **Regras de negócio:** publicação externa deve ser idempotente e auditável.

### 3.12 Lançamentos

- **Objetivo:** organizar releases musicais e sua relação com obras/fonogramas.
- **Descrição funcional:** usuário cria lançamento, vincula obras/fonogramas, acompanha status e distribuição externa.
- **Perfis autorizados:** owner/admin/manager/editor; viewer lê.
- **Permissões necessárias:** releases:read/create/update/delete/export/approve.
- **Feature gate:** moduleReleases.
- **Dependências:** catalog, artists, integrations.
- **Fluxos suportados:** criar release, vincular obras, aprovar, distribuir.
- **Eventos emitidos:** `release.created`, `release.approved`, `release.distributed`.
- **Eventos consumidos:** catalog created, distribution status.
- **Integrações:** distribuidores externos quando habilitados.
- **Auditoria:** mudanças de status e vínculos.
- **Notificações:** release aprovado/distribuído/falhou.
- **Logs:** sync de distribuição.
- **Relatórios:** releases por status/período.
- **KPIs:** releases ativos, aprovados, distribuídos, falhas.
- **Limitações:** distribuição externa completa é recomendação.
- **Regras de negócio:** release não deve ser distribuído sem catálogo mínimo válido.

### 3.13 Monitoramento

- **Objetivo:** acompanhar uso, detecções, ECAD, takedowns e proteção de catálogo.
- **Descrição funcional:** usuário visualiza detecções, relatórios ECAD, divergências, takedowns e base inicial de proteção de catálogo.
- **Perfis autorizados:** owner/admin/manager/editor; viewer lê; radio/tv leitura conforme RBAC.
- **Permissões necessárias:** monitoring:read/create/update/delete/export.
- **Feature gate:** moduleMonitoring.
- **Dependências:** catalog, integrations, reports.
- **Fluxos suportados:** registrar detecção, analisar ECAD, abrir takedown, ver proteção.
- **Eventos emitidos:** `takedown.requested`.
- **Eventos consumidos:** external monitoring sync.
- **Integrações:** ACRCloud/futuras, ECAD/ABRAMUS.
- **Auditoria:** takedown, alterações, imports.
- **Notificações:** alerta de uso indevido, status takedown.
- **Logs:** sync, falhas externas.
- **Relatórios:** ECAD, detecções, takedowns, riscos.
- **KPIs:** detecções, divergências, takedowns abertos, risco crítico.
- **Limitações:** fingerprint real não implementado; aba proteção é base inicial.
- **Regras de negócio:** não simular IA/fingerprint real sem provider validado.

### 3.14 Registry

- **Objetivo:** preparar e acompanhar submissões a sociedades e identificadores externos.
- **Descrição funcional:** gerencia titulares, contas de sociedade, identificadores, payloads, validações e submissões.
- **Perfis autorizados:** owner/admin/manager/editor; viewer lê.
- **Permissões necessárias:** registry:read/create/update/delete/export/approve.
- **Feature gate:** moduleRegistry.
- **Dependências:** catalog, rights holders, integrations.
- **Fluxos suportados:** validar obra/fonograma, preparar payload, submeter, acompanhar status.
- **Eventos emitidos:** `society.submission_created`, `society.status_updated`.
- **Eventos consumidos:** catalog updates.
- **Integrações:** ABRAMUS/ECAD.
- **Auditoria:** criação de titular, submissão, alteração status.
- **Notificações:** erro de validação, submissão aceita/rejeitada.
- **Logs:** payload generation, provider responses.
- **Relatórios:** submissões por status, erros, provider.
- **KPIs:** submissões, rejeições, pendências.
- **Limitações:** production-grade externo depende de credenciais e contratos.
- **Regras de negócio:** payload deve ter snapshot versionado.

### 3.15 Storage / Assets

- **Objetivo:** armazenar, versionar e disponibilizar arquivos com segurança.
- **Descrição funcional:** backend gera presigned upload, browser envia para R2, API confirma e cria metadata; assets podem ser versionados e vinculados.
- **Perfis autorizados:** editor para upload; viewer para download; regras específicas por entidade.
- **Permissões necessárias:** storage:read/create/delete; asset:read/create/update/delete.
- **Feature gate:** storage e limites por plano.
- **Dependências:** R2, uploads, assets, billing limits.
- **Fluxos suportados:** presign, upload, confirm, download, versionar, vincular a projeto/tarefa.
- **Eventos emitidos:** `asset.uploaded`, `asset.linked_to_project`, `asset.linked_to_task`.
- **Eventos consumidos:** upload confirmed.
- **Integrações:** Cloudflare R2/S3.
- **Auditoria:** upload, confirm, download, delete, link.
- **Notificações:** asset disponível, scan falhou quando implementado.
- **Logs:** presign, confirm, storage errors.
- **Relatórios:** uso de storage por tenant, categoria, entidade.
- **KPIs:** GB usados, uploads, falhas, downloads.
- **Limitações:** scan/antivírus é recomendado no plano.
- **Regras de negócio:** download sempre valida tenant e status.

### 3.16 AI / Skills

- **Objetivo:** executar assistências de IA para tarefas musicais e operacionais.
- **Descrição funcional:** skills geram outputs controlados por prompts, validators e parsers; uso é logado e limitado por plano.
- **Perfis autorizados:** conforme módulo e plano; enterprise recomendado.
- **Permissões necessárias:** ai:read/create, permissões do módulo de origem.
- **Feature gate:** aiFeatures.
- **Dependências:** OpenAI, Anthropic, Google AI, ai usage logs.
- **Fluxos suportados:** gerar texto, análise de contrato, biografia, campanhas, skills.
- **Eventos emitidos:** `skill.started`, `skill.completed`, `skill.failed`.
- **Eventos consumidos:** project completed, marketing plan.
- **Integrações:** OpenAI/Anthropic/Gemini.
- **Auditoria:** uso, custo, usuário, módulo, tenant.
- **Notificações:** skill concluída/falhou quando assíncrona.
- **Logs:** prompt id, provider, custo, erro.
- **Relatórios:** custo por tenant, uso por skill.
- **KPIs:** custo mensal, taxa de sucesso, latência.
- **Limitações:** precisa política de budget e evals.
- **Regras de negócio:** não enviar PII sem base legal e política de privacidade.

### 3.17 Suporte

- **Objetivo:** gerenciar tickets, solicitações e base de conhecimento.
- **Descrição funcional:** usuários criam tickets; admins acompanham, resolvem e mantêm base de conhecimento.
- **Perfis autorizados:** todos criam ticket; manager/admin gerenciam.
- **Permissões necessárias:** support:read/create/update/delete.
- **Feature gate:** support.
- **Dependências:** users, notifications, knowledge.
- **Fluxos suportados:** abrir ticket, atualizar status, resolver, pesquisar base.
- **Eventos emitidos:** `support.ticket.created`, `ticket.resolved`.
- **Eventos consumidos:** incidentes internos.
- **Integrações:** email/notifications.
- **Auditoria:** alterações de ticket e base.
- **Notificações:** ticket criado, resposta, resolvido.
- **Logs:** SLA, erros de envio.
- **Relatórios:** tickets por status, SLA, categoria.
- **KPIs:** tempo primeira resposta, tempo resolução, backlog.
- **Limitações:** triagem IA é recomendação.
- **Regras de negócio:** tickets de billing devem ficar acessíveis mesmo com tenant suspenso.

### 3.18 RH

- **Objetivo:** gerenciar colaboradores, folha e afastamentos.
- **Descrição funcional:** módulo de employees, payroll e leave requests.
- **Perfis autorizados:** owner/admin/manager/RH; viewer autorizado lê.
- **Permissões necessárias:** rh:read/create/update/delete/approve.
- **Feature gate:** moduleRh.
- **Dependências:** tenant, finance.
- **Fluxos suportados:** criar funcionário, folha, solicitação de afastamento, aprovação.
- **Eventos emitidos:** audit.
- **Eventos consumidos:** nenhum obrigatório.
- **Integrações:** futuras folha/contabilidade.
- **Auditoria:** alterações de funcionário/folha/aprovação.
- **Notificações:** solicitação aprovada/rejeitada.
- **Logs:** erros de payroll.
- **Relatórios:** headcount, folha, afastamentos.
- **KPIs:** funcionários ativos, custo folha, afastamentos.
- **Limitações:** políticas avançadas são recomendação.
- **Regras de negócio:** dados de RH devem ter permissão granular.

### 3.19 Audiovisual

- **Objetivo:** gerir projetos audiovisuais conectados a artistas, assets e tarefas.
- **Descrição funcional:** projetos, briefings, shots, production days, equipe, deliverables, approvals, tasks e assets.
- **Perfis autorizados:** owner/admin/manager/editor; viewer lê.
- **Permissões necessárias:** audiovisual:read/create/update/delete/approve.
- **Feature gate:** moduleAudiovisual.
- **Dependências:** projects, assets, users.
- **Fluxos suportados:** criar projeto, briefing, shots, equipe, tarefas, aprovação.
- **Eventos emitidos:** `audiovisual.*` audit/events.
- **Eventos consumidos:** assets uploaded.
- **Integrações:** storage.
- **Auditoria:** alterações de projeto, aprovação, assets.
- **Notificações:** tarefa atribuída, aprovação pendente.
- **Logs:** upload/approval errors.
- **Relatórios:** produção por status, entregáveis, atrasos.
- **KPIs:** projetos ativos, tarefas atrasadas, entregáveis aprovados.
- **Limitações:** pipeline final production-ready é recomendado.
- **Regras de negócio:** aprovação deve registrar responsável e timestamp.

### 3.20 Relatórios

- **Objetivo:** fornecer export/import e leitura consolidada por entidades.
- **Descrição funcional:** usuário seleciona entidade/report definition, filtra, exporta ou importa com validação.
- **Perfis autorizados:** conforme módulo; financial para financeiro; super_admin cross-tenant.
- **Permissões necessárias:** reports:read/export/import e permissão do recurso.
- **Feature gate:** reports.
- **Dependências:** DB, RBAC, storage para export async.
- **Fluxos suportados:** listar entidades, ver definitions, exportar, importar validar/commit.
- **Eventos emitidos:** audit.
- **Eventos consumidos:** nenhum obrigatório.
- **Integrações:** storage para export async.
- **Auditoria:** export, import validate, import commit.
- **Notificações:** export pronto/falhou.
- **Logs:** filtros, tamanho, falha import.
- **Relatórios:** todos os definidos por módulo.
- **KPIs:** exports, imports, falhas.
- **Limitações:** export async é recomendação P2.
- **Regras de negócio:** PII deve ser mascarada conforme permissão.

### 3.21 Observabilidade

- **Objetivo:** permitir operação, diagnóstico e resposta a incidentes.
- **Descrição funcional:** sistema expõe health, metrics, logs e, no estado final, traces distribuídos.
- **Perfis autorizados:** DevOps, super_admin técnico.
- **Permissões necessárias:** system:read, observability:read.
- **Feature gate:** interno.
- **Dependências:** Prometheus, Grafana, Sentry, logs.
- **Fluxos suportados:** healthcheck, metrics scrape, alertas, incident runbook.
- **Eventos emitidos:** alertas operacionais.
- **Eventos consumidos:** logs/errors/metrics.
- **Integrações:** Sentry, PostHog, Prometheus, Grafana.
- **Auditoria:** acesso a painéis sensíveis.
- **Notificações:** alertas de SLA/incidente.
- **Logs:** JSON com requestId/correlationId/tenantId.
- **Relatórios:** SLO, error budget, uptime.
- **KPIs:** latency p95, error rate, queue failures, webhook failures.
- **Limitações:** OTel real é recomendação P2.
- **Regras de negócio:** logs não devem expor secrets nem PII desnecessária.

## 4. Telas

### 4.1 `/auth` — Autenticação

- **Objetivo:** login do usuário.
- **Menu:** público, sem sidebar.
- **Perfis autorizados:** público.
- **Componentes:** logo, email, senha, toggle senha, login, esqueci senha, criar conta, painel visual.
- **Cards:** formulário auth; painel institucional em desktop.
- **Tabelas:** nenhuma.
- **Filtros/ordenação/paginação:** nenhum.
- **Botões:** acessar sistema, esqueci senha, criar conta.
- **Ações:** login, reset, signup quando habilitado.
- **Estados vazios:** não aplicável.
- **Loading:** botão desabilitado durante login.
- **Erro:** credencial inválida, validação de campos.
- **Responsividade:** desktop split-screen; mobile sem hero lateral.
- **Acessibilidade:** labels/aria-labels, foco visível, contraste.

### 4.2 `/cadastro/:orgSlug` — Cadastro Público De Artistas

- **Objetivo:** cadastro de artista por workspace slug.
- **Menu:** público.
- **Perfis autorizados:** público.
- **Componentes:** header empresa, formulário, uploads opcionais.
- **Campos principais:** nome artístico, nome completo, email, telefone, cidade, estado, país, redes sociais, biografia, foto, links/anexos.
- **Botões:** enviar cadastro.
- **Ações:** resolver workspace, validar, enviar.
- **Estados vazios:** link inválido/cadastro indisponível.
- **Loading:** carregando workspace, enviando.
- **Erro:** workspace não encontrado, bloqueado, cadastro público desativado, validação.
- **Responsividade:** formulário mobile-first.
- **Acessibilidade:** labels e mensagens por campo.

### 4.3 `/admin/dashboard` — Painel Super Admin

- **Objetivo:** visão global SaaS.
- **Menu:** Painel.
- **Perfis autorizados:** super_admin.
- **Componentes:** KPIs, gráficos, alertas, atalhos.
- **KPIs:** tenants, MRR, trials, tickets, saúde.
- **Ações:** navegar para clientes, assinaturas, suporte.
- **Estados:** loading, erro API, empty se sem tenants.
- **Responsividade:** cards em grid responsivo.

### 4.4 `/admin/clients` — Clientes/Tenants

- **Objetivo:** listar e gerenciar tenants.
- **Menu:** Clientes.
- **Perfis autorizados:** super_admin.
- **Componentes:** KPI strip, filtros, tabela, menu ações, modal ver, modal editar.
- **Cards:** tenants ativos, trial, suspensos, MRR.
- **Tabela:** tenant, plano, status, usuários, storage, MRR, ciclo, próxima cobrança, método, desde.
- **Filtros:** busca, status, plano.
- **Paginação:** obrigatória.
- **Botões:** ver, editar, excluir, acessar ambiente, alterar plano, suspender/reativar.
- **Estados vazios:** nenhum cliente encontrado.
- **Loading:** skeleton/tabela carregando.
- **Erro:** falha API.
- **Responsividade:** tabela com scroll horizontal em telas menores.
- **Acessibilidade:** botões com labels/aria quando ícone.
- **Regra obrigatória:** produção usa API real.

### 4.5 `/admin/subscriptions` — Assinaturas

- **Objetivo:** gerir assinaturas e enforcement financeiro.
- **Menu:** Assinaturas.
- **Perfis autorizados:** super_admin.
- **Componentes:** KPIs, bloco enforcement, filtros, tabela, histórico, modal suspender.
- **Cards:** total, ativas, inadimplentes, MRR.
- **Tabela:** cliente, plano, status, ciclo, MRR, início, próxima cobrança, método.
- **Filtros:** busca, status.
- **Botões:** histórico, reativar, override ativo, forçar somente leitura, remover override, suspender.
- **Estados vazios:** sem assinaturas.
- **Loading:** tabela/skeleton.
- **Erro:** falha billing API.
- **Regra obrigatória:** ações chamam backend e geram audit.

### 4.6 `/admin/plans` — Planos

- **Objetivo:** configurar planos SaaS.
- **Menu:** Planos.
- **Perfis autorizados:** super_admin.
- **Componentes:** lista/tabela de planos, modal criar/editar.
- **Campos:** nome, tier, preço mensal/anual, limites, features, Stripe product/price ids.
- **Botões:** criar, editar, excluir, salvar.
- **Regra obrigatória:** feature gates e limites devem persistir.

### 4.7 `/admin/audit` E `/auditoria` — Auditoria

- **Objetivo:** consultar ações e logs auditáveis.
- **Perfis autorizados:** super_admin ou admin tenant conforme rota.
- **Componentes:** filtros, tabela, detalhes.
- **Filtros:** entidade, usuário, tenant, data, ação, status.
- **Ações:** atualizar, exportar quando permitido.
- **Regra obrigatória:** audit log append-only.

### 4.8 `/configuracoes` — Configurações Tenant

- **Objetivo:** gerenciar configurações operacionais, roles e integrações do tenant.
- **Perfis autorizados:** owner/admin.
- **Componentes:** tabs/sections, formulários, toggles, matriz RBAC.
- **Regra obrigatória:** alterações sensíveis auditadas.

### 4.9 `/configuracoes/billing` E `/billing/blocked`

- **Objetivo:** gerenciar cobrança tenant e desbloqueio financeiro.
- **Perfis autorizados:** owner/admin/financial.
- **Componentes:** plano atual, invoices, portal Stripe, blocked page.
- **Botões:** regularizar, abrir portal, pagar invoice, suporte.
- **Regra obrigatória:** `/billing` e suporte acessíveis mesmo suspenso.

### 4.10 Telas De Módulos Operacionais

Aplicável a Artistas, Catálogo, Contratos, CRM/Leads, Financeiro, Marketing, Lançamentos, Monitoramento, Registry, Storage/Assets, RH, Audiovisual, Relatórios e Suporte.

- **Componentes obrigatórios:** header, filtros, tabela/lista, ações, modais/forms, empty state, loading, erro.
- **Filtros mínimos:** busca textual, status, período quando aplicável.
- **Paginação:** obrigatória para listas com dados persistidos.
- **Ações mínimas:** visualizar, criar, editar, excluir/arquivar conforme permissão.
- **Responsividade:** conteúdo deve funcionar em desktop/tablet/mobile, com scroll horizontal em tabelas densas.
- **Acessibilidade:** labels, foco visível, contraste, botões nomeados.

## 5. Formulários

### 5.1 Login

| Campo | Tipo | Obrigatório | Máscara | Validações | Valor padrão | Origem | Persistência |
|---|---|---|---|---|---|---|---|
| email | email/text | sim | não | email válido ou usuário aceito pelo fluxo existente | vazio | usuário | Supabase Auth |
| senha | password | sim | não | mínimo definido por Auth | vazio | usuário | Supabase Auth |

Mensagens: credenciais inválidas, campo obrigatório, erro de rede.

### 5.2 Cadastro Público De Artista

| Campo | Tipo | Obrigatório | Validações | Persistência |
|---|---|---|---|---|
| artistName | text | sim | mínimo 2 chars | lead/artist |
| fullName | text | sim | mínimo 2 chars | lead/artist |
| email | email | sim | email válido | lead/artist |
| phone | tel | opcional | máscara telefone | lead/artist |
| city | text | opcional | texto | lead/artist |
| state | text/select | opcional | UF/estado | lead/artist |
| country | text/select | opcional | país | lead/artist |
| instagram/tiktok/spotify/youtube/soundcloud | url/text | opcional | URL/handle seguro | metadata |
| biography | textarea | opcional | limite de tamanho e sanitização | lead/artist |
| photo/files | upload | opcional | MIME, tamanho, extensão | uploads/assets |

Regra obrigatória: `workspaceSlug` vem da URL e não de campo do usuário.

### 5.3 Editar Cliente/Tenant Admin

| Campo | Tipo | Obrigatório | Validações | Persistência |
|---|---|---|---|---|
| name | text | sim | único/legível | tenants |
| owner_email | email | sim | email válido | org_members/users |
| slug | text | sim | slug único | tenants |
| country | text | opcional | ISO ou nome | tenant metadata |
| plan | select | sim | starter/professional/enterprise ou tiers existentes | tenants/billing |
| status | select | sim | active/trial/past_due/pending/suspended/cancelled | tenants/billing |

Regra obrigatória: edição real deve persistir em API e audit log.

### 5.4 Plano SaaS

Campos: nome, tier, preço mensal, preço anual, max usuários, max artistas, storage GB, features, active, Stripe product id, Stripe price id.

Validações: preço >= 0, limites >= 0 ou ilimitado, tier válido, stripe ids quando billing ativo.

### 5.5 Contrato

Campos: título, partes, artista/cliente, template, valor, datas, status, anexos, signatários.

Validações: partes obrigatórias, datas coerentes, signatário com email válido, template existente.

### 5.6 Obra/Fonograma

Campos: título, artista, autores, ISRC/ISWC quando aplicável, gênero, idioma, status, shares, titulares.

Validações: shares somam 100 quando regra exigir, identificadores únicos por tenant, artista existente.

### 5.7 Transação/Invoice Operacional

Campos: tipo, valor, moeda, data, categoria, cliente, status, descrição, anexo.

Validações: valor positivo, categoria válida, data válida, permissão financial para mutação.

### 5.8 Marketing/Campanha

Campos: nome, objetivo, canal, período, orçamento, responsáveis, tarefas, assets, status.

Validações: datas coerentes, canal permitido, orçamento >= 0.

## 6. Fluxos Completos

### Cadastro Público

1. Usuário abre `/cadastro/:orgSlug`.
2. Frontend chama GET público de workspace.
3. API valida slug, ativo, allow_public_registration, não bloqueado, não deletado.
4. Frontend exibe nome/logo do workspace.
5. Artista preenche formulário.
6. Frontend valida campos.
7. API valida novamente, sanitiza e aplica rate limit.
8. Sistema cria lead/artista vinculado ao tenant.
9. Sistema incrementa conversão.
10. Sistema gera audit/activity e notifica responsáveis.

### Login

1. Usuário informa email/senha.
2. Supabase autentica.
3. Frontend recebe sessão.
4. API `/auth/context` resolve tenant/membership.
5. Frontend carrega features/billing.
6. Se onboarding incompleto, redireciona `/onboarding`.
7. Se completo, dashboard.

### Onboarding

1. Usuário autenticado sem onboarding completo acessa `/onboarding`.
2. Preenche dados iniciais de workspace.
3. API provisiona tenant/organization/membership.
4. Sistema marca onboarding concluído.
5. Redireciona dashboard.

### Criação De Artista

1. Usuário autorizado abre Artistas.
2. Clica criar.
3. Preenche formulário.
4. Frontend valida.
5. API valida tenant/RBAC.
6. Persistência em `artists`.
7. Emite `artist.created`.
8. Audit log registra ação.

### Contrato

1. Usuário escolhe template ou cria contrato.
2. Preenche partes e cláusulas.
3. Salva rascunho.
4. Envia para assinatura.
5. Provider externo retorna webhook.
6. Sistema valida assinatura webhook.
7. Atualiza status.
8. Notifica responsáveis.

### Lançamento

1. Usuário cria release.
2. Vincula obras/fonogramas.
3. Valida metadata mínima.
4. Aprova release.
5. Envia para integração de distribuição quando habilitada.
6. Recebe status.
7. Atualiza release e emite eventos.

### Marketing

1. Usuário cria briefing/projeto.
2. Sistema cria tarefas/campanha.
3. Usuários adicionam assets.
4. Aprovação ocorre.
5. Publicação/sync externo quando habilitado.
6. Métricas retornam para dashboard.

### CRM

1. Lead entra manual ou público.
2. Usuário registra interações.
3. Lead avança pipeline.
4. Usuário converte lead em artista/cliente.
5. Histórico é preservado.

### Financeiro

1. Usuário financial cria transação.
2. Escolhe categoria.
3. Regras podem sugerir/aplicar categoria.
4. Invoice operacional pode ser gerada.
5. Relatórios financeiros consomem dados.

### Billing

1. Tenant escolhe/ajusta plano.
2. Checkout/portal Stripe.
3. Stripe envia webhook.
4. API valida assinatura.
5. API registra `payment_events`.
6. API atualiza subscription/invoice/state.
7. Guard aplica active/grace/read_only/suspended.
8. Frontend exibe banner ou bloqueio.

### Upload

1. Usuário escolhe arquivo.
2. Frontend solicita presign.
3. API valida tenant, permissão, MIME, tamanho e quota.
4. API cria metadata pending.
5. Browser envia arquivo ao R2.
6. Frontend confirma.
7. API verifica existência e marca confirmed.
8. Emite `asset.uploaded`.

### Relatórios

1. Usuário acessa relatórios.
2. Escolhe entidade/relatório.
3. Aplica filtros.
4. Exporta ou importa.
5. API valida permissão.
6. Export pequeno responde direto; export grande deve virar job.
7. Audit log registra.

## 7. Matriz De Permissões

Legenda: R visualizar, C criar, U editar, D excluir, E exportar, A aprovar.

| Módulo | super_admin | owner | admin | manager | editor | viewer | financial | marketing | artist |
|---|---|---|---|---|---|---|---|---|---|
| Admin SaaS | RCUDEA | - | - | - | - | - | - | - | - |
| Auth/Users | RCUDEA | RCUDEA | RCU | R | - | - | - | - | perfil próprio |
| RBAC | RCUDEA | RCUDEA | RCU | R | - | R | - | - | - |
| Billing Tenant | RCUDEA | RCU | R | R | - | - | R | - | - |
| Artistas | RCUDEA | RCUDEA | RCUDEA | RCUE | RCU | R | R | R | próprio R |
| Catálogo | RCUDEA | RCUDEA | RCUDEA | RCUE | RCU | R | R | R | próprio R |
| Contratos | RCUDEA | RCUDEA | RCUDEA | RCUEA | RCU | R | R | R | próprio R |
| CRM/Leads | RCUDEA | RCUDEA | RCUDEA | RCUE | RCU | R | R | R | - |
| Financeiro | RCUDEA | RCUDEA | RCUDEA | RCUE | R | R | RCUDEA | R | - |
| Marketing | RCUDEA | RCUDEA | RCUDEA | RCUEA | RCU | R | R | RCUDEA | - |
| Lançamentos | RCUDEA | RCUDEA | RCUDEA | RCUEA | RCU | R | R | RCU | próprio R |
| Monitoramento | RCUDEA | RCUDEA | RCUDEA | RCUE | RCU | R | R | R | R |
| Registry | RCUDEA | RCUDEA | RCUDEA | RCUEA | RCU | R | R | R | - |
| Storage/Assets | RCUDEA | RCUDEA | RCUDEA | RCUE | RCU | R | R | RCU | próprio R |
| Relatórios | RCUDEA | RCUDEA | RCUDEA | RE | RE | R | RE financeiro | RE marketing | próprio R |
| Suporte | RCUDEA | RCU | RCU | RCU | C/R próprio | C/R próprio | C/R próprio | C/R próprio | C/R próprio |
| Observabilidade | R | - | - | - | - | - | - | - | - |

Regra obrigatória: matriz final deve ser persistida em RBAC, não hardcoded como única fonte.

## 8. Feature Gates

| Feature | Módulo | Plano | Limite | Bloqueio |
|---|---|---|---|---|
| moduleArtists | Artistas | Starter | plano | esconder menu/criação conforme limite |
| moduleCatalog | Catálogo | Starter | plano | esconder/readonly |
| moduleContracts | Contratos | Starter | contratos limitados | bloquear criação ao atingir limite |
| moduleCrm | CRM | Starter | plano | esconder recursos avançados |
| moduleMarketing | Marketing | Professional | plano | esconder menu |
| moduleAccounting | Financeiro | Professional | plano | esconder menu |
| moduleMonitoring | Monitoramento | Professional | plano | esconder menu |
| moduleRh | RH | Professional | plano | esconder menu |
| moduleEvents | Agenda/Eventos | Professional | plano | esconder menu |
| moduleInventory | Inventário | Professional | plano | esconder menu |
| moduleLicensing | Licenciamento | Enterprise | plano | esconder menu |
| aiFeatures | AI/Skills | Enterprise | budget mensal | bloquear geração e mostrar upgrade |
| analyticsAdvanced | Analytics | Enterprise | plano | esconder métricas avançadas |
| multiTenantAdmin | Admin avançado | Enterprise interno | sistema | super admin only |
| storageGb | Storage | por plano | GB | bloquear presign |
| users | Usuários | por plano | número usuários | bloquear convite |
| artists | Artistas | por plano | número artistas | bloquear criação |

## 9. Billing Funcional

### Starter

- Funcionalidades: artistas, catálogo, contratos, CRM básico, suporte.
- Limites encontrados no backend: 5 artistas, 20 contratos, 5GB storage, 3 usuários, US$2 AI mensal.
- Integrações: mínimas; sem monitoring/analytics avançado.
- Suporte: padrão.

### Professional

- Funcionalidades: Starter + marketing, financeiro, monitoramento, RH, eventos, inventário.
- Limites encontrados: 50 artistas, 200 contratos, 50GB storage, 15 usuários, US$20 AI mensal.
- Integrações: marketing/monitoring selecionadas.
- Suporte: prioritário recomendado.

### Enterprise

- Funcionalidades: todos os módulos, AI, licensing, analytics advanced, admin avançado.
- Limites encontrados: ilimitado para artistas, contratos, storage, usuários e AI conforme contrato.
- Integrações: completas conforme credenciais.
- Suporte: enterprise com SLA.

Regras:

- `payment_grace`: banner global e prazo.
- `read_only`: permite GET/HEAD/OPTIONS e bloqueia mutações.
- `suspended`: bloqueia módulos operacionais e redireciona para billing blocked.
- Pagamento confirmado reativa automaticamente.

## 10. Storage Funcional

- **Upload:** presigned PUT para R2; backend não recebe arquivo.
- **Download:** URL temporária com expiração.
- **Versionamento:** assets e asset_versions para ativos gerenciados.
- **Limites:** por plano e tenant.
- **Retenção:** recomendada por categoria.
- **Exclusão:** soft delete em metadata; objeto físico conforme política.
- **Auditoria:** presign, confirm, download, delete, link.
- **Regra obrigatória:** prefixo de storage deve conter tenant/environment.

## 11. Notificações

| Evento | Canal | Gatilho | Destinatários | Template | Prioridade |
|---|---|---|---|---|---|
| user.invited | email | convite criado | usuário convidado | convite | alta |
| lead.created | in-app/email | cadastro público/manual | managers/admins | novo lead | média |
| lead.converted | in-app | conversão | responsáveis | lead convertido | média |
| artist.created | in-app | artista criado | equipe A&R | artista criado | baixa |
| contract.sent_for_signature | email/in-app | envio assinatura | signatários/responsáveis | assinatura pendente | alta |
| contract.signed | in-app/email | webhook assinatura | responsáveis | contrato assinado | alta |
| invoice.overdue | email/in-app | vencimento | financial/owner | invoice vencida | alta |
| billing.grace_started | email/banner | pagamento falhou | owner/admin/financial | pagamento pendente | crítica |
| billing.read_only | email/banner | grace expirou | owner/admin/financial | somente leitura | crítica |
| tenant.suspended | email/banner | suspensão | owner/admin/super_admin | tenant suspenso | crítica |
| asset.uploaded | in-app | upload confirmado | responsáveis | asset disponível | baixa |
| support.ticket.created | in-app/email | ticket criado | suporte/admin | novo ticket | média |
| ticket.resolved | in-app/email | ticket resolvido | solicitante | ticket resolvido | média |
| export.ready | in-app/email | export async pronto | solicitante | export pronto | baixa |

Push: não encontrado no blueprint; regra opcional futura.

## 12. Relatórios

| Relatório | Objetivo | Filtros | Exportação | Permissões | Periodicidade |
|---|---|---|---|---|---|
| Artistas | acompanhar base | status, período, origem | CSV/XLSX/PDF conforme módulo | artist:read/export | sob demanda |
| Catálogo | obras/fonogramas | artista, status, gênero | CSV/XLSX | catalog:export | sob demanda |
| Contratos | jurídico | status, vencimento, artista | PDF/CSV | contracts:export | semanal/sob demanda |
| Financeiro | receitas/despesas | data, categoria, status | CSV/XLSX/PDF | accounting:export | mensal |
| Billing SaaS | MRR/inadimplência | plano, status, período | CSV | super_admin | diário/mensal |
| Marketing | campanhas | canal, período, status | CSV/PDF | marketing:export | campanha/mensal |
| CRM | pipeline/conversão | origem, estágio, período | CSV | crm/leads export | semanal |
| Monitoramento | detecções/takedowns | status, risco, período | CSV/PDF | monitoring:export | sob demanda |
| Audit | rastreabilidade | usuário, tenant, ação, data | CSV | audit:read/export | sob demanda |
| Storage | uso | tenant, categoria, período | CSV | storage:export/admin | mensal |

## 13. Dashboards

### Dashboard Tenant

- Widgets: resumo operacional, artistas, contratos, financeiro, campanhas, atividades.
- KPIs: artistas ativos, contratos pendentes, tarefas, leads, receita.
- Filtros: período, módulo quando aplicável.
- Ações rápidas: criar artista, contrato, lead, campanha.

### Dashboard Super Admin

- Widgets: tenants, MRR, trials, inadimplentes, tickets, health.
- KPIs: MRR, ARR, churn, tenants ativos, tickets abertos, erro API.
- Filtros: período, plano, status.
- Ações rápidas: abrir cliente, assinatura, suporte, auditoria.

### Billing Dashboard

- Widgets: plano atual, invoices, status financeiro, dias restantes.
- KPIs: amount due, next payment, grace days, status.
- Ações: pagar, portal Stripe, suporte.

### Observabilidade Dashboard

- Widgets: API latency, 5xx, DB, Redis, queues, webhooks.
- KPIs: p95, error rate, queue failures, webhook failures.
- Ações: abrir runbook, ver logs, incident response.

## 14. Auditoria

Deve ser auditado:

- login/logout e falhas relevantes;
- convite/criação/alteração/desativação de usuário;
- mudanças de roles/permissões;
- criação/edição/exclusão de recursos de domínio;
- ações super admin;
- billing webhook, override, suspensão e reativação;
- export/import de relatórios;
- uploads/downloads/exclusões;
- integração conectada/desconectada/webhook recebido;
- alterações de configurações.

Campos mínimos:

- tenant_id;
- user_id;
- ip;
- user agent;
- ação;
- entidade;
- entity_id;
- before;
- after;
- resultado;
- motivo;
- timestamp;
- correlation_id.

Regra obrigatória: audit log deve ser append-only.

## 15. UX/UI

- Design system: Tailwind + Radix + componentes `shared/ui`.
- Padrões: cards até 8px quando aplicável ao design system, botões com ícones, tabelas densas para operação.
- Estados obrigatórios: loading, empty, error, success, disabled/bloqueado por permissão, read-only billing.
- Feedbacks: toast para ação concluída/falha; banners globais para billing.
- Empty states: explicar próximo passo sem simular dados falsos.
- Erros: mensagem clara e acionável.
- Responsividade: desktop completo, tablet adaptativo, mobile sem overflow horizontal.
- Acessibilidade: labels, aria-label em ícones, foco visível, contraste, teclado.
- Regra obrigatória: textos técnicos internos como enums não devem vazar para usuários.

## 16. Testes Funcionais

### Auth

- Positivo: login válido, reset, onboarding.
- Negativo: senha inválida, token expirado.
- Permissão: rota protegida sem JWT bloqueada.
- Multi-tenant: usuário sem membership bloqueado.

### Admin SaaS

- Positivo: listar/editar tenant real.
- Negativo: API falha exibe erro.
- Permissão: não-super_admin bloqueado.
- Billing: suspender tenant reflete no backend.

### Billing

- Positivo: invoice paid ativa tenant.
- Negativo: assinatura Stripe inválida rejeitada.
- Multi-tenant: evento vincula tenant correto.
- Integração: webhook duplicado idempotente.

### RBAC

- Positivo: role com permissão acessa.
- Negativo: role sem permissão recebe 403.
- Multi-tenant: role de um tenant não vale em outro.

### Storage

- Positivo: presign, upload, confirm, download.
- Negativo: MIME inválido, quota excedida.
- Multi-tenant: tenant B não baixa arquivo tenant A.
- Billing: read_only bloqueia upload.

### Domínios Operacionais

Para Artistas, Catálogo, Contratos, CRM, Financeiro, Marketing, Releases, Monitoring, Registry, RH, Audiovisual e Support:

- CRUD positivo.
- Validação negativa.
- Permissão negada.
- Tenant isolation.
- Audit log.
- Empty/loading/error UI.

### Relatórios

- Export autorizado.
- Export sem permissão bloqueado.
- Import validate detecta erro.
- Dataset grande vira job quando implementado.

### Integrações

- Configure/status/disconnect.
- Webhook inválido rejeitado.
- Retry em falha temporária.
- DLQ em falha permanente.

## 17. Critérios De Aceite

Critérios globais:

- O fluxo completo funciona no frontend e backend.
- Toda mutação exige permissão.
- Toda mutação crítica audita.
- Todo dado tenant-scoped respeita tenant_id/RLS.
- Billing suspended/read_only bloqueia backend.
- Empty/loading/error states existem.
- Typecheck, build e testes obrigatórios passam.
- UI responsiva sem overflow crítico.
- Acessibilidade mínima validada.

Critérios por funcionalidade:

- **Login:** usuário válido entra; inválido vê erro; sem sessão não acessa protegido.
- **Cadastro público:** slug resolve workspace; workspace inválido mostra erro; envio cria registro no tenant certo.
- **Admin Clients:** editar salva no banco e audita.
- **Admin Subscriptions:** ação muda `tenant_billing_state` real.
- **Billing webhook:** assinatura inválida falha; duplicado não reprocessa.
- **Upload:** arquivo inválido bloqueia antes do R2.
- **Relatório:** export respeita permissão e registra auditoria.

## 18. Definition Of Done Funcional

Um módulo só pode ser considerado concluído quando:

- fluxo principal funciona de ponta a ponta;
- telas implementam loading, empty, error e success;
- formulários têm validação frontend e backend;
- permissões funcionam para read/create/update/delete/export/approve;
- tenant isolation foi testado;
- billing read_only/suspended foi testado quando módulo tem mutação;
- audit log registra mutações críticas;
- notificações definidas são disparadas ou explicitamente marcadas como não aplicáveis;
- integrações do módulo têm status/erro/retry quando aplicável;
- relatórios/KPIs mínimos estão disponíveis quando aplicável;
- testes positivos, negativos, permissão, multi-tenant e billing passam;
- responsividade foi validada em desktop/tablet/mobile;
- acessibilidade mínima foi validada;
- documentação funcional e técnica do módulo foi atualizada.

