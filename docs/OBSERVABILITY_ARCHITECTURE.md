# MUSIC OS 360 - Observability Architecture

Status: active baseline  
Scope: API observability, request traceability, audit correlation, health, and production gates.

## Baseline

The platform uses a layered observability model:

- `RequestIdMiddleware` reads or generates `X-Request-ID`.
- `CorrelationMiddleware` reads or generates `X-Correlation-ID`.
- `LoggingInterceptor` emits structured HTTP logs with request, tenant, user, latency, and correlation metadata.
- `GlobalExceptionFilter` returns request/correlation identifiers in error responses and reports unexpected errors to Sentry.
- `AuditInterceptor` links audited mutations to the same correlation context.
- `DomainEventLog` stores emitted operational events with `correlation_id`.
- `HealthModule` exposes liveness/readiness checks.

## Request Headers

| Header | Direction | Purpose |
|---|---|---|
| `X-Request-ID` | input/output | Unique HTTP request trace id |
| `X-Correlation-ID` | input/output | Cross-event operation trace id |
| `X-Idempotency-Key` | input | Idempotent mutation guard |
| `Authorization` | input | Supabase JWT |
| `X-Tenant-ID` | input | Context hint only; server/JWT remains authoritative |

## Production Rules

- Every API error response must include `requestId` and `correlationId`.
- Every structured HTTP log must include `requestId` and `correlationId`.
- Critical mutations must emit audit/activity/domain events.
- Workflow, queue, billing, upload, and AI operations must propagate correlation metadata.
- Sentry failures must never break the user response.

## Current Coverage

| Surface | Status | Notes |
|---|---|---|
| HTTP request logs | covered | Structured JSON via `LoggingInterceptor` |
| HTTP errors | covered | `GlobalExceptionFilter` includes `requestId` and `correlationId` |
| Audit logs | covered | `AuditInterceptor` reads `CorrelationContext` |
| Domain events | covered | Event log supports `correlation_id` |
| Health checks | covered | API health module exists |
| Queue jobs | partial | Existing processors log failures; correlation propagation must be enforced per job payload |
| WebSocket | partial | Auth exists; correlation/session metrics require a dedicated gateway audit pass |
| Frontend Sentry | partial | Sentry initializes when DSN exists; feature modules still contain dev/mock integration adapters |

## Next Required Work

- Add tests asserting `X-Correlation-ID` is accepted and returned.
- Add queue job metadata standard: `tenantId`, `userId`, `requestId`, `correlationId`.
- Add workflow execution metrics: started, completed, failed, retried, dead-lettered.
- Add billing/webhook observability: idempotency key, provider event id, retry count, tenant id.
- Add dashboards for API latency, 4xx/5xx rates, queue depth, workflow failures, AI cost, and tenant activity.
