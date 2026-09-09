# Feature Planner — Worked Task Breakdown Example

**Request**: "let artists split royalty payments with collaborators."

## Weak plan (do not write this)
- Task 1: "add royalty splitting" (one giant task, no dependency order, no acceptance criteria)

## Correct plan
1. **Requirements** (`requirements-analyst` + `requirements-reviewer`): RequirementRecord —
   "an artist can add up to N collaborators with a percentage split summing to 100%"; explicit
   non-requirement — "does not cover mid-payout-period split changes, that's a follow-up."
2. **Architecture/decision**: does an existing `payments` or `royalties` module own this, or is it
   new? Recorded as a `decision-record` after `architecture-reviewer` input.
3. **Task-spec breakdown**, in dependency order:
   - `task-1`: schema change (add `royalty_splits` table) — via `schema-normalization`.
   - `task-2`: backend validation + persistence (depends on task-1).
   - `task-3`: API endpoint to set/read splits (depends on task-2).
   - `task-4`: frontend UI for setting splits (depends on task-3) — via `frontend-design`.
   - `task-5`: payout calculation update to actually apply the split (depends on task-2).
4. **Acceptance criteria**, one per task, each independently verifiable (e.g. task-1: "migration
   applies cleanly and `db:check` passes"; task-5: "a test payout with a 60/40 split produces the
   correct two payment records").

Each task is independently implementable and testable; nothing assumes an unstated later step.
