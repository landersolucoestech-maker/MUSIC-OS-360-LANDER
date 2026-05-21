# MUSIC OS 360 — Architecture Governance

## Decisions

All durable architecture decisions must be recorded as ADRs under `docs/adr/`.

ADR required for:

- authentication, tenant, RBAC, or RLS changes;
- ORM or migration strategy changes;
- billing, metering, or financial operation changes;
- workflow automation engine behavior;
- AI actions that affect user data or cost;
- integration provider contracts;
- cross-module data model changes.

## RFC Process

Use RFCs before implementation when a change:

- introduces a new canonical entity;
- changes a public API contract;
- adds background processing, retries, or DLQ behavior;
- adds a provider integration;
- changes billing/plan limits;
- changes tenant isolation strategy.

Minimum RFC sections:

- Problem.
- Non-goals.
- Domain model.
- API contract.
- Tenant/RBAC/RLS impact.
- Observability and audit impact.
- Migration and rollback.
- Test plan.
- Operational risks.

## Merge Policy

Required before merge:

- typecheck for affected workspace;
- build for affected workspace;
- relevant unit/integration tests;
- migration validation when schema changes;
- no production auth bypass or mock-mode dependency;
- no new cross-tenant access path.

## Package Manager

Canonical package manager: `pnpm@10.11.0`.

Canonical lockfile: root `pnpm-lock.yaml`.

Nested lockfiles are not allowed unless an ADR explicitly approves a separate deployment boundary.

## ORM and Database Governance

Runtime ORM: TypeORM.

Schema changes must use API migration tooling under `apps/api/src/database/migrations`.

Root database scripts must delegate to `apps/api` database operations. Direct Drizzle CLI usage from the root is not part of the production governance path.

