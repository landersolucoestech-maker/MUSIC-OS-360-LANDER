---
name: schema-normalization
description: Safely renames or restructures a database column/table to match a canonical-map decision without breaking existing data or requiring simultaneous deploy of every consumer. Use whenever a canonical-naming decision or a database-reviewer finding requires an actual schema change.
---

# Safe Schema Normalization

This is L4/L5 work by definition (`.claude/rules/00-execution-protocol.md` §2,
`.claude/rules/data-governance.md`). Never hand-run raw SQL against a real environment; always go
through the project's actual migration tooling (`repo-intelligence` identifies which).

## Method (expand-migrate-contract, not rename-in-place)

1. **Expand**: add the new canonical column/table alongside the old one. Nullable or defaulted so
   existing rows and the currently-deployed application version keep working.
2. **Backfill**: a migration or script copies existing data from old to new. Idempotent — safe to
   re-run. For a large table, batch the backfill and check the project's convention for how it
   handles locking/runtime cost on big tables.
3. **Dual-write** (if a deploy gap is possible): application writes both old and new during the
   transition window, so neither version of the app run during rollout sees stale data.
4. **Migrate reads**: move consumers (queries, ORM entities, DTOs, frontend types) to the new
   canonical name, one bounded batch at a time, via `cross-layer-impact` to make sure none are
   missed.
5. **Contract**: once no consumer reads the old column/table and at least one full deploy cycle has
   passed, drop it in a separate, explicitly-labeled migration — never combined with the expand
   step.
6. Every migration in this sequence needs a down/rollback path if the project's existing
   convention has one, and `db:check`-equivalent validation with no pending state before moving to
   the next step.

## Output

Update `docs/NAMING_NORMALIZATION_CANONICAL_MAP.md` status to `migrating` at step 1 and `done` only after step 5
actually lands. Record each step's evidence via `ops.mjs evidence run` against the real migration
command.
