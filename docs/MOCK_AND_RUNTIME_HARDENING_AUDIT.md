# MUSIC OS 360 — Mock and Runtime Hardening Audit

## Decision

Production must never depend on mock data, localStorage source-of-truth, or auth bypass.

Local mock mode may exist only as an explicit development tool. Production builds force `MOCK_MODE=false` in `apps/web/src/shared/lib/env.ts`.

## Current Hardening Applied

- Removed runtime auth bypass from frontend auth provider, route guards, tenant provider, plan features, role hooks, API JWT guard, tenant guard, and API bootstrap.
- Removed auth bypass env references from environment files.
- Removed duplicated nested `apps/web/pnpm-lock.yaml`.
- Root database scripts now delegate to the API database operations instead of invoking Drizzle CLI directly.
- Pending frontend storage tables now throw in production instead of falling back to in-memory mock data.
- Frontend API mappings for HR and content detections were aligned with existing backend routes.
- Vite manual chunks were simplified to vendor-only groups to avoid feature-module circular chunk warnings during web builds.

## Remaining Mock Surfaces To Convert

| Area | Current Risk | Required Future Action |
|---|---|---|
| `apps/web/src/shared/lib/storage.ts` | Local mock storage remains for development | Dev-only explicit mode; pending tables are blocked in production |
| Integration hooks | Several providers return stubs in `MOCK_MODE` | Move provider stubs behind explicit dev adapters |
| AI frontend memory/analytics | Some dev analytics persist in localStorage | Backend-backed AI memory and cost ledger |
| Admin data | Admin pages contain static mock data | Replace with tenant-aware admin APIs or remove from production bundle |
| Inventory route | Frontend module exists; backend module not confirmed | Kept as pending and production-blocked until implemented |
| Vite ACRCloud middleware | Dev server returns mock ACRCloud responses | Keep dev-only; production must use NestJS integration |

## Production Gate

Before production deployment:

- `VITE_USE_MOCK=false`
- `VITE_MOCK_MODE=false`
- `NODE_ENV=production`
- `SUPABASE_URL` present
- `DATABASE_URL` present
- `REDIS_QUEUE_URL` present or queues explicitly disabled by ADR
- no auth-bypass env flag exists
- global search for legacy auth-bypass markers returns no matches
