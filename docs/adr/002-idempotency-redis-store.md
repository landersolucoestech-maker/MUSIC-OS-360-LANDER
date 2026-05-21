# ADR-002: Redis-Backed Idempotency Store for Financial Writes

**Status:** Accepted  
**Date:** 2026-05-21  
**Deciders:** Engineering team

## Context

POST /contracts and POST /transactions are financial operations where duplicate execution causes real-world harm (double billing, duplicate legal documents). An `X-Idempotency-Key` header was added to both endpoints. The initial implementation used a module-level `Map<string, CachedEntry>` — simple but breaks across multiple API replicas.

## Decision

Introduce `IdempotencyStore` — an injectable service with a Redis backend (ioredis) that falls back to in-memory when Redis is unavailable.

Cache key format: `idem:{userId}:{idempotencyKey}` (Redis) — scoped per user.  
TTL: 24 hours (configurable via `IDEMPOTENCY_TTL_HOURS`).  
In-flight detection: placeholder entry with `expiresAt = -1`.

## Consequences

**Positive:**
- Idempotency is consistent across API replicas in production
- Graceful degradation: Redis failure → in-memory (single replica safety)
- Redis failure mid-request doesn't break the response

**Negative:**
- Redis is now required in production (`REDIS_QUEUE_URL` env var)
- Slight latency added to first request (Redis SET before handler)

## Rejected Alternatives

- **PostgreSQL-backed store**: avoids Redis dependency but adds DB load for a hot-path
- **Keep in-memory**: sufficient for single replica but unsafe for horizontal scaling
