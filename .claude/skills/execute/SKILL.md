---
name: execute
description: Runs one task-spec now — the actual doing-the-work step, wrapping implementation-engineer against a single bounded task-spec record rather than a whole mission. Use once feature-planner/cross-layer-impact has produced a concrete task-spec; use systemic-audit for the whole multi-phase mission.
---

# Execute

1. `node .claude/runtime/ops.mjs record add --kind task --data '{"title":"...","criterionIds":
   [...],"changeSetId":"...","assignedAgent":"implementation-engineer","status":"PENDING"}'` if the
   task-spec doesn't already exist.
2. Mark it `IN_PROGRESS`, delegate to `implementation-engineer` scoped to exactly its
   `changeSetId`'s file list.
3. On completion, run the gates appropriate to the task's impact level (`regression-gates` skill or
   `gate` skill directly).
4. Mark the task `DONE` only once its criteria have fresh PASS evidence — `BLOCKED` with a stated
   reason if a gate failed, not silently left `IN_PROGRESS`.

## Non-goals
Not a substitute for the mission-level orchestration in `systemic-audit` — this skill executes one
already-scoped unit, it doesn't decide what units exist.
