---
name: impact
description: Runs impact.mjs to compute the runtime-detected impact level from touched files/diff content and combine it with any operator-declared level. Use at the start of any L2+ task, before selecting which reviewers/gates apply — the detected level is a floor an agent cannot talk down from.
---

# Impact

`node .claude/runtime/impact.mjs [--declared=L2]`. Persists the result into `.claude/ops/state.json`
if mission state exists. The `effective` field in the output (max of declared and detected) drives
`.claude/policies/gate-matrix.json`'s required-gates lookup and `.claude/gates/completion.json`'s
`impact-scoped-package-scripts` check. Extend `.claude/policies/impact-levels.json`'s
`pathRules`/`contentRules` (never hardcode a heuristic in runtime code) when a project has a
detection gap this pack's defaults miss.
