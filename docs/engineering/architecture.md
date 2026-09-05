---
description: MUSIC OS 360 architecture map — verify current repository before structural change
---

# Architecture

This pack was designed for the MUSIC OS 360 monorepo baseline that uses pnpm workspaces/Turborepo, an API application under `apps/api`, a web application under `apps/web`, shared `packages/*`, PostgreSQL/Supabase data boundaries, and tenant isolation/RLS. **The current repository is authoritative.** Before a structural change, verify the actual root manifests, workspace files, source tree, ORM/database layer and current dependency versions. Do not treat a version number copied into this rule as product truth.

Preserve established architecture unless the requested work actually requires a boundary change. In particular, do not casually introduce a second package manager, competing ORM, parallel migration mechanism, duplicate state-management source, or second tenant/security boundary.

For database changes, inspect the current scripts and migrations before deciding whether a `db:*`/`verify:*` command is read-only or mutating; command names are not evidence. For tenant-sensitive behavior, verify current RLS/tenant-context implementation rather than assuming historical paths still match.

If the repository no longer matches this baseline, record the discovered current architecture and update the durable project documentation/rule through the reviewed improvement path. `architecture-reviewer` owns independent review of meaningful boundary/contract changes.
