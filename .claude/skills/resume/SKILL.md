---
name: resume
description: Short-form entry point for mission-recovery — re-anchoring from mission state after a context compaction or a fresh conversation, with no failure involved (see recover for that case). Use this when the question is "where was I", not "what broke".
---

# Resume

Runs the `mission-recovery` skill's method: check for `.claude/ops/state.json`, run `ops.mjs
status`, read requirements/findings directly, check the last checkpoint against current
`git status`/`git diff`, read `docs/NAMING_NORMALIZATION_CANONICAL_MAP.md`, and resume at the first workflow phase with
open work — never restart discovery/requirements that are already recorded.
