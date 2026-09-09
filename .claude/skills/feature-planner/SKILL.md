---
name: feature-planner
description: Plans a new feature before implementation — requirements, architecture shape, and a task-spec breakdown — the planning half of brownfield-change made explicit as an invokable skill for when the user wants a plan reviewed before any code is written. Use when the user asks to plan/design a feature, not when they've already approved an approach and want it built.
---

# Feature Planner

1. Delegate to `requirements-analyst` for RequirementRecords + AcceptanceCriteria, then
   `requirements-reviewer` to challenge them independently before planning proceeds.
2. Delegate to `architecture-reviewer`/`technology-selection-reviewer` for any structural or new-
   dependency decision the feature needs, recording the rationale as a `decision-record`.
3. Run `cross-layer-impact` to identify every layer the feature actually touches.
4. Break the result into `task-spec` records, each scoped to one coherent `change-set`, ordered by
   dependency (schema before backend before frontend, etc.) — record via `node
   .claude/runtime/ops.mjs record add --kind task ...` for each.
5. Present the plan (requirements, architecture decisions, task breakdown, dependency order) for
   confirmation before `execute`/`implementation-engineer` starts building.

## Non-goals
Does not implement anything itself — output is a reviewed plan and task-spec records, not code.
