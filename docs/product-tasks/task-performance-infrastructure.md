# Performance & Infrastructure — Cache + Bundle + Lazy Loading + Docker + Health

## What & Why
O sistema não tem cache distribuído (toda query vai direto ao banco Neon em cada request), o bundle frontend não tem code splitting por módulo (todos os 15 módulos carregam no primeiro load), não há lazy loading de rotas, sem Docker padronizado para deploy, e sem CI/CD configurado. Em produção com múltiplos tenants simultâneos, queries repetidas sem cache degradam latência e custam créditos Neon. Bundle monolítico aumenta TTI (Time to Interactive) e prejudica UX em conexões lentas.

## Done looks like
- Cache Redis distribuído: `CacheModule` global com `@nestjs/cache-manager` + `cache-manager-redis-yet` (Upstash); cache automático em `@Get()` via `@UseInterceptors(CacheInterceptor)` para endpoints de leitura pública (analytics, catálogo público); TTL configurável por rota via `@CacheTTL(seconds)`
- Cache invalidation: toda mutation (CREATE/UPDATE/DELETE) invalida as chaves Redis correspondentes via `CacheService.invalidate(pattern)`
- Bundle splitting: cada módulo React tem `React.lazy()` + `Suspense` na rota; `vite.config.ts` com `manualChunks` separando: `vendor` (react, radix), `ui` (shadcn), `charts` (recharts), e um chunk por módulo principal
- Lazy loading: todas as rotas de página usam `React.lazy(() => import('./pages/X'))` via helper `lazyRoute()`; `<Suspense fallback={<PageSkeleton />}>` envolve o router
- Bundle análise: `vite-bundle-visualizer` ou `rollup-plugin-visualizer` disponível via `npm run build:analyze` — gera `dist/report.html`
- Docker: `Dockerfile` multi-stage para `apps/api`: `builder` (instala deps + build NestJS) → `runner` (Node alpine, apenas dist/); `.dockerignore` correto; `docker-compose.yml` para dev local com Redis + API
- Health checks aprimorados: `GET /health` retorna `{ status, uptime, version, db: { status, latencyMs }, redis: { status, latencyMs }, queues: { active, waiting, failed } }` — usado pelo Docker healthcheck e load balancer
- `npm run build` sem erros; bundle frontend < 2MB total (gzipped)

## Out of scope
- Autoscaling (Kubernetes / ECS — nível de infraestrutura)
- CDN para assets (configuração de DNS/edge)
- Database read replicas
- Profiling de queries individuais (índices cobertos em task database-governance)

## Steps
1. **Cache Redis global** — instalar `@nestjs/cache-manager` e `cache-manager-redis-yet`; configurar `CacheModule.registerAsync()` no `AppModule` com `UPSTASH_REDIS_URL` + `UPSTASH_REDIS_TOKEN`; registrar `CacheInterceptor` globalmente; aplicar `@CacheTTL(300)` em endpoints de analytics e catálogo; `@CacheKey()` customizado incluindo `tenantId` para isolamento de cache por tenant
2. **Cache invalidation** — criar `core/cache/cache.service.ts` com `invalidate(pattern: string)`: usa Redis SCAN + DEL para limpar chaves por padrão; chamar em mutations críticas: `onSuccess` de create/update/delete nos services
3. **Vite code splitting** — atualizar `vite.config.ts`: `build.rollupOptions.output.manualChunks` separando `react-vendor`, `radix-ui`, `recharts`, `tanstack`; cada módulo de rota como chunk separado via dynamic import; `build.chunkSizeWarningLimit: 1000`
4. **Lazy routes** — criar `client/src/app/routes/lazy-route.ts` helper: `const LazyPage = React.lazy(() => import('../pages/X'))`; atualizar todas as route factories (15 módulos) para usar lazy + Suspense com `<PageSkeleton />`; manter a estrutura existente de `*.routes.tsx`
5. **Docker multi-stage** — criar `apps/api/Dockerfile` com estágios `deps` (npm ci), `builder` (npm run build), `runner` (node:20-alpine, apenas `dist/` e `node_modules`); criar `docker-compose.yml` raiz com services `api` (porta 3001) e `redis` (upstash local mock ou real); criar `.dockerignore`
6. **Health check aprimorado** — estender `health.controller.ts` (criado na task observabilidade): adicionar latência de DB (SELECT 1 cronometrado) e latência Redis (PING cronometrado); retornar status `degraded` se latência > 500ms; configurar Docker `HEALTHCHECK CMD curl -f http://localhost:3001/health`

## Relevant files
- `apps/api/src/app.module.ts`
- `apps/api/src/main.ts`
- `vite.config.ts`
- `client/src/app/routes/`
- `client/src/app/App.tsx`
- `apps/api/Dockerfile` (a criar)
- `docker-compose.yml` (a criar)

## Depends on
- Task #666 (observabilidade — health controller base)
- Task #661 (auth chain — tenantId necessário para cache key isolation)
