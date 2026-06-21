# AUDITORIA MASTER PRÉ-PRODUÇÃO — MUSIC OS 360

Data da auditoria: 20 de junho de 2026  
Branch auditada: `main` (`6f35aad`)  
Objeto auditado: estado atual do worktree, incluindo alterações não commitadas.

## Veredito executivo

```text
STATUS: REPROVADO
PRODUCAO_APTA: NÃO
```

A candidata não deve ser enviada para produção. Há fundamentos relevantes já
validados — builds isolados, 932 testes, RLS, isolamento entre tenants e
Redis/BullMQ — porém os gates obrigatórios de runtime da API, Storage, RBAC
Shadow e Staging não foram atendidos.

## Evidências objetivas

| Gate | Resultado | Evidência |
|---|---|---|
| API typecheck | OK | `corepack pnpm --filter @music-os-360/api typecheck` |
| Web typecheck | OK | `corepack pnpm --filter @music-os-360/web typecheck` |
| Root typecheck | FALHOU | centenas de erros; configuração raiz inclui API Nest sem as opções corretas e scripts com erros/dependência `axios` ausente |
| API build | COMPILA, ARTEFATO INVÁLIDO | gera `apps/api/dist/apps/api/src/main.js`, mas `npm start` procura `apps/api/dist/main.js` |
| Web build | OK | 4.890 módulos transformados |
| API tests | OK | 67 suites, 572 testes |
| Web tests | OK | 27 arquivos, 360 testes; avisos de acessibilidade/DOM nesting |
| API runtime | FALHOU | bootstrap encerra em `EncryptionService`: `ConfigService` indefinido |
| DB migrations | OK segundo TypeORM | `db:check`: sem migrations pendentes |
| RLS | PARCIAL/OK no escopo existente | políticas presentes nas tabelas encontradas |
| Tenant isolation | OK | SELECT/UPDATE/DELETE cross-tenant = 0; 7/7 testes |
| Supabase verifier | FALHOU | `Invalid URL`; o próprio verificador não completa |
| Signup end-to-end | FALHOU | usuário Supabase é criado, mas provisionamento depende da API indisponível |
| RBAC Shadow | REPROVADO | 35 requests, 12 endpoints, 1 role, 1 tenant; requer 1000+, 5 roles, 3 tenants |
| Redis/BullMQ | OK | ping, worker, retry, failed job e ausência de jobs presos |
| Redis policy | OK | `maxmemory-policy=noeviction` |
| R2 leitura | PARCIAL | `HeadBucket` e `ListObjects` funcionam |
| R2 upload | QUEBRADO | `NoSuchBucket`, HTTP 404 e `SignatureDoesNotMatch` |
| Reports HTTP smoke | NÃO EXECUTÁVEL | API não inicializa |
| Staging | NÃO COMPROVADO | sem evidência executada de API/Web/DNS/SSL/observabilidade em staging |

## Inventário e classificação dos módulos

| Módulo | Status | Observação |
|---|---|---|
| Landing / páginas públicas | PARCIAL | rotas e build existem; cadastro público tem backend, mas não houve smoke HTTP |
| Auth / Signup / Onboarding | QUEBRADO NO RUNTIME | código Supabase, refresh, reset e custom hook existem; E2E bloqueado pela API |
| Multi-tenancy | OK NO BANCO / PARCIAL NO RUNTIME | isolamento RLS comprovado; troca/contexto HTTP não pôde ser validado |
| Usuários / convites | PARCIAL | CRUD e convites existem; runtime indisponível |
| Formatação de nomes | NÃO IMPLEMENTADA | `full_name` é persistido/exibido sem normalização sistemática para Title Case |
| Papéis / permissões | PARCIAL | CRUD, grants, herança, archive, restore e duplicate existem; shadow insuficiente |
| RBAC | REPROVADO | unit tests passam, porém autoridade segue `SHADOW` e amostra de go/no-go é insuficiente |
| Dashboard | PARCIAL | frontend e endpoint existem; smoke HTTP não executável |
| Relatórios | PARCIAL | frontend, export/import e testes existem; smoke HTTP bloqueado |
| Artistas / catálogo / lançamentos | PARCIAL | front/back e testes relevantes existem; sem runtime E2E |
| Contratos | PARCIAL | templates, PDF e Autentique têm código; Clicksign/DocuSign não estão comprovados |
| Audiovisual | PARCIAL | módulos e rotas existem; bundle ainda inclui `audiovisual.mock` |
| Financeiro | PARCIAL | CRUD, categorias, regras, invoices e Stripe têm código; NF-e não comprovada |
| Agenda | PARCIAL | CRUD front/back existe; sem smoke |
| Inventário | PARCIAL | controller e UI existem; sem validação HTTP |
| MusicChat | PARCIAL | conversas, mensagens, notas, anexos e automação existem; canais externos e persistência E2E não comprovados |
| WhatsApp | FORA DO ESCOPO GO-LIVE / NÃO IMPLEMENTADO | enum/UI existem, mas não foi encontrado provider completo de envio, recebimento e webhook |
| CRM | QUEBRADO/PARCIAL | `crm` e `pipelines` canônicos foram removidos; seis tabelas CRM esperadas não existem; leads/contacts substituem apenas parte |
| RH | PARCIAL | rotas e backend existem; sem smoke |
| Marketing | PARCIAL/MOCK | backend avançado existe, mas documentação e bundle confirmam serviço in-memory em fluxos; integrações reais não comprovadas |
| Auditoria | PARCIAL | endpoints e logs existem; painel admin contém fontes estáticas/mock |
| Suporte | PARCIAL | tickets e UI existem; anexos/mensagens E2E não comprovados |
| Painel Admin | MOCK/PARCIAL | várias telas usam dados estáticos e configurações ilustrativas no bundle de produção |
| Configurações | PARCIAL | telas existem; vários controles não demonstram persistência real |
| Notificações | PARCIAL | in-app e email têm código; WhatsApp/webhooks não comprovados |
| Storage / uploads | QUEBRADO | leitura R2 parcial, mas PUT falha; upload é bloqueador |
| Webhooks | PARCIAL | Stripe, Autentique e framework externo existem; matriz completa, retry e idempotência não comprovados em runtime |
| Jobs / filas | OK LOCAL / PARCIAL PROD | BullMQ local passou e Redis está `noeviction`; DLQ operacional não foi comprovada em staging |

## Integrações

| Integração | Classificação | Evidência resumida |
|---|---|---|
| YouTube | PARCIAL | código, UI, endpoints e `YOUTUBE_API_KEY` existem; normalização aceita apenas channel ID/URL canônico; chamada/persistência/renderização E2E não comprovadas |
| Instagram / Meta / Facebook | PARCIAL | OAuth/endpoints/UI existem; credenciais parecem configuradas, sem E2E |
| Spotify | PARCIAL | OAuth, sync e UI existem; sem E2E |
| SoundCloud | PARCIAL | código e UI existem; sem E2E |
| Apple Music | PARCIAL | configuração/UI e consultas existem; sem E2E |
| Deezer | SEM_CREDENCIAL/PARCIAL | endpoints existem; `DEEZER_APP_ID` é placeholder |
| TikTok | PARCIAL | OAuth/Ads e UI existem; sem E2E |
| Stripe | PARCIAL | SDK, billing e webhook existem; valores observados parecem de teste, não produção |
| Resend | PARCIAL | chave/configuração presentes; envio real não comprovado |
| Sentry | PENDÊNCIA DE CONFIGURAÇÃO | variável existe no `.env`, mas runtime iniciado em `apps/api` não a carregou e desativou monitoring |
| R2 | QUEBRADA | leitura parcial; upload falha |
| S3 | FORA DO ESCOPO GO-LIVE | contrato/adaptador existe; operação não comprovada |
| Autentique | PARCIAL | serviço, webhook e testes existem; fluxo externo não comprovado |
| DocuSign | PARCIAL/SEM CREDENCIAL | UI/OAuth e env example existem; credenciais reais não comprovadas |
| Clicksign | PARCIAL | UI existe; backend funcional não comprovado |
| NF-e | PARCIAL/SEM CREDENCIAL | UI/registro existem; emissão real não comprovada |
| ONErpm / DistroKid / SoundOn / MusicPro / SomVibe / Symphonic | FORA DO ESCOPO GO-LIVE | atalhos/UI e feature flags; integrações desabilitadas ou sem backend comprovado |
| ECAD / Abramus / UBC | PARCIAL | Abramus e registry têm código; credenciais Abramus/ECAD são placeholders; UBC sem integração operacional comprovada |
| WhatsApp | FORA DO ESCOPO GO-LIVE | não reprova isoladamente, desde que explicitamente retirado do escopo comercial |

## YouTube — validação obrigatória

```text
Link salvo: PARCIAL
Link normalizado: PARCIAL
API chamada: CÓDIGO EXISTE, RUNTIME NÃO COMPROVADO
API Key existe: SIM
Retorno recebido: NÃO COMPROVADO
Persistência: PARCIAL
Renderização: CÓDIGO E TESTES DE FALLBACK EXISTEM
STATUS: PARCIAL
```

A normalização atual cobre `UC...` e
`youtube.com/channel/UC...`; links por `@handle`, `/c/` e `/user/` não são
normalizados pelo fluxo auditado.

## Segurança

Pontos aprovados:

- `.env` está ignorado pelo Git.
- Service role não foi encontrado no código cliente.
- Produção aborta com `AUTH_DISABLED=true` ou mock habilitado.
- Guards globais de rate limit, JWT, tenant, roles e permissions estão registrados.
- RLS fail-closed e isolamento cross-tenant foram comprovados.
- Webhooks Autentique e Stripe possuem caminhos dedicados.

Riscos:

- A API não inicia, portanto os guards não foram validados em HTTP real.
- `usePlanFeatures` contém `const bypassBilling = true`, inclusive no bundle de produção.
- Painel Admin publica configurações e chaves ilustrativas estáticas, podendo induzir operação falsa.
- RBAC continua em Shadow e sem amostra mínima.
- Storage de escrita está quebrado.

## Responsividade e UX

```text
DESKTOP: NÃO VALIDADO EM RUNTIME
TABLET: NÃO VALIDADO EM RUNTIME
MOBILE: NÃO VALIDADO EM RUNTIME
```

O build Web passa, mas a validação visual real foi impedida pela ausência de API
executável. A suíte registra avisos de acessibilidade:

- `DialogContent` sem `DialogTitle`;
- `<div>` dentro de `<p>`;
- `<button>` dentro de `<button>`.

## Performance e observabilidade

- Build Web contém chunks grandes: `index` ~495 kB, `App` ~464 kB,
  `xlsx` ~429 kB e charts ~383 kB antes de gzip.
- Há code splitting, cache React Query e cache/Redis no backend.
- Não houve teste de carga, N+1 ou profiling SQL.
- Prometheus/Grafana e dashboards estão versionados, mas não comprovados em staging.
- Sentry não iniciou no runtime local auditado.

## Matriz de risco

| Severidade | Categoria | Problema | Bloqueia go-live |
|---|---|---|---|
| CRÍTICO | Código/Infra | API falha no bootstrap por DI de `EncryptionService` | SIM |
| CRÍTICO | Código/DevOps | artefato API é gerado em caminho incompatível com `npm start` | SIM |
| CRÍTICO | Segurança | RBAC Shadow reprovado: 35 requests, 1 role, 1 tenant | SIM |
| CRÍTICO | Infra | R2 não realiza upload (`NoSuchBucket`/assinatura inválida) | SIM |
| ALTO | Produto/Código | CRM canônico/pipeline removido e seis tabelas esperadas ausentes | SIM |
| ALTO | Segurança/Produto | billing/feature gate permanentemente bypassado no frontend | SIM |
| ALTO | QA | `pnpm typecheck` da raiz falha | SIM |
| ALTO | Operação | staging, DNS, SSL, Sentry, Grafana e Prometheus não comprovados | SIM |
| ALTO | Auth | signup/onboarding/contexto/JWT E2E não completam sem API | SIM |
| ALTO | Produto | Marketing e Painel Admin ainda possuem fluxos mock/estáticos no bundle | SIM, se no escopo |
| MÉDIO | Dados | verificador RLS espera nove tabelas ausentes apesar de migrations “sincronizadas” | SIM até reconciliar |
| MÉDIO | UX | nomes de usuários não são capitalizados sistematicamente | NÃO isoladamente |
| MÉDIO | Acessibilidade | dialogs e nesting inválido detectados pela suíte | NÃO isoladamente |
| MÉDIO | Performance | bundles grandes e ausência de teste de carga/N+1 | NÃO isoladamente |
| BAIXO | Tooling | `release:check` depende de `pnpm` no PATH e falha mesmo com Corepack | NÃO isoladamente |

## Entregável solicitado

```text
AUDITORIA_MASTER_PRE_PRODUCAO_MUSIC_OS_360

STATUS: REPROVADO

AUTH: PARCIAL/QUEBRADO NO RUNTIME
MULTI_TENANCY: OK NO BANCO; PARCIAL NO HTTP
USERS: PARCIAL
USERS_NAME_FORMAT: NÃO IMPLEMENTADO DE FORMA SISTEMÁTICA
RBAC: REPROVADO
PAPEIS_PERMISSOES: PARCIAL
DASHBOARD: PARCIAL
RELATORIOS: PARCIAL
MUSICCHAT: PARCIAL
WHATSAPP: FORA_DO_ESCOPO_GO_LIVE / NÃO IMPLEMENTADO
CRM: QUEBRADO/PARCIAL
RH: PARCIAL
MARKETING: PARCIAL/MOCK
CONTRATOS: PARCIAL
FINANCEIRO: PARCIAL
AUDIOVISUAL: PARCIAL/MOCK
INVENTARIO: PARCIAL
SUPORTE: PARCIAL
AUDITORIA: PARCIAL/MOCK
NOTIFICACOES: PARCIAL
STORAGE: QUEBRADO
WEBHOOKS: PARCIAL
JOBS_FILAS: OK LOCAL / PARCIAL PROD
INTEGRACOES: PARCIAL
YOUTUBE: PARCIAL
SEGURANCA: PARCIAL; GATES CRÍTICOS ABERTOS
RESPONSIVIDADE: NÃO VALIDADA EM RUNTIME
PERFORMANCE: PARCIAL
API_TESTS: 572/572 PASSARAM
WEB_TESTS: 360/360 PASSARAM
BUILD: WEB OK; API COMPILA MAS NÃO É INICIALIZÁVEL PELO SCRIPT DE PRODUÇÃO
STAGING: NÃO VALIDADO
RBAC_SHADOW: REPROVADO
PRODUCAO_APTA: NÃO

BLOQUEADORES_CRITICOS:
- API não inicializa por falha de DI.
- Script de produção aponta para artefato inexistente.
- RBAC Shadow abaixo da amostra mínima.
- Upload R2 quebrado.

BLOQUEADORES_ALTOS:
- CRM/schema incompletos.
- Auth/signup E2E não validado.
- Root typecheck falha.
- Staging não comprovado.
- Feature/billing bypass ativo.
- Mocks/estáticos em módulos do escopo.

BLOQUEADORES_MEDIOS:
- Nove tabelas esperadas ausentes.
- Formatação de nomes ausente.
- Acessibilidade e DOM nesting.
- Performance sem carga/profiling.

BLOQUEADORES_BAIXOS:
- Tooling release:check dependente de pnpm global.

PENDENCIAS_CONFIGURACAO:
- Credenciais reais de Deezer, Abramus, ECAD, DocuSign, NF-e e provedores opcionais.
- Corrigir bucket/endpoint/chaves R2.
- Definir ambiente staging e comprovar DNS/SSL/observabilidade.
- Declarar WhatsApp e distribuidoras fora do escopo, se aplicável.

CORRECOES_APLICADAS:
- Nenhuma correção de produto aplicada; auditoria executada em modo preservação.

ARQUIVOS_ALTERADOS:
- docs/AUDITORIA_MASTER_PRE_PRODUCAO_MUSIC_OS_360.md

RECOMENDACAO_FINAL:
NO-GO. Corrigir primeiro runtime/artefato da API e Storage; depois completar
Auth E2E, reconciliar schema/CRM, remover bypasses/mocks de produção, executar
RBAC Shadow com 1000+ requests/5+ roles/3+ tenants e repetir todos os gates em
staging com DNS, SSL e observabilidade ativos.
```
