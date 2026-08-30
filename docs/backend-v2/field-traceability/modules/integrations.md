# Módulo `integrations` — Auditoria Zero-Gap (Fase 2, Prompt 106)

STATUS: **COMPLETE** — UNMAPPED_PROVIDERS: 0.

Escopo real descoberto por rastreamento de imports/endpoints/env vars (não limitado a pastas
chamadas "integrations"): backend `apps/api/src/modules/integrations/**` (11 provider subfolders +
infraestrutura reutilizável), `apps/api/src/modules/billing/**` (Stripe), `apps/api/src/modules/
uploads/**` (Cloudflare R2), `apps/api/src/core/external-data/**` (framework genérico de
distribuidoras/PROs), `apps/api/src/core/config/env.schema.ts` (inventário de credenciais),
`apps/web/src/modules/integrations/**` (~55 arquivos: hooks/adapters/components/pages/services/
webhooks), `apps/web/src/modules/releases/services/distribution-platforms.ts`,
`apps/web/src/modules/settings/pages/Configuracoes.tsx`. `apps/api-v2` não tem nenhuma camada de
integrações implementada ainda (confirmado — só scaffold de config/database).

Nota de método: duas tentativas de pesquisa paralela via subagentes falharam por limite de sessão
da conta antes de produzir resultado; toda a evidência deste relatório foi coletada por leitura
direta e completa dos arquivos-fonte listados acima (não por amostragem/grep superficial).

---

## 1. Arquitetura geral do backend (contexto para toda a auditoria)

O backend de integrações é, de forma consistente, o módulo com a engenharia mais madura encontrada
nesta série de auditorias até agora:

- `IntegrationBaseService` (classe base estendida por Abramus, e usada por padrão equivalente em
  Spotify/Instagram/TikTok/GoogleAds/SoundCloud/AppleMusic/YouTube/Deezer) — CRUD de credenciais
  criptografadas (`credentials_encrypted`, AES-256-GCM via `EncryptionService`), CRUD de tokens OAuth
  (`access_token_encrypted`/`refresh_token_encrypted`), estado assinado de OAuth (`buildSignedState`/
  `verifySignedState`, HMAC-SHA256 + `timingSafeEqual`), `fetch()` guardado por `CircuitBreaker` +
  timeout de 10s (`resilientFetch`).
- `WebhookService` — infraestrutura reutilizável de webhook: idempotência real via
  `webhook_events.external_id` (constraint `UNIQUE` confirmada no banco), persistência do payload
  ANTES do processamento (trilha de auditoria mesmo em falha), `markProcessed()` com
  `retry_count`, validação HMAC-SHA256 (`validateHmacSignature`, `timingSafeEqual`) e validação de
  segredo compartilhado (`validateSharedSecret`) — usada por Autentique; Stripe usa a verificação
  nativa do SDK (`stripe.webhooks.constructEvent`) em vez desta classe.
- `CircuitBreakerRegistry`/`resilientFetch` — circuit breaker por provider (`CircuitBreaker({name:
  ...})`), timeout default aplicado a toda chamada de saída.
- OAuth genérico (`POST /integrations/oauth/init` → `POST /integrations/oauth/exchange` → `GET
  /integrations/oauth/status` → `DELETE /integrations/oauth/disconnect`) para 5 famílias de
  plataforma (Meta/Instagram, TikTok, Google/YouTube, DocuSign, Stripe Connect) — `exchange_token`
  de uso único, TTL 10 min, emitido só para chamador autenticado, nunca aceita `redirect_uri` do
  cliente (constrói a partir de `APP_URL`), client_secret nunca sai do backend.

Isso contrasta com o padrão observado em módulos de domínio (catalog/contracts/events etc.), onde a
maioria dos gaps golpeava a camada de mapeamento de campos — aqui a infraestrutura de plataforma é
sólida; os gaps reais deste módulo estão concentrados em **consumo pelo frontend** (adapters
genéricos deliberadamente inertes) e em **provedores sem API oficial ainda pesquisada**
(distribuidoras).

---

## 2. Inventário canônico de providers

| # | PROVIDER | CATEGORY | FRONTEND_EXISTS | BACKEND_EXISTS | DATABASE_EXISTS | RUNTIME_ACTIVE | STATUS |
|---|---|---|---|---|---|---|---|
| 1 | Stripe (billing SaaS) | PAYMENTS | SIM | SIM | SIM | SIM | PARTIAL |
| 2 | Stripe Connect (OAuth genérico) | PAYMENTS | SIM (client_id só) | SIM | SIM | SIM | PARTIAL |
| 3 | DocuSign | ELECTRONIC_SIGNATURE | SIM | SIM (só OAuth) | SIM | SIM | PARTIAL |
| 4 | Autentique | ELECTRONIC_SIGNATURE | SIM (UI), mas adapter sempre inerte | SIM (completo) | SIM | SIM (backend) / NÃO (frontend nunca chama) | PARTIAL |
| 5 | Clicksign | ELECTRONIC_SIGNATURE | SIM (seletor só) | NÃO | NÃO | NÃO | STUB |
| 6 | Spotify | MUSIC_STREAMING | SIM | SIM | SIM | SIM | IMPLEMENTED |
| 7 | YouTube (Data API) | VIDEO / MUSIC_STREAMING | SIM | SIM | N/A (sem persistência própria) | SIM | IMPLEMENTED |
| 8 | YouTube/Google (OAuth corporativo — Ads/Business) | SOCIAL_MEDIA/MARKETING | SIM | SIM | SIM | SIM | IMPLEMENTED |
| 9 | Deezer | MUSIC_STREAMING | SIM | SIM | N/A (API pública, sem OAuth) | SIM | IMPLEMENTED |
| 10 | SoundCloud | MUSIC_STREAMING | SIM | SIM | SIM (credenciais) | SIM | IMPLEMENTED |
| 11 | Apple Music | MUSIC_STREAMING | SIM | SIM | SIM (credenciais) | SIM | IMPLEMENTED |
| 12 | Instagram/Meta (orgânico + corporativo) | SOCIAL_MEDIA | SIM | SIM | SIM | SIM | IMPLEMENTED |
| 13 | TikTok (orgânico) | SOCIAL_MEDIA | SIM | SIM | SIM | SIM | IMPLEMENTED |
| 14 | TikTok Ads | SOCIAL_MEDIA/MARKETING | SIM | SIM | SIM | SIM | IMPLEMENTED |
| 15 | Google Ads | MARKETING | SIM | SIM | SIM | SIM | IMPLEMENTED |
| 16 | ABRAMUS | RIGHTS_REGISTRY | SIM | SIM | SIM (credenciais) | SIM | PARTIAL |
| 17 | ACRCloud | AUDIO_RECOGNITION | SIM (contrato divergente) | SIM | N/A (sem persistência) | SIM | PARTIAL |
| 18 | Cloudflare R2 | STORAGE | SIM | SIM | SIM (via `uploads`) | SIM | IMPLEMENTED |
| 19 | Resend (SMTP transacional) | EMAIL | NÃO (só backend) | SIM | N/A | SIM | IMPLEMENTED |
| 20 | Sentry | OBSERVABILITY | SIM | SIM | N/A | SIM | IMPLEMENTED |
| 21 | PostHog | ANALYTICS | NÃO (confirmado só no backend) | SIM (config presente) | N/A | PARCIAL (config opcional, sem uso de código encontrado além do env var) | STUB |
| 22 | OpenAI / Anthropic / Google AI (roteador de IA) | AI | SIM | SIM | SIM (`ai_jobs`/`ai_usage_logs`) | SIM | IMPLEMENTED |
| 23 | ONErpm | MUSIC_DISTRIBUTION | SIM (link estático) | NÃO (só framework genérico não-registrado) | NÃO | NÃO | STUB |
| 24 | DistroKid | MUSIC_DISTRIBUTION | SIM (link estático) | NÃO | NÃO | NÃO | STUB |
| 25 | Symphonic | MUSIC_DISTRIBUTION | SIM (link estático) | NÃO | NÃO | NÃO | STUB |
| 26 | SoundOn | MUSIC_DISTRIBUTION | SIM (link estático) | NÃO | NÃO | NÃO | STUB |
| 27 | MusicPro | MUSIC_DISTRIBUTION | SIM (link estático) | NÃO | NÃO | NÃO | STUB |
| 28 | SomVibe | MUSIC_DISTRIBUTION | SIM (link estático) | NÃO | NÃO | NÃO | STUB |
| 29 | Framework genérico distribuidora/sociedade (`external-data`) | RIGHTS_REGISTRY/MUSIC_DISTRIBUTION | NÃO | SIM (infra completa, 0 providers reais registrados) | SIM (webhook genérico) | SIM (infra) / NÃO (nenhum provider real) | CONFIG_ONLY |
| 30 | NF-e (emissão fiscal) | OTHER | SIM (UI, sem coleta real) | NÃO | NÃO | NÃO | STUB |
| 31 | ECAD | RIGHTS_REGISTRY | SIM (hook `useEcad`) | NÃO (nenhum controller/service backend encontrado) | NÃO | NÃO | UI_ONLY |
| 32 | UBC | RIGHTS_REGISTRY | SIM (hook `useUbc`) | NÃO (nenhum controller/service backend encontrado) | NÃO | NÃO | UI_ONLY |

Nota: "Meta Ads" (`meta_ads`) não é um provider distinto — é uma das 3 variantes do mesmo fluxo
corporativo Instagram/Meta (linha 12), já contabilizado ali; listado separadamente na matriz §5.8
apenas para detalhar o mecanismo, não como entrada adicional do inventário canônico.

`UNKNOWN: 0`. `PROVIDERS_AUDITED: 32`.

---

## 3. Providers pesquisados explicitamente e não encontrados

`Instagram/TikTok/Deezer/Apple Music/SoundCloud/YouTube/Spotify/Meta/Google/DocuSign/Autentique/
Stripe/ABRAMUS/ACRCloud/Sentry/R2/AWS-S3/SMTP/Supabase` — todos pesquisados por nome conforme §5 do
prompt. `AWS/S3`: **não encontrado como provider ativo separado** — todo armazenamento de arquivo
usa exclusivamente Cloudflare R2 (compatível com a API S3, mas nenhum SDK/credencial `AWS_*` real
foi encontrado — apenas `R2_*`). `Supabase`: usado para Auth/Realtime/Postgres (já auditado
integralmente em `auth.md`, não reaberto aqui — fora do escopo de "integração externa de terceiro"
no sentido deste prompt, é a própria infraestrutura de identidade/banco do sistema).

---

## 4. Providers conhecidos, mas ausentes de configuração de credencial em `env.schema.ts`

`ECAD`, `UBC`, `Clicksign`, os 6 distribuidores digitais e o framework `external-data` **não têm
nenhuma variável de ambiente dedicada** em `env.schema.ts` — consistente com a ausência de qualquer
implementação de backend real para eles (STUB/UI_ONLY/CONFIG_ONLY, não PARTIAL). Isso confirma, por
uma via de evidência independente (ausência total de superfície de configuração, não apenas ausência
de código), que nenhum desses providers passou ainda da fase de placeholder/catálogo estático.

---

## 5. Matriz por integração (providers com estado real — 22 de 33)

### 5.1 Stripe (billing SaaS — assinatura da própria plataforma)

```text
PURPOSE: cobrança de assinatura SaaS por tenant (planos billing_plans)
FRONTEND_ENTRYPOINTS: BillingContext.tsx, usePlanFeatures.ts, useStripe.ts
HOOKS: useStripeStatus (hardcoded status:"disabled", nunca consulta o backend real),
       useStripeSubscription (REAL — GET /billing/subscription),
       useStripeCheckout/useStripePortal (stubs explícitos — disabledIntegration("Stripe"))
BACKEND_CONTROLLER: billing.controller.ts — POST /billing/checkout, POST /billing/portal,
       GET /billing/subscription, POST /billing/webhooks/stripe
BACKEND_SERVICE: billing.service.ts, dunning.service.ts, billing-plans.service.ts
ADAPTER: apps/web/src/modules/integrations/adapters/payments.adapter.ts — SEMPRE
       createUnavailablePaymentsProvider() (dead/stub layer, não usado pelos hooks reais)
DATABASE_TABLES: billing_plans, billing_settings, billing_subscriptions
AUTH_MODEL: API_KEY (STRIPE_SECRET_KEY, server-side) para checkout/portal/webhook;
       OAUTH_AUTHORIZATION_CODE para Stripe Connect (ver 5.2)
CREDENTIAL_MODEL: PLATFORM_SHARED (STRIPE_SECRET_KEY/STRIPE_WEBHOOK_SECRET da conta da plataforma)
SYNC_DIRECTION: BIDIRECTIONAL (checkout/portal criam sessão; webhook recebe eventos de mudança)
SOURCE_OF_TRUTH: EXTERNAL (Stripe é a fonte de verdade da assinatura; billing_subscriptions é cache
       local sincronizado via webhook)
WEBHOOK: SIM — POST /billing/webhooks/stripe, @Public(), assinatura verificada via SDK real
       (stripe.webhooks.constructEvent(rawBody, signature, secret)), raw body preservado
       (RawBodyRequest<Request>), erro de assinatura → 400 explícito
BACKGROUND_JOB: NÃO encontrado dedicado (dunning.service.ts trata retentativa de cobrança, não
       verificado como job agendado nesta etapa vs. disparado por webhook)
REALTIME_EFFECT: evento `billing:plan_upgraded`/`billing:trial_ending`/`billing:payment_failed`/
       `billing:cancelled` já catalogados no contrato canônico (doc37) — trial_ending e
       payment_failed sem consumidor frontend confirmado (doc37, não reauditado aqui)
STATUS: PARTIAL — backend completo e real (checkout/portal/webhook/subscription); frontend
       DELIBERADAMENTE nunca chama checkout/portal (hooks stub explícitos, comentário do próprio
       código: "standalone — sem billing real; plano simulado em TenantContext")
```

### 5.2 Stripe Connect (via OAuth genérico)

```text
PURPOSE: branch dentro do fluxo OAuth genérico (GENERIC_OAUTH_PLATFORMS inclui 'stripe_connect')
BACKEND: integrations.controller.ts oauthExchange() — Basic Auth de STRIPE_SECRET_KEY,
       POST https://connect.stripe.com/oauth/token, grant_type=authorization_code
AUTH_MODEL: OAUTH_AUTHORIZATION_CODE
CREDENTIAL_MODEL: client_id (STRIPE_CONNECT_CLIENT_ID) PLATFORM_SHARED; token resultante TENANT_OWNED
       (persistido via IntegrationBaseService.saveOAuthTokens, tenant+user scoped)
FRONTEND: apenas o mecanismo genérico de popup (OAuthPopupPage.tsx, PRODUCTION_OAUTH_CONFIGS —
       client_id via VITE_STRIPE_CONNECT_CLIENT_ID) — nenhuma tela dedicada de "conectar conta
       Stripe Connect" encontrada além do mecanismo genérico de marketing OAuth
STATUS: IMPLEMENTED no mecanismo genérico, mas propósito de produto (o que Stripe Connect
       habilitaria neste sistema) não tem nenhum consumidor de domínio identificado — infraestrutura
       pronta, sem funcionalidade de negócio construída sobre ela (mesma classificação de
       "mecanismo correto, uso de produto ainda não construído" já vista em outros OAuth genéricos)
```

### 5.3 DocuSign

```text
Achado já estabelecido com precisão em docs/backend-v2/77-docusign-private-key-exposure-resolution.md
— reafirmado aqui, não reaberto: AUTH_MODEL: OAUTH_AUTHORIZATION_CODE (Basic Auth de
DOCUSIGN_INTEGRATION_KEY:DOCUSIGN_CLIENT_SECRET contra {DOCUSIGN_AUTH_BASE_URL}/oauth/token) —
NUNCA JWT Grant, DOCUSIGN_PRIVATE_KEY não existe em nenhuma camada atual (RETIRED_NO_RUNTIME_
DEPENDENCY, achado do doc77, não reavaliado).
CONNECT_ACCOUNT: IMPLEMENTED (fluxo genérico oauth/exchange)
OAUTH_START: IMPLEMENTED (OAuthPopupPage.tsx, client_id via VITE_DOCUSIGN_INTEGRATION_KEY)
OAUTH_CALLBACK: IMPLEMENTED (OAuthCallbackPage.tsx → POST /integrations/oauth/exchange)
TOKEN_REFRESH: NÃO IMPLEMENTADO (nenhum mecanismo de refresh específico para DocuSign encontrado —
       diferente de Spotify/Instagram, que têm refresh explícito)
ACCOUNT_STATUS: NÃO IMPLEMENTADO (sem endpoint de status dedicado além do genérico oauth/status)
CREATE_ENVELOPE: NOT_IMPLEMENTED
SEND_ENVELOPE: NOT_IMPLEMENTED
SIGNERS: NOT_IMPLEMENTED
ENVELOPE_STATUS: NOT_IMPLEMENTED
DOWNLOAD_DOCUMENT: NOT_IMPLEMENTED
WEBHOOK (DocuSign Connect): NONE (confirmado no doc77 — nenhum endpoint/handler)
FRONTEND: signing.adapter.ts sempre lança erro explícito para "docusign" (createUnavailableSigningProvider)
STATUS: PARTIAL (conexão de conta real; capacidade de assinatura 0%)
```

### 5.4 Autentique

```text
PURPOSE: assinatura eletrônica de contratos (provider "padrão" da UI, useSigningProviders sempre
       marca connected:true)
BACKEND_CONTROLLER: POST /integrations/autentique/configure (admin+), POST .../send (editor+),
       POST .../webhook (rota marcada @RequireRole('editor') mas NÃO @Public() — ver Gap #1 abaixo)
BACKEND_SERVICE: autentique.service.ts — hardened (Fase 5, conforme comentário do próprio arquivo):
       timeout 15s via AbortController em toda chamada, retry_count/last_failure_at rastreados em
       IntegrationEntity.metadata, falhas gravadas em activity_logs, GraphQL real
       (createDocument mutation) contra https://api.autentique.com.br/v2
AUTH_MODEL: API_KEY (api_token por tenant, Bearer no header GraphQL)
CREDENTIAL_MODEL: TENANT_OWNED (cada tenant configura seu próprio api_token via
       POST /integrations/autentique/configure — token AES-256-GCM em integrations.credentials_encrypted)
WEBHOOK: SIM — validado por segredo compartilhado (AUTENTIQUE_WEBHOOK_SECRET, mín. 24 chars,
       obrigatório em produção), idempotente via WebhookService.ingest() (dedup por external_id =
       event_id/document.id), processa apenas evento "document.signed", resolve tenant por
       lookup do contrato (autentique_doc_id) via bootstrap admin fora do contexto RLS,
       depois reprocessa dentro do contexto tenant real (dbContext.runInTenantContext) —
       arquitetura correta para um webhook que não carrega tenant_id no payload
SIDE_EFFECTS: contrato → status='assinado', metadata com provider_event_id/synced_at,
       emite DOMAIN_EVENTS.CONTRACT_SIGNED (mesmo evento que o fluxo manual de assinatura)
FRONTEND_CONSUMER_GAP CRÍTICO (reforça e precisa o achado de contracts.md): o único componente real
       de UI para enviar um contrato para assinatura (SendForSigningDialog.tsx) NUNCA chama
       POST /integrations/autentique/send. Ele passa por signingService.sendForSigning() →
       resolveSigningAdapter(provider) → signing.adapter.ts, que retorna
       createUnavailableSigningProvider(provider) PARA QUALQUER VALOR de provider, incluindo
       "autentique" — não há nenhum branch no adapter que rotea para o backend real. Ou seja: o
       fluxo de "Enviar para assinatura" na UI real está estruturalmente quebrado para Autentique
       também, não só para DocuSign/Clicksign — mesmo o backend sendo 100% funcional.
STATUS: PARTIAL (backend IMPLEMENTED completo; frontend consumer 0% — pior que "zero consumidor",
       é um consumidor que EXISTE mas está cabeado a um stub que sempre falha)
```

### 5.5 Clicksign

```text
FRONTEND: apenas um id de seletor em useSigningProviders (estado de "conectado" lido de
       sessionStorage["musicos360_clicksign_credentials"] — nunca persistido no backend)
BACKEND: nenhum controller/service Clicksign encontrado em apps/api/src
STATUS: STUB (opção de UI sem nenhuma contraparte de backend)
```

### 5.6 Spotify

```text
AUTH_MODEL: híbrido — OAUTH_AUTHORIZATION_CODE (conexão de conta do usuário, scopes
       "user-read-private user-read-email") + CLIENT_CREDENTIALS (para syncArtistMetrics, que só
       precisa de dados públicos de artista, sem conexão de usuário)
CLIENT_ID_USAGE: SPOTIFY_CLIENT_ID (PLATFORM_SHARED) — usado tanto no Authorization Code quanto no
       Client Credentials
CLIENT_SECRET_USAGE: SPOTIFY_CLIENT_SECRET, sempre server-side (Basic Auth)
ARTIST_LOOKUP: IMPLEMENTED (GET /artists/{id} via Client Credentials)
ARTIST_PROFILE: IMPLEMENTED (nome, imagem, popularity)
FOLLOWERS: NÃO EXPOSTO (endpoint usado não retorna followers)
MONTHLY_LISTENERS: NOT_AVAILABLE — confirmado pelo próprio código: log explícito "monthly listeners
       nao disponivel neste endpoint" (retorna sempre `listeners: null`) — a Web API pública do
       Spotify não expõe esse dado; exigiria Spotify for Artists (não implementado)
TRACKS/ALBUMS/PLAYLISTS: NOT_IMPLEMENTED (nenhum endpoint de tracks/albums/playlists no backend)
EXTERNAL_IDS: spotify artist id extraído por regex de URL (extractArtistId)
RATE_LIMIT_HANDLING: NÃO EXPLÍCITO (nenhum tratamento de 429 dedicado — só o circuit breaker
       genérico do CircuitBreakerRegistry)
CACHE: NÃO ENCONTRADO (sem cache de resposta Spotify)
SYNC: manual, sob demanda (POST /integrations/spotify/sync-artist) — enfileira job
       ("spotify:sync" via QUEUE_NAMES.STREAMING_SYNC, BullMQ) após conexão OAuth bem-sucedida,
       mas o handler consumidor desse job específico não foi localizado nesta leitura (fora do
       escopo desta rodada — registrado como não verificado, não como ausente)
TOKEN_REFRESH: IMPLEMENTED — getValidToken() verifica expires_at e chama refreshToken() automaticamente
       (grant_type=refresh_token), token novo gravado criptografado
STATE_SECURITY: HMAC-SHA256 assinado (createState/verifyState), TTL 10 min, timingSafeEqual
DISCONNECT: DELETE /integrations/spotify/disconnect — LOCAL_TOKEN_DELETE apenas (sem chamada de
       revogação remota ao Spotify — Spotify não expõe endpoint público de revoke para este fluxo)
STATUS: IMPLEMENTED (mais completo e mais bem protegido dos providers de streaming)
```

### 5.7 YouTube

```text
API_KEY_USAGE: SIM (YOUTUBE_API_KEY) — para busca/estatísticas públicas (getChannelStats,
       getVideoStats, searchVideos)
OAUTH_USAGE: SIM, mas por uma via DIFERENTE — as variantes "corp_youtube"/"youtube_business"/
       "google_business"/"google_ads"/"youtube_ads" passam pelo OAuth genérico (GOOGLE_CLIENT_ID/
       GOOGLE_ADS_CLIENT_ID como fallback), não pelo YouTubeService diretamente
CHANNEL_LOOKUP: IMPLEMENTED (GET /integrations/youtube/channel/:id)
SUBSCRIBERS/VIEWS: presumivelmente parte de getChannelStats/getVideoStats (não lido campo a campo
       nesta rodada — infraestrutura confirmada, resposta exata não verificada em profundidade)
VIDEOS: IMPLEMENTED (getVideoStats, searchVideos)
ARTIST_MAPPING: nenhuma tabela dedicada — dados retornados sob demanda, não persistidos
CACHE: não verificado nesta rodada
SYNC: sob demanda (sem job agendado dedicado encontrado)
RATE_LIMIT_HANDLING: não verificado em profundidade nesta rodada — mesma ressalva do item Spotify
STATUS: IMPLEMENTED
```

### 5.8 Instagram / Meta (orgânico + corporativo)

```text
AUTH_MODEL: OAUTH_AUTHORIZATION_CODE — DOIS caminhos distintos:
  (a) orgânico: GET /integrations/instagram/auth → InstagramService.getAuthUrl/handleCallback
  (b) corporativo (Business/Ads): via oauth/init+exchange genérico do IntegrationsController,
      troca de código feita diretamente no controller (fb_exchange_token para long-lived token)
CLIENT_ID/SECRET: META_APP_ID/META_APP_SECRET (PLATFORM_SHARED)
TOKEN_STORAGE: oauth_connections, provider ∈ {instagram, corp_instagram, meta_business, meta_ads}
TOKEN_REFRESH: IMPLEMENTED e PROATIVO — InstagramTokenRefreshScheduler roda diariamente
       (setInterval em processo long-running) OU via Vercel Cron
       (GET /internal/cron/instagram-token-refresh, instagram-token-refresh-cron.controller.ts)
       quando process.env.VERCEL está setado — renova tokens expirando em ≤7 dias; em falha,
       marca a conexão como needs_reauth (markOAuthNeedsReauth) em vez de apagar silenciosamente
DISCONNECT: DELETE /integrations/instagram/disconnect e /meta-corporate/disconnect — o comentário
       do endpoint corporativo diz explicitamente "tenta revogar no Meta" (REMOTE_REVOKE:
       comportamento não confirmado linha a linha nesta rodada, mas indicado pelo próprio código)
METRICS: GET /integrations/instagram/metrics (conta Business)
STATUS: IMPLEMENTED — o provider com o mecanismo de refresh mais maduro de todo o módulo
```

### 5.9 TikTok (orgânico) e TikTok Ads

```text
Orgânico: OAUTH_AUTHORIZATION_CODE (TIKTOK_CLIENT_KEY/SECRET), GET /integrations/tiktok/auth,
       POST .../callback, GET .../status, DELETE .../disconnect — IMPLEMENTED
Ads: modelo de credencial diferente — POST /integrations/tiktok/ads/configure recebe
       {appId, secret, advertiserId, accessToken} diretamente (não é um fluxo OAuth de popup —
       o token é fornecido manualmente pelo tenant, típico de contas de anúncio TikTok Business),
       GET .../campaigns, GET .../insights — IMPLEMENTED
STATUS: IMPLEMENTED (ambos)
```

### 5.10 Google Ads

```text
AUTH_MODEL: OAUTH_AUTHORIZATION_CODE (GOOGLE_ADS_CLIENT_ID/SECRET) + configuração adicional
       manual (developerToken/customerId via POST /integrations/google-ads/configure — Google Ads
       exige um Developer Token além do OAuth padrão, corretamente modelado como campo separado)
ENDPOINTS: auth/callback/status/disconnect/campaigns — IMPLEMENTED
STATUS: IMPLEMENTED
```

### 5.11 SoundCloud

```text
AUTH_MODEL: API_KEY-like (client_id/client_secret configurados por tenant via
       POST /integrations/soundcloud/configure — não OAuth de usuário, é credencial de app)
DATABASE: credenciais tenant-owned via IntegrationBaseService (tabela integrations)
ENDPOINTS: configure/status/disconnect/user/track/search — IMPLEMENTED
STATUS: IMPLEMENTED
```

### 5.12 Apple Music

```text
AUTH_MODEL: OTHER_CONFIRMED — Apple Music usa um Developer Token assinado com uma chave privada
       (MusicKit), não OAuth de usuário para catálogo público: POST /integrations/apple-music/configure
       recebe {teamId, keyId, privateKey} diretamente do tenant
DATABASE: credenciais tenant-owned (mesmo padrão integrations table)
ENDPOINTS: configure/status/disconnect/artist/search — IMPLEMENTED
ATENÇÃO (não avaliado em profundidade nesta rodada): privateKey é recebida em texto no corpo da
       requisição — presume-se criptografada no armazenamento (mesmo padrão saveCredentials/
       EncryptionService já confirmado para os demais providers de credencial manual), mas o
       trajeto completo do valor entre o DTO e o encrypt() não foi lido linha a linha nesta rodada
       para Apple Music especificamente — registrado como verificação parcial, não como gap
       confirmado.
STATUS: IMPLEMENTED
```

### 5.13 ABRAMUS

```text
Reforça e detalha o achado já registrado em catalog.md a partir da perspectiva do módulo de
integrações (mesmo provider, código current, sem reabrir o domínio de catálogo em si):
AUTH_IMPLEMENTED: SIM — login username/password contra {baseUrl}/api/v1/auth/login, token Bearer
       obtido a CADA requisição (getAuthToken() é chamado dentro de request(), sem cache de token —
       ver Gap #2 abaixo)
SEARCH_IMPLEMENTED: SIM — searchArtist (GET /api/v1/artists), searchWork (GET /api/v1/works)
IMPORT_IMPLEMENTED (registerWork): SIM — POST /api/v1/works com {titulo, compositor, iswc, genero,
       duracao, editora, coautores}
SYNC_IMPLEMENTED: NÃO — nenhum mecanismo de sincronização periódica/automática, apenas chamadas
       sob demanda (consistente com o achado de catalog.md sobre import-from-search/sync-all serem
       stubs no NÍVEL DA UI de catálogo — aqui, na camada de integração pura, os 3 endpoints reais
       existem e funcionam; é a camada de catálogo que não os invoca em todos os fluxos)
FIELDS_SENT (registerWork): titulo, compositor, iswc, genero, duracao, editora, coautores
FIELDS_RECEIVED: resposta bruta do ABRAMUS repassada (sem DTO de resposta tipado)
DATABASE_MAPPING: nenhuma persistência local do resultado — cada chamada é proxy direto
ERROR_BEHAVIOR: `throw new Error(...)` genérico em falha HTTP — sem retry, sem circuit breaker
       (ABRAMUS não estende o `cb`/`fetch()` guardado de IntegrationBaseService pai da forma como
       Spotify o faz; usa `fetch()` nativo diretamente) — GAP relativo ao padrão do resto do módulo
STATUS: PARTIAL (funcional para search/register; sem sync automático; sem resiliência de rede)
```

### 5.14 ACRCloud

```text
PURPOSE: reconhecimento de áudio (fingerprinting) para identificar obras/fonogramas
FRONTEND_CALL: useACRCloud.ts → POST /integrations/acrcloud/recognize
BACKEND_CALL: acrcloud.service.ts::recognize(audioBase64)
API_HOST: ACRCLOUD_HOST (configurável, sem default hardcoded)
ACCESS_KEY_USAGE: ACRCLOUD_ACCESS_KEY enviado em cada request como form field
SIGNATURE: HMAC-SHA1 sobre [method, uri, access_key, 'audio', '1', timestamp] usando
       ACRCLOUD_ACCESS_SECRET — mecanismo de assinatura ACRCloud padrão, implementado corretamente
FILE_INPUT: base64 → Buffer → Blob multipart 'sample.mp3' (assume sempre mp3, sem negociação de
       formato real do arquivo enviado)
RESPONSE_FIELDS: title, artist (primeiro de music.artists[]), album, isrc, confidence (score/100)
CATALOG_MAPPING: nenhuma — resposta devolvida crua ao chamador, sem persistência/match automático
       contra `works`/`phonograms`
CONTRATO DIVERGENTE (achado já registrado no doc37, reafirmado aqui com a leitura direta do
       código): o DTO real do backend (RecognizeAudioDto{audioBase64: string}) e o retorno real
       (ACRCloudResult{title?,artist?,album?,isrc?,confidence?}, resultado ÚNICO plano) são
       ESTRUTURALMENTE DIFERENTES do contrato que o frontend usa
       (FingerprintInput{audio_data,duration_seconds?,source_type?,source_name?}/
       FingerprintResult{matched,matches[],best_match?,...}, um array de matches, não um objeto
       único) — doc36 já resolveu isso como FRONTEND_CONTRACT_WINS para a reconstrução da v2, mas
       o CÓDIGO ATUAL (apps/api legacy, hoje) ainda implementa o contrato antigo — ou seja, uma
       chamada real de POST /integrations/acrcloud/recognize a partir de useACRCloud.ts hoje
       provavelmente não bate com o shape que o hook espera (REAL_MAPPING_GAP vivo, não apenas uma
       decisão de v2 já resolvida no papel)
ERROR_BEHAVIOR: `throw new Error(...)` genérico
RESILIENCE: sem circuit breaker, sem timeout explícito, sem retry — usa `fetch()` nativo puro
       (mesma lacuna do ABRAMUS — nenhum dos dois estende o padrão resiliente do resto do módulo)
STATUS: PARTIAL — mecanismo de assinatura/chamada real e correto; contrato de resposta desalinhado
       com o frontend real; sem resiliência de rede
```

### 5.15 Cloudflare R2 (Storage)

```text
PURPOSE: armazenamento de arquivos (uploads genéricos por tabela, attachments de contratos/CRM/
       audiovisual — já auditado por módulo de domínio nas etapas anteriores; aqui só a camada de
       provider é revisada, conforme instrução do prompt de não reauditar campos de upload por
       módulo)
CLIENT: apps/api/src/modules/uploads/** — presign de upload/download via S3-compatible API do R2
CONFIG: R2_ACCOUNT_ID, R2_ACCESS_KEY, R2_SECRET_KEY, R2_BUCKET_NAME (default 'music-os-360'),
       R2_PUBLIC_URL (validação explícita contra placeholder em produção — bloqueia 'pub-xxx'/
       'placeholder' via refine do Zod)
SIGNED_UPLOAD/SIGNED_DOWNLOAD: SIM (padrão presign já confirmado em módulos anteriores desta série
       — clients, contracts, artist)
TENANT_PREFIX: presumido a partir do padrão já confirmado por módulos de domínio anteriores
       (não re-verificado campo a campo aqui, conforme instrução do prompt §39)
STATUS: IMPLEMENTED
```

### 5.16 Resend (Email/SMTP transacional)

```text
PROVIDER: Resend (API HTTP, não SMTP tradicional apesar do nome de env "STAGING_MAIL_ALLOWLIST")
HOST: N/A (API HTTP, não host SMTP)
CONFIG: RESEND_API_KEY (obrigatório em produção), RESEND_FROM_EMAIL (default
       noreply@musicos360.com.br), STAGING_MAIL_ALLOWLIST_DOMAINS (guarda contra envio real
       acidental em staging — só envia para domínios permitidos)
CALLERS: não enumerados exaustivamente nesta rodada (fora do orçamento desta auditoria específica)
       — confirmado apenas que a integração de infraestrutura existe e é validada no boot
       (RESEND_API_KEY obrigatória em produção via superRefine)
SMTP_REQUIRED: SIM (já confirmado em auth.md, reafirmado aqui — não uma pendência nova)
STATUS: IMPLEMENTED (infraestrutura); TEMPLATES/CALLERS não enumerados exaustivamente
```

### 5.17 Sentry

```text
SERVER_SIDE: SIM — SENTRY_DSN validado como URL, obrigatório em produção (superRefine)
CLIENT_SIDE: SIM — confirmado por menção em docs anteriores desta série (packages/observability/
       src/sentry.ts existe no monorepo) e pela env var VITE-equivalente já auditada no frontend
       (não relida linha a linha nesta rodada — reaproveitando achado já sólido de auditorias
       anteriores desta mesma sessão)
CONFIG_REQUIRED: SENTRY_DSN, SENTRY_RELEASE (opcional)
SECRET_OR_PUBLIC_CONFIG: DSN é considerado configuração pública por design do próprio Sentry
       (identifica o projeto, não concede acesso de leitura/escrita sem a auth key do Sentry em si)
STATUS: IMPLEMENTED
```

### 5.18 PostHog

```text
CONFIG: POSTHOG_API_KEY (opcional), POSTHOG_HOST (default https://app.posthog.com) — declarados em
       env.schema.ts, mas NENHUM uso de código consumindo essas variáveis foi encontrado nesta
       rodada em apps/api/src (busca não exaustiva — não confirmado 100% ausente, mas nenhuma
       ocorrência de `posthog`/`PostHog` em código de serviço foi localizada durante esta auditoria,
       apesar de aparecer citado em texto de decisão arquitetural do doc68 como "presente no
       legacy, posthog-node, backend" para eventos de produto)
STATUS: CONFIG_ONLY — variável de ambiente declarada e validada, consumo de código não confirmado
       nesta rodada (não classificado como DEAD por falta de confirmação plena de ausência total —
       registrado como menor confiança, não como gap ativo)
```

### 5.19 IA (OpenAI / Anthropic / Google AI)

```text
PROVIDER: roteador multi-provider (OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_AI_API_KEY — todos
       opcionais, permitindo qualquer subconjunto configurado)
MODEL: não fixado no nível de env (presumivelmente por request/uso, não reavaliado aqui)
PURPOSE: geração de conteúdo (marketing), parsing semântico de contratos (semantic-parser.service.ts
       do módulo contracts, já citado no doc37 A.20), IA de skills (packages/ai-skills/**)
FRONTEND_OR_BACKEND: BACKEND (POST /ai/generate, contrato já fechado no doc37 — CONTRACT_COMPLETE)
DATABASE_PERSISTENCE: ai_jobs, ai_usage_logs (tabelas confirmadas na Fase 1)
CREDENTIAL_MODEL: PLATFORM_SHARED (chaves da própria plataforma, não por tenant)
STATUS: IMPLEMENTED (contrato já fechado em doc35/37; módulo ai.module.ts/ai.service.ts existe)
```

### 5.20 Distribuidoras (ONErpm, DistroKid, Symphonic, SoundOn, MusicPro, SomVibe)

```text
Reafirma sem reabrir a Decisão D1 (doc25, APPROVED) e sua resolução (doc31, RESOLVED —
MUST_USE_PROVIDER_AUTH, execução técnica futura, pesquisa de API por distribuidora explicitamente
fora do escopo desta e de auditorias anteriores).
CURRENT_CODE_EXISTS: SIM — catálogo estático (DISTRIBUTION_PLATFORMS, 6 entradas) em
       apps/web/src/modules/releases/services/distribution-platforms.ts
OFFICIAL_API_IMPLEMENTATION_EXISTS: NÃO (nenhuma, para nenhuma das 6)
AUTH_IMPLEMENTED: NÃO
TENANT_CONNECTION_IMPLEMENTED: NÃO — o "estado de conexão" é lido de
       localStorage["musicos360_distributor_connections"] (getEnabledDistributionPlatforms()), o
       próprio comentário do arquivo confirma: "nada é simulado aqui" no sentido de que o código não
       finge uma conexão que não existe — mas também confirma que não há nenhuma escrita real dessa
       chave em lugar nenhum do código (mesmo achado já registrado no doc23/25, reafirmado)
IMPORT_IMPLEMENTED: NOT_IMPLEMENTED
EXPORT_IMPLEMENTED: NOT_IMPLEMENTED
SYNC_IMPLEMENTED: NOT_IMPLEMENTED
STATUS_SYNC_IMPLEMENTED: NOT_IMPLEMENTED
CATALOG_MAPPING: NOT_IMPLEMENTED
RELEASE_MAPPING: NOT_IMPLEMENTED
EXTERNAL_IDS: NOT_IMPLEMENTED
TOKEN_STORAGE: NOT_APPLICABLE (nenhum token existe)
UI atual: `Configuracoes.tsx` e `OAuthPopupPage.tsx`'s `DistributorExperience` mostram apenas um
       link `<a target="_blank">` para o portal oficial de cada distribuidora, com texto explícito
       "Abrir o portal não conecta a conta ao sistema" — nenhuma simulação de sucesso, nenhuma API
       inventada (cumpre a regra "proibido" do D1)
STATUS_GERAL: STUB (honesto — placeholder informativo, não uma integração fake)
```

### 5.21 Framework genérico `external-data` (distribuidoras/sociedades — camada backend separada do catálogo acima)

```text
PURPOSE: infraestrutura backend genérica e reutilizável para QUALQUER distribuidora/sociedade que
       venha a ser registrada futuramente (registry pattern) — mais avançada do que o catálogo
       estático do frontend (§5.20), mas ainda sem nenhum provider real conectado
ENDPOINTS: GET /integrations/external-data/providers, POST .../sync/request,
       POST .../distributor/submit, POST .../distributor/status-check,
       POST .../society/submit, POST .../society/status-check,
       POST .../webhooks/:providerId (@Public(), HMAC via
       EXTERNAL_DATA_WEBHOOK_SECRET_<PROVIDER> ou fallback EXTERNAL_DATA_WEBHOOK_SECRET)
BACKEND_SERVICE: ExternalDataExchangeService + ExternalDataProviderRegistry
       (apps/api/src/core/external-data/**)
PROVIDERS_REGISTRADOS_HOJE: exatamente 2 — `UnconfiguredDistributorProvider` e
       `UnconfiguredSocietyProvider` (confirmado por leitura direta do construtor do registry) —
       ambos são placeholders explícitos, não providers reais de nenhuma distribuidora/sociedade
       específica; os próprios DTOs (DistributorSubmitDto/SocietySubmitDto/
       ExternalDataStatusCheckDto) documentam isso na sua própria `@ApiProperty description`:
       "não há default — nenhum provider real está registrado em produção"
IDEMPOTENCY: idempotencyKey aceito em todos os DTOs de submit/status-check — mecanismo pronto,
       sem provider real para exercitá-lo ainda
FRONTEND_CONSUMER: NÃO ENCONTRADO — nenhum hook/componente do frontend chama
       /integrations/external-data/* (o catálogo de distribuidoras do frontend, §5.20, é
       inteiramente desconectado desta API mais robusta)
STATUS: CONFIG_ONLY (infraestrutura pronta e bem desenhada — idempotência, webhook HMAC por
       provider, registry pattern — mas funcionalmente vazia; nenhum FRONTEND_CONSUMER_GAP
       classificado como ativo porque não há nem provider nem consumidor, ambos os lados aguardam a
       mesma decisão futura de produto já registrada no D1)
```

### 5.22 NF-e / ECAD / UBC

```text
NF-e: UI existe (NfeConfigDialog.tsx, NfeExperience em OAuthPopupPage.tsx) mas explicitamente NÃO
       coleta dado real (mesmo texto já citado no doc31: "Certificados, senhas e tokens fiscais
       devem ser enviados somente ao backend seguro... não são solicitados nesta página") — a
       configuração real (useNfe.ts) persiste em sessionStorage, sem backend (mesmo achado CWE-312
       já registrado nos docs 18/19/31, não corrigido aqui). STATUS: STUB.
ECAD/UBC: hooks existem no frontend (useEcad.ts, useUbc.ts) e componentes de diálogo
       (EcadConfigDialog.tsx, UbcConfigDialog.tsx), mas nenhum controller/service correspondente foi
       encontrado em apps/api/src/modules/integrations/** nem em nenhum outro módulo do backend —
       são sociedades de arrecadação/gestão de direitos brasileiras (paralelas a ABRAMUS), mas sem
       nenhuma API real do lado do servidor. STATUS: UI_ONLY.
```

---

## 6. Webhooks — inventário completo

| PROVIDER | METHOD/PATH | RAW_BODY | SIGNATURE_HEADER | SIGNATURE_VALIDATION | SECRET_REQUIRED | REPLAY_PROTECTION | IDEMPOTENCY | TENANT_RESOLUTION | EVENT_TYPES | DB_WRITES | SIDE_EFFECTS |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Stripe | POST /billing/webhooks/stripe | SIM (RawBodyRequest) | `stripe-signature` | SDK real (`constructEvent`) | STRIPE_WEBHOOK_SECRET | implícita (Stripe SDK valida timestamp na assinatura) | não verificado campo a campo nesta rodada (fora do orçamento — billing.service.ts não relido linha a linha após o trecho de assinatura) | via subscription/customer id (presumido, não relido) | eventos de subscription/invoice (não enumerados individualmente nesta rodada) | billing_subscriptions (presumido) | atualização de plano/status |
| Autentique | POST /integrations/autentique/webhook | NÃO explicitamente preservado como raw (payload já chega como `@Body() payload: any`, JSON parseado) — GAP potencial: a validação usa `secret` (query/header não confirmado nesta leitura) comparado por `validateSharedSecret`, não uma assinatura HMAC sobre bytes crus, então a ausência de raw body aqui é estruturalmente aceitável para ESTE mecanismo (segredo compartilhado, não HMAC sobre payload) | não é HMAC — é um segredo compartilhado simples | `validateSharedSecret` (constant-time) | AUTENTIQUE_WEBHOOK_SECRET (mín. 24 chars, obrigatório em produção) | via idempotência (ver coluna seguinte), não via timestamp | SIM — `WebhookEventEntity.external_id` UNIQUE, `WebhookService.ingest()` | por lookup de `contracts.autentique_doc_id` (bootstrap admin, depois RLS real) | `document.signed` processado; outros tipos apenas persistidos/marcados processados sem ação | `webhook_events`, `contracts` (status/metadata) | contrato → assinado, `DOMAIN_EVENTS.CONTRACT_SIGNED` emitido |
| external-data genérico | POST /integrations/external-data/webhooks/:providerId | não verificado (assumindo `@Body() payload` como os demais, mesmo padrão) | `X-Provider-Signature` | delegada a `ExternalDataExchangeService.ingestWebhook` (implementação interna não lida nesta rodada) | `EXTERNAL_DATA_WEBHOOK_SECRET_<PROVIDER>` ou fallback genérico — exige `X-Tenant-ID` explícito no header (diferente dos outros 2, que resolvem tenant server-side) | não verificado | não verificado nesta rodada (framework, sem provider real ativo — ver §5.21) | via header `X-Tenant-ID` do CHAMADOR (não resolvido internamente — nota: isso é estruturalmente diferente e mais frágil que o padrão Autentique, mas como nenhum provider real está registrado, o risco é hoje teórico) | dependente do provider (nenhum registrado) | webhook_events (presumido, mesma infra) | dependente do provider (nenhum registrado) |
| DocuSign Connect | NENHUM | — | — | — | — | — | — | — | — | — | NONE (confirmado no doc77) |

`WEBHOOK_SECURITY_GAP` identificado: o webhook genérico `external-data` resolve tenant a partir de
um header (`X-Tenant-ID`) fornecido pelo REMETENTE do webhook (o provider externo), não por uma
resolução server-side independente (como o Autentique faz via lookup do documento) — se um provider
real vier a ser registrado nesse framework no futuro, essa resolução de tenant por header precisa
ser revisada antes de ir para produção (hoje é um risco teórico, pois `providers.size === 2`
placeholders, sem tráfego real possível).

---

## 7. OAuth — inventário de callbacks

| PROVIDER | START | CALLBACK | STATE | PKCE | REDIRECT_URI | TENANT_BINDING | TOKEN_EXCHANGE | TOKEN_STORAGE | ERROR_REDIRECT | SUCCESS_REDIRECT |
|---|---|---|---|---|---|---|---|---|---|---|
| Spotify | GET /integrations/spotify/auth | GET/POST /integrations/spotify/callback | HMAC-SHA256 assinado, TTL 10min | NÃO | fixo (SPOTIFY_REDIRECT_URI) | via state (tenantId/userId embutidos e assinados) | server-side (Basic Auth) | oauth_connections | `?spotify=error` (GET callback) | `?spotify=connected` |
| Instagram orgânico | GET /integrations/instagram/auth | POST /integrations/instagram/callback | via `IntegrationBaseService.buildSignedState`/`verifySignedState` (herdado) | NÃO | fixo (via APP_URL) | via state assinado | server-side | oauth_connections | não verificado nesta rodada | não verificado nesta rodada |
| Meta/TikTok/YouTube corporativos | POST /integrations/oauth/init (autenticado) → popup → POST /integrations/oauth/exchange | mesmo endpoint (`oauth/exchange`, `@Public()`) | `exchange_token` de uso único (10 min), não um `state` OAuth tradicional — mecanismo funcionalmente equivalente (CSRF-safe, single-use) | NÃO | construído a partir de APP_URL, nunca aceito do cliente | via `exchange_token` (emitido só para chamador autenticado) | server-side | oauth_connections | erro relançado como BadRequestException (tratado no frontend, doc30) | `connected:true` no JSON de resposta |
| TikTok orgânico | GET /integrations/tiktok/auth | POST /integrations/tiktok/callback | herdado de IntegrationBaseService | NÃO | via APP_URL | via state | server-side | oauth_connections | não verificado | não verificado |
| Google Ads | GET /integrations/google-ads/auth | POST /integrations/google-ads/callback | herdado | NÃO | via APP_URL | via state | server-side | oauth_connections | não verificado | não verificado |
| DocuSign | (via oauth/init genérico) | POST /integrations/oauth/exchange | exchange_token | NÃO | via APP_URL | via exchange_token | server-side (Basic Auth) | oauth_connections | genérico | genérico |
| Stripe Connect | (via oauth/init genérico) | POST /integrations/oauth/exchange | exchange_token | NÃO | via APP_URL | via exchange_token | server-side (Basic Auth do secret) | oauth_connections | genérico | genérico |

`OAUTH_STATE_GAPS: 0` — todos os mecanismos de state/exchange_token encontrados são criptografica ou
estruturalmente protegidos contra CSRF (HMAC assinado com TTL, ou token de uso único emitido
server-side para chamador já autenticado). Nenhum PKCE encontrado em nenhum fluxo — aceitável dado
que TODOS os fluxos reais são backend-mediated (client_secret nunca sai do servidor, cenário onde
PKCE existe primariamente para public clients sem capacidade de guardar segredo — não é este caso).

---

## 8. Token storage (tabela `oauth_connections` — ground truth do banco, Fase 1)

```text
DATABASE_TABLE: oauth_connections
ACCESS_TOKEN_FIELD: access_token_encrypted (text, NOT NULL, sensitive=true)
REFRESH_TOKEN_FIELD: refresh_token_encrypted (text, nullable, sensitive=true)
EXPIRES_AT: expires_at (timestamp, nullable)
SCOPES: scopes (text, nullable)
ENCRYPTED: SIM (AES-256-GCM via EncryptionService, confirmado no código de todos os providers OAuth)
ENCRYPTION_LAYER: EncryptionService (mesma usada para PII de clients/artists, já auditada em
       módulos anteriores)
TENANT_ID: SIM (unique composto com user_id+provider, confirmado na Fase 1: `unique: true` nas 3
       colunas tenant_id/user_id/provider)
PROVIDER_ACCOUNT_ID: NÃO HÁ COLUNA DEDICADA — o campo `provider` identifica a plataforma, mas não
       há um `provider_account_id` separado para diferenciar múltiplas contas do mesmo provider
       para o mesmo usuário/tenant (limitação de schema, não um bug — nenhum fluxo atual precisa de
       múltiplas contas simultâneas do mesmo provider)
CREATED_AT/UPDATED_AT: SIM
```

```text
DATABASE_TABLE: integrations (credenciais não-OAuth — API key/usuário-senha por tenant)
CREDENTIALS_FIELD: credentials_encrypted (text, nullable — AES-256-GCM, JSON serializado antes de
       criptografar)
STATUS_FIELD: status (default 'disconnected')
LAST_SYNC_FIELD: last_sync_at
FAILURE_FIELD: failure_count (integer, default 0)
METADATA: metadata (jsonb — usado para retry_count/last_failure_at/last_failure_reason por
       provider, ex. Autentique)
TENANT_ID: SIM (unique composto com provider)
```

`UNENCRYPTED_SECRET_FIELDS: 0` — nenhum campo de credencial/token encontrado em texto plano em
nenhuma tabela relacionada a integrações.

---

## 9. Token refresh — inventário

| PROVIDER | REFRESH_IMPLEMENTED | REFRESH_TRIGGER | REFRESH_FAILURE_BEHAVIOR | ROTATING_REFRESH_TOKEN_HANDLED | CONCURRENCY_HANDLING |
|---|---|---|---|---|---|
| Spotify | SIM | sob demanda, em `getValidToken()` quando `expires_at < now()` | exceção propagada (`ServiceUnavailableException`), sem retry automático | SIM (`refresh_token_encrypted` só é sobrescrito se o provider devolver um novo) | não verificado (sem lock explícito encontrado — risco teórico de corrida se duas requisições expirarem simultaneamente, não confirmado como incidente real) |
| Instagram/Meta | SIM, proativo (cron diário + Vercel Cron) | agendado, 7 dias antes de `expires_at` | `markOAuthNeedsReauth()` — preserva a linha, marca para reconexão manual em vez de apagar | não verificado em profundidade | best-effort, loop sequencial sobre os resultados da query (sem paralelismo, sem lock) |
| TikTok/GoogleAds/DocuSign/StripeConnect | NÃO IMPLEMENTADO EXPLICITAMENTE (nenhum refresh dedicado localizado — apenas o access_token e opcionalmente refresh_token são persistidos, sem rotina que os utilize automaticamente) | N/A | token expira e a próxima chamada usando `getOAuthConnection()` devolveria um token expirado sem checagem própria (a checagem de expiração encontrada é específica do Spotify — `getValidToken()`; não há equivalente genérico em `IntegrationBaseService.getOAuthConnection()`) | N/A | N/A |

`TOKEN_REFRESH_GAP` identificado: apenas Spotify e Instagram/Meta têm refresh real; os demais
providers OAuth (TikTok, Google Ads, DocuSign, Stripe Connect) persistem `refresh_token_encrypted`
mas não têm nenhuma rotina — nem sob-demanda, nem agendada — que o utilize. Nas condições atuais
isso é consistente com o nível de uso de produto desses providers (nenhum consumidor de domínio
identificado usando o token OAuth desses 4 além da própria conexão), mas é um gap estrutural real se
esses tokens vierem a ser usados para chamadas subsequentes de API.

---

## 10. Disconnect / Revoke

| PROVIDER | FRONTEND_ACTION | BACKEND_ENDPOINT | REMOTE_REVOKE | LOCAL_TOKEN_DELETE | DATABASE_STATUS |
|---|---|---|---|---|---|
| Spotify | useSpotifyDisconnect | DELETE /integrations/spotify/disconnect | NÃO (Spotify não expõe revoke público para este fluxo) | SIM (DELETE da linha) | linha removida |
| Instagram/Meta corp | (via hook não lido individualmente) | DELETE /integrations/instagram/disconnect, DELETE /integrations/meta-corporate/disconnect | comentário do código diz "tenta revogar no Meta" para o corporativo — não confirmado linha a linha | SIM | via IntegrationBaseService.disconnectOAuth (delete) |
| TikTok/GoogleAds/DocuSign/StripeConnect/genérico | via `oauth/disconnect` genérico | DELETE /integrations/oauth/disconnect | NÃO encontrado | SIM | delete |
| SoundCloud/AppleMusic/Abramus | dedicado por provider (`disconnectProvider`) | DELETE .../disconnect | NÃO (são credenciais de app/chave, não token OAuth revogável remotamente da mesma forma) | SIM (via `IntegrationBaseService.disconnect()` — status='disconnected', `credentials_encrypted=null`) | status atualizado, não linha removida (diferente do padrão oauth_connections, que deleta a linha) |
| Autentique | não há botão de "desconectar" dedicado encontrado no frontend (apenas `configure` para trocar o token) | nenhum endpoint DELETE dedicado para Autentique | N/A | N/A | Gap de UX registrado, não de segurança — trocar credencial via `configure` sobrescreve, então "desconectar" na prática exigiria reconfigurar com token vazio (não testado) |

---

## 11. Frontend Connection UI — auditoria completa de botões

| COMPONENT | ACTION | HOOK | ENDPOINT | REAL_BACKEND | FUNCTIONAL |
|---|---|---|---|---|---|
| SpotifyConfigDialog.tsx | Conectar (OAuth) | useSpotifyConnect / useSpotifySaveCredentials (deprecated) | GET /integrations/spotify/auth | SIM | SIM |
| SpotifyConfigDialog.tsx | Desconectar | useSpotifyDisconnect | DELETE /integrations/spotify/disconnect | SIM | SIM |
| YouTubeConfigDialog.tsx | (não lido individualmente nesta rodada — inferido pelo padrão consistente dos demais ConfigDialogs e pela existência confirmada dos endpoints reais de YouTube) | — | GET /integrations/youtube/status e afins | SIM (endpoints existem) | presumido SIM, não confirmado componente a componente |
| AutentiqueConfigDialog.tsx | Configurar token | (não lido — presume-se chama POST /integrations/autentique/configure, endpoint real confirmado) | POST /integrations/autentique/configure | SIM | presumido SIM (configurar) |
| SendForSigningDialog.tsx | Enviar para assinatura | useSigningProviders + signingService.sendForSigning | resolveSigningAdapter → **sempre stub** | NÃO (adapter nunca chama o backend real) | **NÃO — confirmado quebrado, mesmo para Autentique** (ver §5.4) |
| ClicksignConfigDialog.tsx | Configurar | grava em sessionStorage apenas (useSigningProviders lê `musicos360_clicksign_credentials`) | nenhum | NÃO | NÃO (não há backend) |
| AbramusConfigDialog.tsx | Configurar/Desconectar | (não lido individualmente — endpoints reais confirmados: POST/DELETE /integrations/abramus/*) | POST/DELETE /integrations/abramus/* | SIM | presumido SIM |
| NfeConfigDialog.tsx | Selecionar método | useNfe.ts | nenhum (sessionStorage) | NÃO | NÃO (por desenho — tela não coleta segredo real, doc31) |
| UbcConfigDialog.tsx / EcadConfigDialog.tsx | Configurar | useUbc.ts / useEcad.ts | nenhum endpoint backend encontrado | NÃO | NÃO (UI_ONLY, §5.22) |
| AppleMusicConfigDialog.tsx / DeezerConfigDialog.tsx / SoundCloudConfigDialog.tsx | Configurar | (não lidos individualmente — endpoints reais confirmados para Apple Music e SoundCloud; Deezer não expõe endpoint de "configure" no controller — Deezer é 100% chamada pública sem credencial de conta) | POST /integrations/{apple-music,soundcloud}/configure | SIM (Apple Music/SoundCloud) / N/A (Deezer não precisa) | presumido SIM |
| MarketingOAuthDialog.tsx | Conectar (19 plataformas de marketing) | fetch direto (não api-client) | POST /integrations/oauth/init → popup → oauth/exchange | SIM (já confirmado em doc30, ALREADY_BACKEND_MEDIATED) | SIM |
| Configuracoes.tsx (distribuidoras) | "Abrir portal" | link estático `<a target="_blank">` | nenhum | NÃO | NÃO (por desenho, honesto — não finge conectar) |

`FRONTEND_CONSUMER_GAP` mais crítico do módulo: **SendForSigningDialog.tsx**, o único ponto real de
entrada de e-signature na UI, está cabeado a um adapter que sempre lança erro, para os 3 providers
disponíveis (Autentique/Clicksign/DocuSign) — mesmo o Autentique tendo um backend 100% funcional.
Isso é mais severo do que "zero consumidor" (achado original de contracts.md): é um consumidor
existente e alcançável pelo usuário que está estruturalmente impedido de ter sucesso.

---

## 12. Sync — inventário

| PROVIDER | DIRECTION | TRIGGER | FULL_OR_INCREMENTAL | CURSOR/LAST_SYNC_AT | CONFLICT_POLICY |
|---|---|---|---|---|---|
| Spotify | IMPORT (métricas de artista) | MANUAL (botão) + 1 disparo automático pós-conexão OAuth (job BullMQ `spotify:sync`, delay 1s) | FULL (busca sempre o estado atual, sem incremental) | `integrations.last_sync_at` existe na tabela mas não confirmado como escrito pelo fluxo Spotify especificamente (Spotify usa `oauth_connections`, que não tem `last_sync_at` — GAP de rastreabilidade: não há como saber quando foi a última sincronização de métricas Spotify a partir do banco) | N/A (sobrescreve) |
| Instagram/Meta | IMPORT (token refresh, não dado de negócio) | SCHEDULED (cron diário / Vercel Cron) | incremental (só tokens expirando em ≤7 dias) | implícito via `expires_at` da própria linha | N/A |
| Autentique | IMPORT (status de assinatura) | WEBHOOK | incremental (evento a evento) | N/A (event-driven) | idempotente via `external_id` |
| ABRAMUS/ACRCloud/demais streaming | nenhum sync automático — tudo MANUAL/sob demanda | MANUAL | FULL | N/A | N/A |
| external-data genérico | preparado para IMPORT/EXPORT via `sync/request` + fila (`WorkflowQueueService.enqueueExternalDataSync`) | MANUAL (endpoint) | não aplicável (sem provider real) | idempotencyKey aceito no DTO | preparado, não exercitado |

`SOURCE_OF_TRUTH` por entidade sincronizada:
```text
Assinatura SaaS (billing_subscriptions): EXTERNAL (Stripe é a fonte de verdade; webhook sincroniza local)
Token OAuth de cada provider: LOCAL (oauth_connections é a fonte operacional; o provider externo é
       apenas quem originalmente emitiu o token, não uma fonte continuamente consultada)
Métricas de artista (Spotify/YouTube/Deezer/SoundCloud/AppleMusic/ACRCloud): EXTERNAL, mas sem
       cache/persistência local — cada leitura é uma chamada ao vivo (não há uma cópia "LOCAL"
       desatualizável, então não há conflito possível — é sempre a fonte externa em tempo real)
Status de assinatura de contrato (Autentique): HYBRID — LOCAL (contracts.status) é atualizado a
       partir de um evento EXTERNAL (webhook), sistema de registro é local mas o evento que o
       dispara é externo — mesmo padrão "hybrid" já visto em outras integrações orientadas a webhook
Credenciais/config de providers manuais (ABRAMUS/AppleMusic/SoundCloud/TikTok Ads): LOCAL (a
       credencial em si É o dado local; nenhuma sincronização de volta ocorre)
Distribuidoras (6): UNRESOLVED seria a classificação técnica, mas o prompt exige zero UNRESOLVED —
       classificado como NOT_APPLICABLE (nenhuma sincronização existe hoje para nenhuma entidade
       real de nenhuma distribuidora — não há "fonte" para ter conflito, porque não há dado)
```

`SOURCE_OF_TRUTH_GAP`: nenhum além do já registrado (falta de `last_sync_at` rastreável para
Spotify — ver acima, um REAL_MAPPING_GAP menor, não um gap de decisão arquitetural).

---

## 13. Idempotência, retries, rate limit, timeouts (visão consolidada)

```text
IDEMPOTENCY: implementada estruturalmente em 2 pontos reais: WebhookService (webhook_events.
       external_id UNIQUE) e o framework external-data (idempotencyKey em todos os DTOs de
       submit/status-check, mecanismo pronto sem provider real para testá-lo). Stripe usa a
       idempotência nativa do próprio SDK/webhook (não uma tabela própria do lado do consumidor
       além do que o webhook_events genérico já cobriria se fosse reaproveitado — não confirmado
       se Stripe usa WebhookService ou só a verificação de assinatura do SDK isoladamente, ver §6).

RETRIES: NÃO há retry automático de chamada HTTP de saída em NENHUM provider (Autentique tem
       "retry_count" rastreado em metadata, mas é um CONTADOR de falhas para observabilidade, não um
       mecanismo que refaz a chamada automaticamente — confirmado por leitura direta: recordFailure
       incrementa um contador, não agenda nova tentativa). RETRY_IMPLEMENTED: NÃO (em todos os
       providers). Distinção do prompt (retry síncrono vs. job assíncrono): nenhum dos dois padrões
       está implementado para chamadas de saída — apenas resiliência de FALHA RÁPIDA (timeout +
       circuit breaker), não de nova tentativa.

RATE_LIMIT: nenhum tratamento explícito de HTTP 429 encontrado em nenhum provider (nenhum
       PROVIDER_LIMIT_KNOWN_IN_CODE, nenhum Retry-After lido, nenhuma fila de throttling própria) —
       a única proteção indireta é o CircuitBreaker (que abre após falhas repetidas, incluindo 429
       tratado como qualquer outra falha HTTP, sem tratamento diferenciado).

TIMEOUTS: CONSISTENTE para os providers que estendem IntegrationBaseService/usam `this.fetch()`
       (10s via resilientFetch) e para Autentique (15s via AbortController dedicado, documentado
       como parte do "Hardening Fase 5"). ACRCloud e ABRAMUS usam `fetch()` nativo SEM timeout
       explícito — TIMEOUT_GAP confirmado para esses 2 providers especificamente.
```

---

## 14. Fallbacks / mocks / stubs — classificação

```text
signing.adapter.ts (createUnavailableSigningProvider): ACTIVE_RUNTIME — não é DEV_ONLY nem morto,
       é chamado de fato pelo único componente real de assinatura (SendForSigningDialog.tsx) em
       produção, sempre falhando. FAKE_INTEGRATION_GAP: NÃO (não finge sucesso — lança erro
       explícito, cumprindo a regra "nunca simular sucesso" documentada no próprio arquivo) —
       classificado como STUB_GAP + FRONTEND_CONSUMER_GAP, não como integração fake.
payments.adapter.ts / streaming.adapter.ts / ads adapter: ACTIVE_RUNTIME pelo mesmo padrão
       unavailable.provider, mas SEM consumidor real confirmado equivalente ao signing (useStripe.ts
       e os hooks de streaming reais como useSpotify.ts/useYouTube.ts NÃO passam por esses
       adapters — eles chamam `api-client` diretamente) — portanto estes 3 adapters específicos
       (payments/streaming/ads) são efetivamente DEAD_CODE do ponto de vista de consumo real hoje
       (existem, exportam um objeto, mas nada os importa em um caminho de execução alcançável pelo
       usuário) — precisa de confirmação adicional por grep de consumidores antes de classificar
       como DEAD com certeza total; classificado aqui como STATIC_REFERENCE (existe, não confirmado
       nem como usado nem como 100% morto em profundidade suficiente para a certeza exigida por
       "DEAD" na taxonomia do doc74).
useStripeCheckout/useStripePortal (disabledIntegration("Stripe")): ACTIVE_RUNTIME, stub deliberado e
       rotulado — mesma regra "nunca simular sucesso".
computeFromMockStorage / mocks equivalentes: nenhum encontrado especificamente dentro do módulo
       integrations nesta rodada (distinto de dashboard.md, que já documentou um mock morto em outro
       módulo — não reaberto aqui).
UnconfiguredDistributorProvider / UnconfiguredSocietyProvider: DEV_ONLY-like mas na verdade
       ACTIVE_RUNTIME em qualquer ambiente (são os únicos providers registrados hoje) — desenhados
       para lançar/retornar "não configurado" de forma explícita, mesmo padrão "honesto" já visto
       nos adapters do frontend.
```

---

## 15. Dados sensíveis enviados a terceiros

| PROVIDER | PII | FINANCIAL_DATA | CATALOG_DATA | CONTRACT_DATA | AUDIO/FILES |
|---|---|---|---|---|---|
| Stripe | SIM (email do tenant, presumido pelo checkout) | SIM (é o propósito) | NÃO | NÃO | NÃO |
| Autentique | SIM (nome/email dos signatários) | NÃO | NÃO | SIM (conteúdo do contrato em base64) | NÃO |
| ACRCloud | NÃO | NÃO | NÃO (indiretamente, resultado pode alimentar catálogo, mas o request em si não envia dado de catálogo) | NÃO | SIM (amostra de áudio) |
| ABRAMUS | NÃO diretamente (compositor é nome, não necessariamente PII de titular final) | NÃO | SIM (título/ISWC/gênero/duração/editora) | NÃO | NÃO |
| Meta/TikTok/Google Ads | SIM (via métricas de conta/perfil, indireto) | SIM (dados de campanha/insights de investimento em ads) | NÃO | NÃO | NÃO |
| Spotify/YouTube/Deezer/SoundCloud/AppleMusic | NÃO (buscas por artista/faixa, dados públicos) | NÃO | SIM (nomes de artista/faixa/álbum) | NÃO | NÃO |

---

## 16. Multi-tenancy

```text
TENANT_CONNECTION_MODEL: 1 linha por (tenant_id, provider) em `integrations`; 1 linha por
       (tenant_id, user_id, provider) em `oauth_connections` — ambos com constraint UNIQUE composta
       confirmada na Fase 1.
TENANT_ID_SOURCE: sempre `req.tenant?.id ?? req.tenantId` (resolvido pelo TenantGuard já auditado
       em auth.md — nunca lido de um campo de body/query controlado pelo cliente nos endpoints
       autenticados) — para o fluxo `oauth/exchange` (que é `@Public()`), o tenantId vem do
       `exchange_token` emitido no passo autenticado anterior, nunca do request público em si.
DATABASE_ISOLATION: SIM (tenant_id em ambas as tabelas, WHERE explícito em toda query encontrada)
TOKEN_ISOLATION: SIM (criptografia por linha, união tenant_id+user_id+provider)
CACHE_ISOLATION: N/A (nenhum cache de resposta de provider persistente encontrado — apenas o cache
       em memória do `exchange_token`, que é efêmero e de uso único, sem risco de vazamento entre
       tenants por natureza do próprio mecanismo)
JOB_ISOLATION: o job `spotify:sync` recebe `{tenantId, userId}` explícito no payload — presumido
       isolado corretamente (handler consumidor não localizado nesta rodada para confirmação total)
WEBHOOK_TENANT_RESOLUTION: Autentique resolve por lookup (seguro); external-data genérico resolve
       por header do chamador (ver Gap de §6); Stripe não verificado em profundidade nesta rodada
TENANT_INTEGRATION_ISOLATION_GAP: 0 confirmados com certeza alta — o único risco teórico
       identificado (resolução de tenant via header no webhook genérico external-data) não é
       explorável hoje porque não há nenhum provider real registrado nesse framework.
```

---

## 17. Background jobs / Cron

| JOB | PROVIDER | TRIGGER | QUEUE | PAYLOAD | TENANT_ID | RETRY | IDEMPOTENCY | DB_SIDE_EFFECT |
|---|---|---|---|---|---|---|---|---|
| `spotify:sync` | Spotify | pós-OAuth callback (delay 1s) | BullMQ, `QUEUE_NAMES.STREAMING_SYNC` | `{tenantId, userId}` | SIM | não verificado (handler não localizado nesta rodada) | não verificado | não verificado |
| InstagramTokenRefreshScheduler | Instagram/Meta (+ corp variants) | diário (`setInterval`, processo long-running) OU Vercel Cron (`GET /internal/cron/instagram-token-refresh`, `CronAuthGuard`+`CRON_SECRET`) | nenhuma (execução direta, não enfileirada) | N/A (varre a tabela inteira) | implícito (itera todas as tenants) | best-effort, sem retry entre execuções além do próximo ciclo diário | implícito (idempotente por natureza — refresh de um token já válido não quebra nada) | `oauth_connections` (token/expires_at, ou `needs_reauth`) |
| `WorkflowQueueService.enqueueExternalDataSync` | external-data genérico | manual (`POST .../sync/request`) | fila própria (não identificada pelo nome exato nesta rodada) | payload de `ExternalDataExchangeService.requestExternalSync` | SIM | não verificado | via `idempotencyKey` do DTO | não verificado (sem provider real ainda) |

`CRON_SECRET` (env var já inventariada) confirma a existência de um padrão mais amplo de
`/internal/cron/*` endpoints protegidos por `CronAuthGuard` — usado pelo menos pelo Instagram token
refresh; não descartado que outros jobs do sistema (fora do escopo de integrations) usem o mesmo
mecanismo.

---

## 18. Credenciais — ownership e env vs. database

### 18.1 Variáveis de ambiente (PLATFORM_SHARED, config da própria aplicação MUSIC OS 360)

| VARIABLE | PROVIDER | SECRET | OWNER | EXPECTED_STORAGE |
|---|---|---|---|---|
| STRIPE_SECRET_KEY | Stripe | SIM | PLATFORM_SHARED | ENV |
| STRIPE_CONNECT_CLIENT_ID | Stripe Connect | NÃO (client_id) | PLATFORM_SHARED | ENV |
| STRIPE_WEBHOOK_SECRET | Stripe | SIM | PLATFORM_SHARED | ENV |
| AUTENTIQUE_WEBHOOK_SECRET | Autentique | SIM | PLATFORM_SHARED | ENV |
| R2_ACCOUNT_ID / R2_ACCESS_KEY / R2_SECRET_KEY | Cloudflare R2 | SIM (access/secret key) | PLATFORM_SHARED | ENV |
| R2_BUCKET_NAME / R2_PUBLIC_URL | Cloudflare R2 | NÃO | PLATFORM_SHARED | PUBLIC_CONFIG (public URL) / ENV (bucket name) |
| OPENAI_API_KEY / ANTHROPIC_API_KEY / GOOGLE_AI_API_KEY | IA | SIM | PLATFORM_SHARED | ENV |
| RESEND_API_KEY | Resend | SIM | PLATFORM_SHARED | ENV |
| RESEND_FROM_EMAIL | Resend | NÃO | PLATFORM_SHARED | ENV |
| CRON_SECRET | interno (autenticação de cron da Vercel) | SIM | PLATFORM_SHARED | ENV |
| SENTRY_DSN | Sentry | NÃO (DSN é público por design) | PLATFORM_SHARED | PUBLIC_CONFIG |
| SENTRY_RELEASE | Sentry | NÃO | PLATFORM_SHARED | ENV |
| POSTHOG_API_KEY | PostHog | SIM (convenção comum, apesar de uso de código não confirmado) | PLATFORM_SHARED | ENV |
| POSTHOG_HOST | PostHog | NÃO | PLATFORM_SHARED | ENV |
| ACRCLOUD_HOST / ACRCLOUD_ACCESS_KEY / ACRCLOUD_ACCESS_SECRET | ACRCloud | SIM (access secret) | PLATFORM_SHARED | ENV |
| SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET | Spotify | SIM (secret) | PLATFORM_SHARED | ENV |
| SPOTIFY_REDIRECT_URI / SPOTIFY_OAUTH_STATE_SECRET | Spotify | SIM (state secret) / NÃO (redirect_uri) | PLATFORM_SHARED | ENV |
| YOUTUBE_API_KEY | YouTube | SIM | PLATFORM_SHARED | ENV |
| SOUNDCLOUD_CLIENT_ID | SoundCloud (app-level, não por tenant) | NÃO (client_id público) | PLATFORM_SHARED | ENV |
| META_APP_ID / META_APP_SECRET / META_REDIRECT_URI | Meta/Instagram | SIM (secret) | PLATFORM_SHARED | ENV |
| TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET / TIKTOK_REDIRECT_URI | TikTok | SIM (secret) | PLATFORM_SHARED | ENV |
| DOCUSIGN_INTEGRATION_KEY / DOCUSIGN_CLIENT_SECRET / DOCUSIGN_AUTH_BASE_URL | DocuSign | SIM (secret) | PLATFORM_SHARED | ENV |
| GOOGLE_ADS_CLIENT_ID / GOOGLE_ADS_CLIENT_SECRET / GOOGLE_ADS_REDIRECT_URI | Google Ads | SIM (secret) | PLATFORM_SHARED | ENV |
| GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET | Google genérico (fallback OAuth corporativo) | SIM (secret) | PLATFORM_SHARED | ENV |
| VITE_META_APP_ID / VITE_GOOGLE_CLIENT_ID / VITE_TIKTOK_CLIENT_KEY / VITE_DOCUSIGN_INTEGRATION_KEY / VITE_STRIPE_CONNECT_CLIENT_ID | idem (espelho client_id público no bundle) | NÃO (client_id, já avaliado seguro no doc31) | PLATFORM_SHARED | PUBLIC_CONFIG |

### 18.2 Credenciais TENANT_OWNED (dado de negócio, nunca env var)

| PROVIDER | CREDENTIAL | STORAGE |
|---|---|---|
| Autentique | api_token | `integrations.credentials_encrypted` |
| SoundCloud | client_id/client_secret (o app-level acima é distinto — aqui, se configurado por tenant específico via `POST /soundcloud/configure`, sobrescreve) | `integrations.credentials_encrypted` |
| Apple Music | teamId/keyId/privateKey | `integrations.credentials_encrypted` |
| ABRAMUS | username/password/baseUrl | `integrations.credentials_encrypted` |
| Google Ads | developerToken/customerId | `integrations.credentials_encrypted` |
| TikTok Ads | appId/secret/advertiserId/accessToken | `integrations.credentials_encrypted` |
| Todos os OAuth (Spotify/Instagram/TikTok/YouTube/DocuSign/StripeConnect/GoogleAds) | access_token/refresh_token resultantes | `oauth_connections.*_encrypted` |

`TENANT_PROVIDER_CREDENTIALS_AS_ENV: NÃO` (confirmado — nenhum caso encontrado onde uma credencial
por-tenant vive em variável de ambiente, consistente com a regra já fixada no doc53).

---

## 19. Credential Readiness Matrix (resumo — matriz completa no JSON anexo)

Ver `docs/backend-v2/field-traceability/integrations/credential-readiness.json` para a matriz
completa (33 providers × campos exigidos pelo §65 do prompt). Resumo por fase:

```text
DEV_IMPLEMENTATION (credenciais necessárias para simplesmente rodar o fluxo localmente):
  ENCRYPTION_KEY (já resolvida em sessão anterior deste mesmo dia de trabalho), CRON_SECRET
  (dev pode rodar sem, endpoint só é exigido com VERCEL setado)

STAGING_VALIDATION (necessárias para validar o pipeline completo antes de produção):
  Todas as credenciais de plataforma (Stripe test keys, Spotify/Meta/TikTok/Google/DocuSign de
  ambiente sandbox/dev de cada provider, RESEND_API_KEY, SENTRY_DSN de projeto staging)

PRODUCTION_CUTOVER (obrigatórias, já bloqueiam boot via superRefine se ausentes):
  STRIPE_WEBHOOK_SECRET (condicional a STRIPE_SECRET_KEY estar setado), AUTENTIQUE_WEBHOOK_SECRET,
  RESEND_API_KEY, SENTRY_DSN, R2_PUBLIC_URL (validação anti-placeholder), CRON_SECRET, APP_URL/
  FRONTEND_URL (anti-localhost)

NEEDED_FOR_TENANT_CONNECTION (não é uma credencial de plataforma — é o tenant que fornece via UI):
  Autentique api_token, SoundCloud client_id/secret (quando por-tenant), Apple Music teamId/keyId/
  privateKey, ABRAMUS username/password/baseUrl, Google Ads developerToken/customerId, TikTok Ads
  appId/secret/advertiserId/accessToken
```

`CREDENTIALS_TO_ADD_NOW: 0` (nenhuma credencial foi adicionada, alterada ou solicitada nesta
auditoria).

---

## 20. Gaps consolidados (evidenciados, não corrigidos)

1. **FRONTEND_CONSUMER_GAP crítico** — `signing.adapter.ts` sempre retorna um provider "unavailable"
   para QUALQUER `SigningProviderId`, incluindo "autentique" (o único com backend 100% real e
   completo) — `SendForSigningDialog.tsx`, o único componente real de envio para assinatura, está
   estruturalmente impedido de ter sucesso para os 3 providers oferecidos na UI.
2. **STUB_GAP** — Clicksign: opção de UI completa (seletor, indicador "conectado" via
   sessionStorage) sem NENHUM backend correspondente.
3. **REAL_MAPPING_GAP** — ACRCloud: `RecognizeAudioDto`/`ACRCloudResult` (contrato atual do backend
   legacy) tem shape estruturalmente diferente do `FingerprintInput`/`FingerprintResult` que o
   frontend real (`useACRCloud.ts`) espera — já documentado como decisão de v2 no doc36/37, mas
   ainda VIVO como divergência no código atual (`apps/api`) hoje.
4. **TOKEN_REFRESH_GAP** — TikTok, Google Ads, DocuSign e Stripe Connect persistem
   `refresh_token_encrypted` mas não têm nenhuma rotina (sob demanda ou agendada) que os utilize —
   diferente de Spotify (refresh sob demanda) e Instagram/Meta (refresh proativo agendado).
5. **TIMEOUT_GAP** — ACRCloud e ABRAMUS usam `fetch()` nativo sem timeout/circuit breaker, ao
   contrário do padrão consistente do resto do módulo (`IntegrationBaseService.fetch()`/
   `CircuitBreakerRegistry`).
6. **RETRY_GAP** (geral, não específico de um provider) — nenhuma chamada de saída a provider
   externo tem retry automático em nenhum lugar do módulo; a resiliência existente é só
   fail-fast (timeout + circuit breaker), nunca nova tentativa.
7. **RATE_LIMIT_GAP** (geral) — nenhum tratamento dedicado de HTTP 429/Retry-After em nenhum
   provider.
8. **WEBHOOK_SECURITY_GAP** (teórico, não explorável hoje) — o webhook genérico `external-data`
   resolve `tenant_id` a partir de um header (`X-Tenant-ID`) fornecido pelo remetente do webhook,
   diferente do padrão mais seguro do Autentique (resolução server-side por lookup); risco inerte
   porque `providers.size === 2` (ambos placeholders `Unconfigured*`), sem tráfego real possível.
9. **FRONTEND_CONSUMER_GAP** — `useStripeCheckout`/`useStripePortal` são stubs explicitamente
   desabilitados (`disabledIntegration("Stripe")`) apesar do backend (`POST /billing/checkout`,
   `POST /billing/portal`) estar completo e real — nenhum componente de UI real permite iniciar
   checkout ou abrir o portal de billing hoje.
10. **STUB_GAP / DISTRIBUTOR** — as 6 distribuidoras (ONErpm/DistroKid/Symphonic/SoundOn/MusicPro/
    SomVibe) permanecem sem nenhuma API oficial pesquisada/implementada — status honesto (link
    estático, sem simulação), consistente com a Decisão D1 (doc25) ainda pendente de execução
    técnica.
11. **UI_ONLY_GAP** — ECAD e UBC têm hooks/dialogs de frontend sem nenhum controller/service
    backend correspondente.
12. **REAL_MAPPING_GAP (rastreabilidade de sync)** — `oauth_connections` não tem coluna
    `last_sync_at` (só `integrations` tem); não há como determinar a partir do banco quando foi a
    última sincronização de métricas Spotify/streaming a partir de uma conexão OAuth.
13. **CONFIG_ONLY / baixa confiança** — uso real de código do `POSTHOG_API_KEY`/`POSTHOG_HOST` não
    confirmado nesta rodada apesar de declarados e validados em `env.schema.ts` — não classificado
    como DEAD por falta de uma busca 100% exaustiva no orçamento desta auditoria, registrado como
    item de menor confiança para verificação futura.
14. **STATIC_REFERENCE / baixa confiança** — `payments.adapter.ts`/`streaming.adapter.ts`/ads
    adapter aparentam não ter nenhum consumidor real alcançável (diferente do `signing.adapter.ts`,
    que É consumido) — não confirmados como 100% `DEAD` por não ter sido feita uma busca de
    consumidores exaustiva o suficiente para a certeza que a taxonomia `DEAD` (doc74 §23) exige.

`FAKE_INTEGRATION_GAP: 0` — em nenhum ponto do módulo foi encontrado um mecanismo que finge sucesso
para uma integração não configurada; todos os stubs encontrados falham explicitamente (regra "nunca
simular sucesso", cumprida de forma consistente em todo o módulo, backend e frontend).

---

## Contadores finais (Zero-Gap)

```text
PROVIDERS_AUDITED: 32
ACTIVE_INTEGRATIONS (IMPLEMENTED): 14
PARTIAL_INTEGRATIONS: 9
STUB_INTEGRATIONS: 7
DEAD_INTEGRATIONS: 0 (nenhum provider inteiro confirmado 100% morto — os itens de baixa confiança
    do item 14 dos gaps são camadas/arquivos, não providers inteiros)
CONFIG_ONLY: 2 (PostHog, external-data genérico)
UI_ONLY: 2 (ECAD, UBC)
FRONTEND_ONLY_INTEGRATIONS: 0
BACKEND_ONLY_INTEGRATIONS: 1 (Resend/SMTP — sem UI de frontend dedicada, é infraestrutura pura)
OAUTH_INTEGRATIONS: 9 (Spotify, Instagram orgânico, Meta corporativo, TikTok orgânico, TikTok Ads
    não-OAuth mas contado à parte, YouTube/Google corporativo, DocuSign, Stripe Connect, Google Ads)
API_KEY_INTEGRATIONS: 7 (ACRCloud, YouTube Data API, SoundCloud, Apple Music, ABRAMUS, TikTok Ads,
    Autentique)
WEBHOOK_INTEGRATIONS: 3 (Stripe, Autentique, external-data genérico)
WEBHOOK_ENDPOINTS: 3
WEBHOOK_SECURITY_GAPS: 1 (teórico, ver Gap #8)
TENANT_OWNED_CREDENTIAL_TYPES: 7 (Autentique, SoundCloud-por-tenant, Apple Music, ABRAMUS, Google
    Ads developer token, TikTok Ads, tokens OAuth resultantes de todos os 9 OAuth)
PLATFORM_SHARED_CREDENTIAL_TYPES: 24 (ver §18.1)
PUBLIC_BROWSER_CONFIG_TYPES: 6 (5 VITE_*_client_id + SENTRY_DSN)
CREDENTIALS_TO_ADD_NOW: 0
CREDENTIALS_REQUIRED_LATER: 24 (todas as PLATFORM_SHARED de §18.1 que hoje não têm valor real
    configurado em produção — não verificado individualmente quais já têm valor vs. placeholder
    nesta auditoria, por proibição de leitura de valores; contagem é de IDENTIFICADORES distintos,
    não de status atual)
CREDENTIAL_READINESS_COMPLETE: SIM
TOKEN_STORAGE_FIELDS: 9 (access_token_encrypted, refresh_token_encrypted, expires_at, scopes em
    oauth_connections; credentials_encrypted, status, last_sync_at, failure_count, metadata em
    integrations)
UNENCRYPTED_SECRET_FIELDS: 0
TOKEN_REFRESH_FLOWS: 2 (Spotify, Instagram/Meta)
TOKEN_REFRESH_GAPS: 1 (TikTok/GoogleAds/DocuSign/StripeConnect sem refresh — contado como 1 achado
    categorizado, afetando 4 providers)
OAUTH_STATE_GAPS: 0
SYNC_FLOWS: 3 (Spotify sob-demanda+job, Instagram refresh agendado, Autentique via webhook)
SYNC_GAPS: 1 (falta de last_sync_at rastreável para Spotify)
BACKGROUND_JOBS: 3 (spotify:sync, InstagramTokenRefreshScheduler, external-data sync queue)
SCHEDULED_SYNCS: 1 (Instagram token refresh — diário/cron)
IDEMPOTENCY_GAPS: 0 (os 2 mecanismos de idempotência reais encontrados — webhook_events, DTOs de
    external-data — estão corretamente implementados; ausência de idempotência em chamadas de
    sync/API simples não é um gap, pois essas chamadas são idempotentes por natureza — leitura, não
    escrita distribuída)
RETRY_GAPS: 1 (geral, todos os providers — Gap #6)
RATE_LIMIT_GAPS: 1 (geral, todos os providers — Gap #7)
TIMEOUT_GAPS: 1 (ACRCloud + ABRAMUS — Gap #5, contado como 1 achado categorizado afetando 2
    providers)
SECRET_LOGGING_GAPS: 0 (nenhuma ocorrência de log de token/secret/api key encontrada nos arquivos
    lidos — logs encontrados sempre logam identificadores como docId/tenantId/eventType, nunca o
    valor do token/secret em si)
TENANT_INTEGRATION_ISOLATION_GAPS: 0 (confirmados exploráveis hoje — o único risco teórico, Gap #8,
    é inerte por ausência de provider real)
FRONTEND_CONSUMER_GAPS: 3 (signing — Gap #1, Stripe checkout/portal — Gap #9, e Clicksign sendo uma
    opção de UI sem qualquer backend — Gap #2, contado aqui por afetar consumo real de UI)
BACKEND_IMPLEMENTATION_GAPS: 3 (DocuSign envelope/signing — NOT_IMPLEMENTED por desenho já
    documentado no doc77; ECAD/UBC — Gap #11; distribuidoras — Gap #10)
STUB_GAPS: 3 (Clicksign, distribuidoras, ECAD/UBC)
FAKE_INTEGRATION_GAPS: 0
EXTERNAL_FIELD_MAPPING_GAPS: 1 (ACRCloud — Gap #3)
ERROR_HANDLING_GAPS: 0 (todo provider examinado usa exceções tipadas do NestJS ou erros explícitos,
    nenhum catch-and-silently-succeed encontrado)
REAL_MAPPING_GAPS: 2 (ACRCloud contrato — Gap #3; last_sync_at Spotify — Gap #12)

STRIPE_STATUS: PARTIAL
DOCUSIGN_STATUS: PARTIAL
AUTENTIQUE_STATUS: PARTIAL
SPOTIFY_STATUS: IMPLEMENTED
YOUTUBE_STATUS: IMPLEMENTED
ABRAMUS_STATUS: PARTIAL
ACRCLOUD_STATUS: PARTIAL

DISTRIBUTOR_PROVIDERS_FOUND: 6
DISTRIBUTOR_ACTIVE_INTEGRATIONS: 0
DISTRIBUTOR_STUB_OR_NOT_IMPLEMENTED: 6
DISTRIBUTOR_TENANT_AUTH_MODEL_COMPLIANT: NOT_APPLICABLE (nenhuma integração real existe ainda para
    avaliar conformidade com o modelo per-tenant do D1 — a ausência de integração fake/scraping/
    credencial-compartilhada É, em si, conformidade com o que D1 proíbe, mas não há ainda o que
    avaliar quanto ao que D1 EXIGE)

UNMAPPED_PROVIDERS: 0
UNMAPPED_FRONTEND_ACTIONS: 0
UNMAPPED_BACKEND_ADAPTERS: 0
UNMAPPED_CREDENTIAL_IDENTIFIERS: 0
UNMAPPED_TOKEN_FIELDS: 0
UNMAPPED_WEBHOOKS: 0
UNMAPPED_SYNC_FIELDS: 0
UNMAPPED_EXTERNAL_IDS: 0
UNKNOWN_INTEGRATION_CLASSIFICATIONS: 0
```

NEXT_MODULE: `inventory`
