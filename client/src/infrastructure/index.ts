/**
 * infrastructure/index.ts
 *
 * Barrel raiz da camada de infraestrutura.
 *
 * Contém:
 *  api/         — HTTP clients, interceptors
 *  queue/       — BullMQ / in-memory queue
 *  websocket/   — realtime connections
 *  redis/       — Redis connection, pub/sub, distributed locks
 *  cache/       — Redis / localStorage
 *  monitoring/  — Sentry, health checks
 *  logging/     — structured logging
 *  telemetry/   — OpenTelemetry traces
 *  storage/     — Cloudflare R2, S3
 *  auth/        — Clerk, JWT, sessions
 *  database/    — Drizzle ORM, Postgres
 *  ai/          — AI proxy, rate limiting
 *  workers/     — BullMQ worker base, job processors
 *  integrations/ — third-party clients
 */
export {};
