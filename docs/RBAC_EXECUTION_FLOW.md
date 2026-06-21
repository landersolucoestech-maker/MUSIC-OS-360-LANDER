# RBAC Execution Flow

## Pipeline Real

Ordem global registrada em `AppModule`:

1. `RateLimitGuard`
2. `JwtAuthGuard`
3. `TenantGuard`
4. `RolesGuard`
5. `PermissionsGuard`
6. interceptors de contexto RLS, métricas, auditoria e handler

`RequestIdMiddleware` e `CorrelationMiddleware` executam antes dos guards.
Todo request recebe `requestId` e `traceId`; `traceparent`, `X-Trace-ID`,
`X-Correlation-ID` e `X-Request-ID` válidos são propagados.

## Fontes De Autoridade

- ACTIVE: `RolesGuard`, usando `org_members.role`, `@RequireRole` e a
  hierarquia legada.
- SHADOW: `PermissionResolverService.resolvePersisted`, usando
  `org_members.role_id`, `roles`, `role_inheritance`, `role_permissions`,
  `permissions` e dependências ativas.
- `RBAC_PERSISTED_AUTHORITY=SHADOW` não altera a resposta HTTP.
- `RbacService.getEffectivePermissions` mantém fallback legado apenas para
  consumidores de compatibilidade. O avaliador SHADOW não usa esse fallback,
  evitando falsos matches quando banco ou `role_id` estão indisponíveis.

## Ordem Da Decisão

Rotas com `@RequirePermission`:

1. `RolesGuard` calcula ACTIVE.
2. Se ACTIVE negar, ele executa e persiste SHADOW antes de lançar 403.
3. Se ACTIVE permitir, grava o estado no request.
4. `PermissionsGuard` executa SHADOW, compara e persiste.
5. Em SHADOW, a resposta continua sendo ACTIVE.

Resultados possíveis: `ALLOW_MATCH`, `DENY_MATCH`, `WOULD_ALLOW` e
`WOULD_DENY`.

Rotas apenas com `@RequireRole` não mudariam com a ativação do
`PermissionsGuard`; elas continuam sob a hierarquia legada e não geram uma
comparação de permissão. Essa cobertura deve permanecer visível no inventário
antes de qualquer promoção.

## Tenant E Membership

`TenantGuard` exige:

- JWT com `app_metadata.org_id`;
- `X-Tenant-ID` compatível com o tenant resolvido;
- membership ativa para `(tenant_id, auth_user_id)`.

O bootstrap usa `ADMIN_DATA_SOURCE` somente para identidade pré-RLS. Tenant e
membership têm cache Redis compartilhado com TTL de 60 segundos. Mutações de
membership invalidam a chave compartilhada. Sem Redis, o guard consulta
PostgreSQL diretamente.

## Cache

- L1: mapa local por instância, TTL de 60 segundos.
- L2: Redis em `rbac:value:*`.
- Índice de invalidação: `rbac:role:{roleId}:keys`.
- Canal pub/sub: `rbac:cache:invalidate`.
- Mutações de roles, grants, herança, dependências e conflitos invalidam roles
  descendentes e todas as instâncias.
- Falha Redis é degradada para PostgreSQL/L1 e enviada ao Sentry como
  `cache_failure`.

## Persistência E Auditoria

Cada permissão avaliada gera uma linha em `rbac_decision_logs`, particionada por
`created_at`, com índices de tempo, tenant, usuário, role, request, resource e
action. A retenção é configurada por `RBAC_DECISION_RETENTION_DAYS`.

O mesmo evento gera entradas append-only em `audit_logs` para decisão,
divergência e cache. Falhas de persistência nunca alteram a autorização.

## Observabilidade

- Prometheus: `rbac_requests_total`, `rbac_allow_total`, `rbac_deny_total`,
  `rbac_would_allow_total`, `rbac_would_deny_total`,
  `rbac_cache_hit_total`, `rbac_cache_miss_total`, `rbac_latency_ms`.
- Grafana: `infra/observability/grafana/dashboards/rbac-shadow.json`.
- Sentry: `would_allow`, `would_deny`, `authorization_failure`,
  `cache_failure`, `resolver_failure`.
- Readiness real: `npm run rbac:readiness` em `apps/api`.

## Fallbacks Reais

- JWT inválido: 401, sem RBAC.
- Tenant/membership ausente: 401/403.
- Resolver persistido indisponível: SHADOW registra DENY e
  `resolver_failure`; ACTIVE continua vigente.
- Redis indisponível: consulta PostgreSQL.
- Telemetria indisponível: decisão continua, erro é logado/Sentry.
- Modo `ON`: não foi ativado por esta implementação.
