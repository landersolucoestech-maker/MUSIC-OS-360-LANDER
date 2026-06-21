# AUDITORIA 360° MASTER — MUSIC OS 360

Data: 20 de junho de 2026  
Branch: `main` — commit base `6f35aad`  
Escopo: worktree completo, banco configurado e serviços locais disponíveis.

## Veredito

```text
PRODUCAO_APTA: NÃO
STATUS: NO-GO
```

O sistema possui uma base extensa e vários controles enterprise, mas não pode
ser promovido. Há bloqueadores críticos simultâneos em Código, Infra,
Segurança e Operação.

## Inventário total

As contagens de código excluem `node_modules`, `dist` e artefatos compilados.
“Página” significa arquivo React em diretório `pages`; “componente” significa
arquivo TSX em `components` ou `shared/ui`; endpoints são decorators HTTP
NestJS.

```text
TOTAL_APPS: 2
TOTAL_PACKAGES: 8
TOTAL_MODULOS_FUNCIONAIS_FRONTEND: 24
TOTAL_MODULOS_FUNCIONAIS_BACKEND: 49
TOTAL_NEST_MODULE_FILES: 66
TOTAL_PAGES: 78
TOTAL_COMPONENTS: 225
TOTAL_TSX: 367
TOTAL_MODALS_DIALOGS_DRAWERS: 88
TOTAL_FORMS: 50
TOTAL_HOOKS: 123
TOTAL_STORES/ARQUIVOS_RELACIONADOS: 51
TOTAL_CONTEXTS_PROVIDERS: 35
TOTAL_REACT_QUERY_FILES: 45
TOTAL_ROTAS_FRONTEND_DECLARADAS: 114
TOTAL_CONTROLLERS: 73
TOTAL_ENDPOINTS: 444
TOTAL_SERVICES: 137
TOTAL_REPOSITORIES: 31
TOTAL_ENTITY_FILES: 33
TOTAL_DTO_FILES: 72
TOTAL_GUARDS: 5
TOTAL_INTERCEPTORS: 7
TOTAL_MIDDLEWARES: 2
TOTAL_DECORATORS: 8
TOTAL_PIPES: 1
TOTAL_WORKERS_PROCESSORS: 6 operacionais
TOTAL_SCHEDULERS: 3 famílias
TOTAL_QUEUES_DECLARADAS: 12
TOTAL_JOB_NAMES_CANONICOS: 18
TOTAL_WEBHOOK_CALLBACK_ENDPOINTS: 8
TOTAL_INTEGRACOES_AUDITADAS: 28
TOTAL_MIGRATION_FILES: 71
TOTAL_SEEDS: 6
TOTAL_TEST_FILES_API: 72
TOTAL_TEST_FILES_WEB: 27
TOTAL_TABLES_DATABASE: 138
TOTAL_VIEWS_DATABASE: 0
TOTAL_INDEXES_DATABASE: 593
TOTAL_CONSTRAINTS_DATABASE: 350
TOTAL_FOREIGN_KEYS_DATABASE: 102
TOTAL_TRIGGERS_DATABASE: 4
TOTAL_FUNCTIONS_PUBLIC_DATABASE: 86
TOTAL_RLS_POLICIES: 165
TOTAL_EXTENSIONS: 4
```

Apps:

- `apps/api`: NestJS, TypeORM, PostgreSQL/Supabase, BullMQ, Redis, R2.
- `apps/web`: React, Vite, React Query, Supabase Auth.

Packages:

- `ai-skills`, `auth`, `config`, `observability`, `schemas`, `types`, `ui`,
  `utils`.

Infraestrutura versionada:

- Dockerfiles de API e Web.
- Compose local, observabilidade e teste de produção.
- CI GitHub Actions.
- Prometheus, Grafana e quatro dashboards provisionados.
- Scripts de backup/restore, release, smoke, RLS, tenant, storage, RBAC e
  resiliência.

## Frontend

| Área | Classificação | Evidência |
|---|---|---|
| Rotas e lazy loading | OK estrutural | 114 declarações e code splitting |
| Auth/Login/Signup/Reset | PARCIAL | telas e Supabase existem; E2E não completa |
| Dashboard | PARCIAL | UI e endpoint; sem runtime HTTP |
| Usuários/RBAC | PARCIAL | telas, hooks e backend; nomes sem normalização |
| Artistas/Catálogo/Releases | PARCIAL | UI ampla e testes; sem E2E real |
| CRM | PARCIAL/QUEBRADO | convergido para leads/contacts; pipeline canônico removido |
| Marketing | PARCIAL/MOCK | bundle de produção inclui serviço in-memory |
| Audiovisual | PARCIAL/MOCK | bundle contém `audiovisual.mock` |
| Admin | MOCK/PARCIAL | dados e configurações estáticas no bundle |
| Financeiro | PARCIAL | fluxos e testes fortes; integrações externas não comprovadas |
| MusicChat | PARCIAL | UI extensa; canais e persistência E2E não comprovados |
| Relatórios | PARCIAL | import/export e testes; smoke HTTP bloqueado |
| Suporte | PARCIAL | páginas e backend; anexos/chat E2E não comprovados |
| Responsividade | NÃO VALIDADA | API indisponível impediu inspeção completa em runtime |

Achados frontend:

- `usePlanFeatures` usa `const bypassBilling = true`; todos os módulos e plano
  enterprise são liberados no bundle de produção.
- Autorização de UI é fail-closed em build de produção, mas permissiva em todo
  ambiente Vite dev.
- Testes geram alertas de acessibilidade: dialogs sem título e nesting inválido.
- Chunks relevantes antes de gzip: `index` ~495 kB, `App` ~464 kB, `xlsx`
  ~429 kB e charts ~383 kB.

## Backend

| Camada | Resultado |
|---|---|
| Módulos/controllers/services | EXTENSO |
| Typecheck isolado | OK |
| Build TypeScript | OK, mas artefato não inicializável pelo script |
| Testes | 67 suites e 572 testes aprovados |
| Runtime NestJS | QUEBRADO |
| Guards globais | REGISTRADOS, NÃO VALIDADOS VIA HTTP |
| Filas/processors | OK local |
| Schedulers | PARCIAL |
| Webhooks | PARCIAL |

Falhas críticas:

1. O bootstrap quebra em `EncryptionService`, pois `ConfigService` chega
   indefinido.
2. O build gera `dist/apps/api/src/main.js`, enquanto `npm start` executa
   `dist/main.js`.
3. Sem API executável, health checks, signup, dashboard, relatórios e CRUDs não
   podem ser certificados.

## Database

Inventário real do PostgreSQL:

```text
TABLES: 138
VIEWS: 0
INDEXES: 593
CONSTRAINTS: 350
FOREIGN_KEYS: 102
TRIGGERS: 4
FUNCTIONS_PUBLIC: 86
POLICIES: 165
EXTENSIONS: pg_trgm, pgcrypto, plpgsql, uuid-ossp
```

Integridade validada:

- tabelas sem primary key: 0;
- foreign keys não validadas: 0;
- tenant sem organização: 0;
- membership sem tenant: 0;
- membership sem organização: 0;
- membership sem role: 0;
- slugs de tenant duplicados: 0;
- memberships duplicadas: 0;
- emails duplicados no mesmo tenant: 0.

Estado atual:

```text
organizations: 3
tenants: 3
org_members: 16
roles: 20
permissions: 130
rbac_decision_logs: 35
webhook_events: 0
```

### Bloqueador crítico de RLS

Há 118 tabelas com RLS e 19 sem RLS. Entre as 19, cinco possuem `tenant_id` e
concedem `SELECT`, `INSERT`, `UPDATE` e `DELETE` ao papel `authenticated`:

- `contacts`
- `contact_attachments`
- `contact_contracts`
- `contact_timeline`
- `lead_uploads`

Isso permite acesso direto pela Data API sem isolamento por linha caso essas
tabelas estejam no schema exposto, que é `public`. É bloqueador crítico de
segurança.

As partições `rbac_decision_logs_2026_05` a `2026_08` e
`rbac_decision_logs_default` também não têm RLS próprio. Deve-se validar e
restringir acesso direto às partições.

### Funções privilegiadas

Cinco funções `SECURITY DEFINER` existem no schema público:

- `app_current_tenant_id`
- `private_get_tenant_id`
- `bump_role_inheritance_version`
- `guard_role_inheritance_global_delete`
- `validate_role_inheritance`

`app_current_tenant_id` e `private_get_tenant_id` possuem `EXECUTE` para
`PUBLIC`. Mesmo que retornem apenas contexto, funções privilegiadas devem ser
movidas para schema privado ou ter ACL e `search_path` endurecidos.

### Divergência de schema

O TypeORM informa “sem migrations pendentes”, mas o verificador legado espera
nove tabelas inexistentes (`crm_*`, `campaign_tasks`, `campaign_assets`,
`ai_usage_logs`). Isso demonstra divergência entre o contrato de
provisionamento e a arquitetura/migrations atuais.

## Auth

```text
Login: IMPLEMENTADO, NÃO VALIDADO E2E
Signup: PARCIAL; usuário Supabase criado, provisionamento API falha
Logout: IMPLEMENTADO
Refresh: IMPLEMENTADO
Forgot Password: IMPLEMENTADO
Reset Password: IMPLEMENTADO
Session persistence: IMPLEMENTADA
JWT/JWKS: IMPLEMENTADO E TESTADO UNITARIAMENTE
Custom Token Hook: IMPLEMENTADO
app_metadata.org_id: IMPLEMENTADO, NÃO COMPROVADO E2E NESTA CANDIDATA
STATUS: PARCIAL/QUEBRADO NO RUNTIME
```

## Multi-tenancy

- `organizations`, `tenants` e `org_members` existem.
- Tenant context, guard, resolver e AsyncLocalStorage existem.
- Teste real passou 7/7:
  - SELECT cross-tenant = 0;
  - UPDATE cross-tenant = 0;
  - DELETE cross-tenant = 0;
  - sem contexto = 0 linhas.
- Não há órfãos nas relações principais.
- O resultado global é **REPROVADO** devido às cinco tabelas multi-tenant sem
  RLS.

## Usuários

- CRUD, convites, reenvio/cancelamento, membership e troca de role existem.
- Proteções de último owner e escalada possuem testes.
- `full_name` é salvo e exibido sem uma função canônica de capitalização.
- Exemplo `devyisson lander → Devyisson Lander` não é garantido.

## Papéis, permissões e RBAC

- CRUD de roles, catálogo de permissions, grants, herança, archive, restore,
  duplicate e effective permissions existem.
- Seeds contemplam os perfis esperados.
- Resolver testa dependências, conflitos, ciclos e fail-closed.
- Redis/cache distribuído e logs de decisão existem.
- Autoridade persistida permanece em `SHADOW`.

RBAC Shadow:

```text
requests: 35              REQUERIDO: 1000+
endpoints: 12             REQUERIDO: 10+
roles: 1                  REQUERIDO: 5+
tenants: 1                REQUERIDO: 3+
would_allow: 0
would_deny: 0
cross_tenant: 0
resolver_divergence: 0
VEREDITO: REPROVADO
```

## Comunicação

### MusicChat

Conversas, mensagens, notas, atribuição, transferência, fechamento,
reabertura, anexos e automações têm código. Busca, presença, áudio/PDF/imagem e
persistência completa não foram comprovados via runtime.

### WhatsApp

Tipos, labels, canais e UI existem. Não foi encontrado provider completo com
envio, recebimento, templates, mídia e webhook operacional. Classificação:
`FORA_DO_GO_LIVE`, desde que formalmente excluído do escopo comercial.

### Email

Resend, templates e fila de email existem. Jobs: welcome, password reset,
contract expiry, invite, payment receipt e monitoring alert. Envio externo não
foi comprovado.

### Notificações

In-app e fila existem. Email é parcial. Push, WhatsApp e webhooks de
notificação não estão certificados.

## Módulos de produto

```text
DASHBOARD: PARCIAL
RELATORIOS: PARCIAL
CRM: QUEBRADO/PARCIAL
ARTISTAS: PARCIAL
CATALOGO: PARCIAL
LANCAMENTOS: PARCIAL
CONTRATOS: PARCIAL
FINANCEIRO: PARCIAL
RH: PARCIAL
MARKETING: PARCIAL/MOCK
SUPORTE: PARCIAL
STORAGE: QUEBRADO
```

CRM é especialmente inconsistente: módulos antigos `crm` e `pipelines` foram
removidos, enquanto leads/contacts e relacionamento cobrem apenas parte do
domínio. O banco ainda não possui RLS nas novas tabelas de contatos.

## Storage

- R2: `HeadBucket` e `ListObjects` funcionam.
- PUT por SDK: `NoSuchBucket`.
- PUT presigned: HTTP 404.
- Assinatura completa: `SignatureDoesNotMatch`.
- S3: contratos/adaptadores existem, operação não demonstrada.

```text
STATUS: QUEBRADO
```

## Webhooks

Endpoints encontrados:

- Stripe billing;
- Autentique em duas rotas;
- external-data por provider;
- callbacks Spotify, Instagram, TikTok e Google Ads.

Há persistência em `webhook_events`, idempotência por `external_id`, validação
HMAC/shared secret e marcação processed/failed. Porém:

- existem zero eventos no ambiente;
- retry E2E não foi demonstrado;
- a API não inicia;
- WhatsApp, YouTube e contratos Clicksign/DocuSign não possuem webhook
  operacional comprovado.

## Jobs e filas

Filas declaradas:

```text
emails
notifications
ai-jobs
integrations-sync
streaming-sync
webhooks
exports
imports
billing
uploads-process
marketing-publishing
artist-platform-sync
```

Jobs canônicos: 18. Processors operacionais: email, notifications, AI,
external-data, marketing publishing e artist platform sync.

Schedulers:

- contratos próximos do vencimento;
- invoices vencidas;
- dunning/billing;
- retenção de telemetria RBAC.

Redis/BullMQ local passou ping, worker, retry, falha registrada e ausência de
jobs presos. `maxmemory-policy=noeviction`. Há DLQ lógica
`automation:dlq`, mas não uma política operacional completa de dead-letter para
todas as filas.

## Integrações

Legenda: `S` sim, `P` parcial, `N` não encontrado.

| Integração | Código | UI | Endpoint | Env | Webhook/Job | Status |
|---|---:|---:|---:|---:|---:|---|
| YouTube | S | S | S | S | P | PARCIAL |
| Instagram | S | S | S | S indireto Meta | N | PARCIAL |
| Facebook/Meta | S | S | P | S | N | PARCIAL |
| Spotify | S | S | S | S | Job | PARCIAL |
| SoundCloud | S | S | S | S | N | PARCIAL |
| Deezer | S | S | S | placeholder | N | SEM_CREDENCIAL |
| Apple Music | S | S | S | P | N | PARCIAL |
| TikTok | S | S | S | S | N | PARCIAL |
| ONErpm | UI/contrato | S | N | N | N | FORA_DO_GO_LIVE |
| DistroKid | UI/contrato | S | N | N | N | FORA_DO_GO_LIVE |
| SoundOn | UI/contrato | S | N | N | N | FORA_DO_GO_LIVE |
| SomVibe | UI/contrato | S | N | N | N | FORA_DO_GO_LIVE |
| MusicPro | UI/contrato | S | N | N | N | FORA_DO_GO_LIVE |
| Symphonic | UI/contrato | S | N | N | N | FORA_DO_GO_LIVE |
| ECAD | S | S | P | placeholder | P | SEM_CREDENCIAL/PARCIAL |
| Abramus | S | S | S | placeholder | P | SEM_CREDENCIAL/PARCIAL |
| UBC | UI/contrato | S | N | placeholder | N | SEM_CREDENCIAL |
| Stripe | S | S | S | teste | S | PARCIAL |
| Resend | S | P | indireto | S | Job | PARCIAL |
| Sentry | S | N/A | N/A | S | N/A | PARCIAL |
| Autentique | S | S | S | S | S | PARCIAL |
| DocuSign | P | S | OAuth parcial | não comprovado | N | PARCIAL |
| Clicksign | P/UI | S | N | N | N | PARCIAL |
| R2 | S | S | uploads | S | Job | QUEBRADA |
| S3 | contrato | P | N | N | N | FORA_DO_GO_LIVE |
| NF-e | P/UI | S | N | placeholder | N | SEM_CREDENCIAL/PARCIAL |
| WhatsApp | tipos/UI | S | N | N | N | FORA_DO_GO_LIVE |
| Google Ads | S | S | S | S | callback | PARCIAL |

`SEM_CREDENCIAL` foi tratado como configuração, não bug. Integrações obrigatórias
do go-live ainda precisam de E2E.

## YouTube — causa raiz

```text
link salvo: PARCIAL
normalização: PARCIAL
API: IMPLEMENTADA
persistência: IMPLEMENTADA, NÃO VALIDADA E2E
frontend: IMPLEMENTADO
renderização: IMPLEMENTADA E COM TESTES DE FALLBACK
```

Causa raiz: a normalização aceita somente ID `UC...` e URL
`youtube.com/channel/UC...`. URLs modernas por `@handle`, `/c/` e `/user/` não
são resolvidas. A API key existe, mas a indisponibilidade da API principal
impediu evidência de chamada, persistência e renderização do retorno real.

## Observabilidade

- Sentry: código e DSN existem; o runtime auditado iniciou com monitoring
  desabilitado por carregamento inconsistente de env.
- Prometheus: endpoint e métricas existem.
- Grafana: provisioning e dashboards existem.
- Logs: request/correlation/trace IDs, exception filter e logging interceptor.
- Audit logs e RBAC decision logs existem.
- OpenTelemetry existe em package dedicado.
- Staging não comprovou ingestão, alertas, retenção nem dashboards ativos.

## Segurança

Pontos positivos:

- service role não está no cliente;
- `.env` está ignorado;
- produção proíbe auth bypass e mocks;
- guards globais, CORS allowlist, Helmet, rate limit e body limit existem;
- isolamento RLS passou nas tabelas cobertas;
- testes de último owner, escalada e RBAC fail-closed passam.

Bloqueadores:

- cinco tabelas multi-tenant expostas ao papel `authenticated` sem RLS;
- API indisponível impede certificação HTTP dos guards;
- RBAC Shadow insuficiente;
- storage de escrita quebrado;
- funções `SECURITY DEFINER` no schema público com ACL ampla;
- feature/billing bypass permanente no frontend.

## Responsividade

Desktop, tablet e mobile não foram certificados em runtime. O código possui
breakpoints e layouts responsivos, mas isso não substitui evidência visual.
Status: `NÃO VALIDADO`.

## Performance

- 593 índices e migration específica de performance.
- React Query, Redis, cache e code splitting existem.
- Não há evidência de load test, N+1 profiling, EXPLAIN em queries críticas ou
  limites de payload por endpoint.
- Bundles Web grandes exigem budget e análise de carregamento.
- Status: `PARCIAL`.

## Testes e build

```text
API_TYPECHECK: OK
WEB_TYPECHECK: OK
ROOT_TYPECHECK: FALHOU
API_TESTS: 572/572 PASSARAM
WEB_TESTS: 360/360 PASSARAM
WEB_BUILD: OK
API_BUILD: COMPILA, MAS O ARTEFATO NÃO É INICIALIZÁVEL
ROOT_BUILD: REPROVADO POR DEPENDER DO ARTEFATO/API
```

O teste Web precisou ser executado fora do sandbox por ACL; passou integralmente.
O `release:check` também falha por depender de `pnpm` global, apesar de o projeto
declarar Corepack.

## Staging

```text
API: NÃO
WEB: NÃO COMPROVADO
REDIS: SOMENTE LOCAL
SUPABASE: PARCIAL
GRAFANA: NÃO COMPROVADO
PROMETHEUS: NÃO COMPROVADO
STORAGE: QUEBRADO
SSL: NÃO COMPROVADO
DNS: NÃO COMPROVADO
STATUS: REPROVADO
```

## Gap analysis

Existe, mas incompleto:

- Auth, RBAC, dashboard, relatórios, MusicChat, notificações, contratos,
  financeiro, marketing e integrações.

Existe, mas quebrado:

- bootstrap/runtime API;
- comando de start do artefato compilado;
- upload R2;
- root typecheck;
- isolamento RLS das cinco tabelas de contatos/leads.

Existe, mas não conectado:

- parte dos fluxos Marketing ao backend real;
- Painel Admin a fontes persistentes;
- Clicksign/DocuSign/NF-e/WhatsApp/distribuidoras;
- observabilidade versionada ao staging demonstrável.

Existe, mas não está sendo usado corretamente:

- billing e feature gates, por causa do bypass;
- RBAC persistido, ainda em Shadow;
- scripts release, dependentes de `pnpm` global;
- migrations/schema e verificador de provisionamento, que divergem.

Deveria existir e não existe:

- RLS/policies nas cinco tabelas multi-tenant citadas;
- provider WhatsApp completo, se estiver no escopo;
- DLQ operacional uniforme;
- smoke E2E automatizado de todas as rotas críticas;
- validação visual desktop/tablet/mobile;
- evidência de staging com DNS/SSL/observabilidade.

## Matriz de risco

### Críticos

- Segurança: cinco tabelas multi-tenant com CRUD autenticado e sem RLS.
- Código: API não inicia.
- DevOps: comando de produção da API aponta para arquivo inexistente.
- Infra: upload R2 quebrado.
- Segurança: RBAC Shadow reprovado.

### Altos

- Produto: CRM/pipeline e schema inconsistentes.
- Auth: signup/onboarding/JWT/contexto não certificados E2E.
- QA: root typecheck falha.
- Operação: staging não demonstrado.
- Produto/Segurança: billing bypass ativo.
- Produto: mocks/estáticos em módulos de produção.
- Banco: funções privilegiadas em schema exposto com ACL ampla.

### Médios

- Divergência entre migrations e verificador de provisionamento.
- Formatação de nomes ausente.
- Acessibilidade e DOM nesting.
- Bundles grandes e ausência de load test.
- Webhooks sem histórico real/retry comprovado.

### Baixos

- Release tooling exige `pnpm` global.
- Avisos de futura migração React Router.

## Go / No-Go por domínio

```text
GO_NO_GO_CODIGO: NO-GO
GO_NO_GO_INFRA: NO-GO
GO_NO_GO_OPERACAO: NO-GO
GO_NO_GO_SEGURANCA: NO-GO
GO_NO_GO_PRODUTO: NO-GO
```

## Entregável final

```text
AUDITORIA_360_MASTER_MUSIC_OS_360

INVENTARIO_TOTAL: CONCLUÍDO
FRONTEND: PARCIAL
BACKEND: QUEBRADO NO RUNTIME
DATABASE: REPROVADO POR RLS
AUTH: PARCIAL/QUEBRADO
MULTI_TENANCY: REPROVADO GLOBALMENTE
USERS: PARCIAL
RBAC: REPROVADO
PAPEIS_PERMISSOES: PARCIAL
DASHBOARD: PARCIAL
RELATORIOS: PARCIAL
COMUNICACAO: PARCIAL
MUSICCHAT: PARCIAL
WHATSAPP: FORA_DO_GO_LIVE
EMAIL: PARCIAL
NOTIFICACOES: PARCIAL
CRM: QUEBRADO/PARCIAL
ARTISTAS: PARCIAL
CATALOGO: PARCIAL
LANCAMENTOS: PARCIAL
CONTRATOS: PARCIAL
FINANCEIRO: PARCIAL
RH: PARCIAL
MARKETING: PARCIAL/MOCK
SUPORTE: PARCIAL
STORAGE: QUEBRADO
WEBHOOKS: PARCIAL
JOBS_FILAS: OK LOCAL/PARCIAL PRODUÇÃO
INTEGRACOES: PARCIAL
YOUTUBE: PARCIAL
OBSERVABILIDADE: PARCIAL/NÃO COMPROVADA EM STAGING
SEGURANCA: REPROVADA
RESPONSIVIDADE: NÃO VALIDADA
PERFORMANCE: PARCIAL
API_TESTS: 572 PASSARAM
WEB_TESTS: 360 PASSARAM
BUILD: WEB OK; API ARTEFATO INVÁLIDO
STAGING: REPROVADO
RBAC_SHADOW: REPROVADO
GAP_ANALYSIS: CONCLUÍDO

RISCOS_CRITICOS:
- RLS ausente em cinco tabelas multi-tenant expostas.
- API não inicializa.
- Artefato API não inicia.
- R2 upload quebrado.
- RBAC Shadow insuficiente.

RISCOS_ALTOS:
- Auth E2E ausente.
- CRM/schema inconsistente.
- Root typecheck falha.
- Staging ausente.
- Billing bypass.
- Mocks de produção.
- SECURITY DEFINER no schema público.

RISCOS_MEDIOS:
- Verificador/migrations divergentes.
- Nomes sem capitalização.
- Acessibilidade.
- Performance sem carga.
- Webhooks sem operação comprovada.

RISCOS_BAIXOS:
- Tooling pnpm/Corepack.
- Warnings React Router.

PENDENCIAS_CONFIGURACAO:
- Credenciais opcionais Deezer, Abramus, ECAD, UBC, DocuSign, NF-e.
- Corrigir bucket/endpoint/chaves R2.
- Configurar e provar staging, DNS, SSL, Sentry, Prometheus e Grafana.
- Formalizar integrações fora do go-live.

BLOQUEADORES_PRODUCAO:
- Todos os riscos críticos e altos acima.

GO_NO_GO_CODIGO: NO-GO
GO_NO_GO_INFRA: NO-GO
GO_NO_GO_OPERACAO: NO-GO
GO_NO_GO_SEGURANCA: NO-GO
GO_NO_GO_PRODUTO: NO-GO
PRODUCAO_APTA: NÃO

RECOMENDACAO_FINAL:
1. Corrigir imediatamente RLS/ACL nas tabelas de contatos e lead_uploads.
2. Corrigir DI e artefato/start da API.
3. Corrigir R2 e executar upload/download/signed URL E2E.
4. Remover billing bypass e mocks do escopo de produção.
5. Reconciliar migrations, CRM e verificador de provisionamento.
6. Completar Auth E2E e smokes HTTP.
7. Executar RBAC Shadow com 1000+ requests, 5+ roles e 3+ tenants.
8. Repetir toda a auditoria em staging com DNS, SSL e observabilidade ativos.
```
