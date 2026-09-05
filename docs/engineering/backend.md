---
paths:
  - "apps/api/**"
description: Backend conventions (NestJS API), excluding database internals (see database.md)
---

# Backend (apps/api)

- Stack: NestJS, TypeORM, class-validator/class-transformer DTOs, Zod where used, BullMQ for
  queues, Supabase JS for auth/storage integration, Sentry, PostHog.
- Real scripts: `dev`, `build` (`tsc -p tsconfig.build.json`), `typecheck`, `lint`
  (`eslint src --ext .ts`), `test`/`test:ci`/`test:e2e` (Jest). Full list in
  `apps/api/package.json` — don't invent a script name.
- Every new/changed endpoint needs: a validated DTO, authorization appropriate to the resource
  (tenant scoping + RBAC via the existing guards/decorators in `src/core/guards`,
  `src/core/decorators`), and error handling that doesn't leak internals.
- Controllers stay thin; business rules belong in services. Follow the module boundary that
  already exists for the feature area rather than inventing a new one.
- Idempotency and transaction boundaries matter for anything touching money, licensing, or
  inventory — check how sibling services in the same module handle it before writing new logic.
- `backend-reviewer` checks DTOs/validation, authorization, idempotency, transactions, and
  contract consistency with the frontend on anything you touch here.
