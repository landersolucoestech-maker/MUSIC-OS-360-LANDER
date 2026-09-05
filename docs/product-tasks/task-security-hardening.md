# Security Hardening — CSP + CSRF + Rate Limiting + Audit Trails + Webhooks Assinados

## What & Why
O sistema não tem Content Security Policy, proteção CSRF, rate limiting enterprise por IP/tenant, validação de assinatura em todos os webhooks recebidos, nem rotation de tokens de integração. O `RateLimitService` existe mas apenas como esboço. Em produção multi-tenant com dados financeiros, contratos e fonogramas, a ausência dessas proteções representa risco crítico de segurança: injection de scripts via CSP ausente, CSRF em endpoints de mutation, abuso de API por força bruta, e replay de webhooks por atores mal-intencionados.

## Done looks like
- `Content-Security-Policy` header em todas as responses: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://r2.musicos360.com; connect-src 'self' https://api.clerk.dev`
- Helmet.js configurado com: `frameguard`, `hsts` (production), `noSniff`, `xssFilter`, `referrerPolicy`
- CSRF: `csurf` ou `@nestjs/csrf` aplicado em todos os endpoints de mutation (POST/PATCH/PUT/DELETE); `X-CSRF-Token` gerado por session e validado; webhook callbacks explicitamente excluídos via `@SkipCsrf()`
- Rate limiting enterprise: `ThrottlerModule` do NestJS com Redis storage; regras: `100 req/15min` por IP global; `1000 req/15min` por tenant; `10 req/min` em endpoints de auth (`/auth/*`); custom `X-RateLimit-*` headers
- Webhook assinatura obrigatória: nenhum webhook processado sem validação de assinatura (HMAC ou provider-specific); implementado via `WebhookOrchestratorService` (task #integration-gateway)
- Secrets não expostos em logs: `LoggingInterceptor` e `GlobalExceptionFilter` sanitizam request bodies removendo campos `password`, `token`, `secret`, `key`, `credential`
- Audit trail completo: toda mutation (CREATE/UPDATE/DELETE) em dados sensíveis (contratos, transações, usuários, integrações) registra no `audit_logs` via `AuditInterceptor` — `before`, `after`, `userId`, `tenantId`, `requestId`, `ip`, `userAgent`
- `AuditInterceptor` registrado globalmente: captura automaticamente mutations sem necessidade de chamada manual nos services
- `tsc --noEmit` sem erros

## Out of scope
- Penetration testing
- WAF (Web Application Firewall) — nível de infraestrutura
- 2FA / MFA (delegado ao Clerk)
- Encryption at rest do banco (Neon provider responsável)
- GDPR compliance (fase futura)

## Steps
1. **Helmet + CSP** — instalar `helmet`; configurar em `main.ts` com `app.use(helmet({ contentSecurityPolicy: { directives: {...} }, hsts: IS_PROD, ... }))`; definir CSP directives conservadores permitindo Clerk, R2 e WebSocket do próprio domínio
2. **Rate limiting enterprise** — instalar `@nestjs/throttler` com `ThrottlerStorageRedisService` (Upstash Redis); configurar `ThrottlerModule.forRoot({ throttlers: [{ ttl: 900, limit: 100 }] })`; sobrescrever por rota: `@Throttle({ default: { ttl: 60, limit: 10 } })` em endpoints auth; registrar `ThrottlerGuard` via `APP_GUARD`
3. **CSRF protection** — instalar `@nestjs/csrf`; configurar middleware que gera token CSRF por session via cookie `XSRF-TOKEN`; validar `X-XSRF-TOKEN` header em POST/PATCH/PUT/DELETE; skip decorator `@SkipCsrf()` para webhook callbacks e endpoints mobile; frontend: `api-client.ts` envia `X-XSRF-TOKEN` header automaticamente em todas mutations
4. **AuditInterceptor global** — criar `core/interceptors/audit.interceptor.ts` (já existe, verificar se completo); deve capturar mutations (método HTTP != GET), extrair `requestId`, `tenantId`, `userId`, `entity` do path, `before` do estado atual, `after` da response; chamar `AuditService.log()`; registrar via `APP_INTERCEPTOR` globalmente
5. **Log sanitization** — criar `core/utils/sanitize-log.ts` com função `sanitize(obj)` que remove campos sensíveis por nome (`password`, `token`, `secret`, `key`, `apiKey`, `credential`, `access_token`, `refresh_token`); aplicar em `LoggingInterceptor` (request body) e `GlobalExceptionFilter` (error context)
6. **Security response headers** — garantir que todas as responses incluem: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`

## Relevant files
- `apps/api/src/main.ts`
- `apps/api/src/app.module.ts`
- `apps/api/src/core/interceptors/audit.interceptor.ts`
- `apps/api/src/core/interceptors/logging.interceptor.ts`
- `apps/api/src/core/filters/global-exception.filter.ts`
- `apps/api/src/core/security/rate-limit.service.ts`
- `client/src/shared/lib/api-client.ts`

## Depends on
- Task #666 (Observabilidade — requestId necessário no audit trail)
- Task #661 (auth chain — tenantId/userId necessários no audit)
