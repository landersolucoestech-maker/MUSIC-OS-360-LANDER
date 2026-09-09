---
name: regression-gates
description: Runs the incremental (per-batch) or global (end-of-mission) verification gates appropriate to the current impact level, recording each as real executed evidence. Use after every implementation batch (incremental) and once more before mission closure (global).
---

# Regression Gates

Never invent a script name — read `package.json` (or the project's real build tool config) for
what actually exists. `.claude/policies/gate-matrix.json` maps impact level to required gate
categories; extend `defaultScriptNames` there once, don't hardcode script names per call.

## Incremental (per batch)

Run, in order, stopping at the first failure to investigate before continuing:

1. `node .claude/runtime/ops.mjs evidence run --cmd "<lint command>" --criterion <id>`
2. typecheck (if the stack has one)
3. focused/module test command scoped to the changed area
4. build, only if the batch's impact level requires it per the gate matrix

## Global (end of mission)

Everything above at full-repo scope, plus: full test suite, full build, any migration validation
script the project has, any contract validation (OpenAPI lint, generated-client diff), and a full
`node .claude/runtime/completion-gate.mjs --run-gates` run.

## Failure handling

A failed gate is investigated, not narrated past. Two materially identical failures on the same
fix trigger the loop-breaker in `.claude/rules/00-execution-protocol.md` §4 — change strategy
rather than repeating the same edit a third time. Never delete, skip, or weaken a check to reach
green (`.claude/rules/testing.md`).
