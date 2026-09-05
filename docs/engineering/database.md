---
paths:
  - "apps/api/src/database/**"
  - "apps/api/scripts/db-ops.ts"
description: Migrations, RLS, and schema conventions
---

# Database (apps/api/src/database)

- Migrations live in `apps/api/src/database/migrations/*.ts`, applied through the custom
  toolchain in `apps/api/scripts/db-ops.ts` via the `db:migrate` / `db:check` / `db:generate`
  family of scripts — never hand-run raw SQL against a real environment, and never assume the
  bare TypeORM CLI is wired up here.
- Every tenant-scoped table needs RLS + policies. The source of `verify:rls` and `verify:tenant-isolation`
  (`apps/api/scripts/verify-rls.ts`, `verify-tenant-isolation.ts`) defines what coverage is checked,
  matching CI job `db-verify-fresh-postgres`; however **execution safety is separate from coverage**.
  `verify:tenant-isolation` is classified as a database mutation unless current source proves otherwise,
  so do not execute it outside an explicitly authorized isolated/disposable target.
- Some migrations are `EXTERNAL_MANAGED` (e.g. Realtime) and must be excluded from
  `db:migrate:application`/`db:check:application` — see
  `apps/api/src/database/migrations/*RealtimeBroadcastAuthorization*` and
  `scripts/verify-realtime-external.ts` for why; don't fold external-managed migrations into the
  application-managed path.
- New columns/tables: consider nullability, defaults, and backward compatibility for existing
  rows — this repo has migrations specifically for backfills and safe-column additions
  (`AddMissingSafeColumns`, `MakeShareRegistryFieldsNullable`) because that's the established
  pattern for evolving live tenant data safely.
- A migration is not "done" without a corresponding down/rollback path when the existing
  convention has one, and without running `db:check` to confirm no pending state.
- `database-reviewer` is read-only by default; it reviews schema, indexes, constraints, RLS
  coverage, and migration safety before a migration is considered mergeable.
