# Integration Gateway — OAuth Centralizado + Webhook Orchestrator + Retry Layer

## What & Why
O `IntegrationBaseService` tem uma base sólida (OAuth tokens, credentials encryption, HMAC state), mas cada provider (Spotify, YouTube, TikTok, Instagram, etc.) implementa seu próprio fluxo OAuth de forma desacoplada. Não existe: camada centralizadora de rate limiting por provider, retry automático com backoff quando tokens expiram, normalização de resposta entre providers, webhook orchestrator central que valide assinaturas antes de despachar, nem fallback handler quando uma integração falha. Isso cria comportamento inconsistente e fragilidade em produção.

## Done looks like
- `IntegrationGatewayService` central que roteia qualquer chamada de provider: `gateway.call(tenantId, provider, 'fetchMetrics', params)` com retry + token refresh automático
- Token refresh automático: quando access_token expirado, gateway tenta refresh_token antes de lançar erro; atualiza `oauth_connections`
- Rate limiting por provider: Redis-backed counter `rl:{provider}:{tenantId}` com TTL; rejeita com `429` antes de chamar API externa
- `WebhookOrchestratorService`: valida assinatura (HMAC, Stripe signature, etc.) antes de despachar job para fila WEBHOOKS; rejeita payloads inválidos com 401
- Provider normalization: todos retornam `{ provider, data, fetchedAt, tenantId }` padronizado
- Fallback handler: quando provider falha após retry, emite evento `integration.degraded` no WebSocket do tenant e registra no audit log
- Providers cobertos: Spotify, YouTube, TikTok, Instagram, Meta Ads, Google Ads, SoundCloud

## Out of scope
- Implementar coleta real de métricas de streaming (apenas o gateway — dados ficam para queue processors)
- Frontend de configuração de integrações (já existe)
- Novos providers além dos listados

## Steps
1. **IntegrationGatewayService** — criar `modules/integrations/gateway/integration-gateway.service.ts`; método `call<T>(tenantId, userId, provider, method, params): Promise<T>` que: carrega token via `loadOAuthTokens`, verifica rate limit, executa chamada, captura 401 → tenta refresh → retry uma vez, captura outros erros → fallback + audit log
2. **Token auto-refresh** — criar `gateway/token-refresh.service.ts`; para cada provider, implementar `refresh(tenantId, userId, provider): Promise<string>` que chama o endpoint de token do provider com refresh_token; salva novo access_token via `saveOAuthTokens`; Spotify, YouTube, TikTok, Instagram com refresh endpoints reais
3. **Rate limiter** — criar `gateway/provider-rate-limit.service.ts`; usar `UPSTASH_REDIS_URL` + `UPSTASH_REDIS_TOKEN`; configuração por provider: Spotify (50 req/s), YouTube (10000 req/day), TikTok (100 req/min), Instagram (200 req/hour); método `checkLimit(provider, tenantId): Promise<boolean>`
4. **WebhookOrchestratorService** — criar `gateway/webhook-orchestrator.service.ts`; método `dispatch(provider, headers, rawBody): Promise<void>`; validar assinatura por provider (Stripe: `stripe-signature`, GitHub: `x-hub-signature-256`, TikTok: HMAC SHA256); despachar para fila WEBHOOKS via BullMQ com `{ provider, payload, tenantId }`
5. **Provider normalization** — criar interface `NormalizedProviderResponse<T>` com `provider`, `data`, `fetchedAt`, `tenantId`, `requestId`; atualizar SpotifyService, YouTubeService, TikTokService para retornar este formato via `IntegrationGatewayService`
6. **Registrar no IntegrationsModule** — adicionar todos os novos services ao `providers` e `exports`; atualizar `IntegrationsController` para usar `IntegrationGatewayService` em vez de chamar providers diretamente

## Relevant files
- `apps/api/src/modules/integrations/integration-base.service.ts`
- `apps/api/src/modules/integrations/integrations.module.ts`
- `apps/api/src/modules/integrations/integrations.controller.ts`
- `apps/api/src/modules/integrations/spotify/spotify.service.ts`
- `apps/api/src/modules/integrations/youtube/youtube.service.ts`
- `apps/api/src/modules/integrations/tiktok/tiktok.service.ts`
- `apps/api/src/queues/queue.constants.ts`

## Depends on
- Task #661 (auth chain — tenantId/userId necessários no gateway)
- Task #664 (queue processors — fila WEBHOOKS precisa ter processor)
