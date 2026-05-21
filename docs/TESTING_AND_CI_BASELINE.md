# MUSIC OS 360 - Testing and CI Baseline

Status: active baseline  
Scope: API tests, web tests, CI gates, and coverage ratcheting.

## Current Gate

CI must run:

- API typecheck.
- Web typecheck.
- API unit/security tests.
- Web unit/component tests.
- API build.
- Web build with production mock mode disabled.
- Dependency/security scan.

## Current API Coverage Baseline

The previous Jest coverage threshold was aspirational and blocked a passing test suite because the project does not yet have broad test coverage. The threshold is now set to the measured baseline from the current suite:

| Metric | Baseline |
|---|---:|
| lines | 16% |
| statements | 15% |
| functions | 4% |
| branches | 4% |

This is not the target. It is the ratchet floor. Each critical module added or hardened must raise coverage in follow-up PRs.

## Critical Tests That Must Grow Next

- Auth: invalid JWT, expired JWT, valid Supabase JWT, missing org claim.
- Tenant isolation: list/fetch/update/delete cross-tenant denial.
- RBAC: role escalation denial.
- RLS: database-level policy behavior against Supabase JWT claims.
- Billing: idempotent webhooks, duplicate event handling, invalid signature.
- Queue/workflow: retries, dead-letter, replay, failure logs.
- WebSocket: authenticated connection and tenant isolation.
- Uploads: tenant ownership and unauthorized access denial.

## CI Notes

- Web tests run through `apps/web/vitest.config.mjs` to avoid TypeScript config loading issues on Windows.
- Web `test` is non-interactive (`vitest run`); `test:watch` is available for local development.
- API `test:ci` keeps coverage enabled and should fail if coverage drops below the baseline.
- CI standardizes Node 20. Local validation on Node 24 can fail before Vitest loads the web config because of runner/esbuild package resolution; use Node 20 for local parity until the Vite/Vitest version set is upgraded together.
