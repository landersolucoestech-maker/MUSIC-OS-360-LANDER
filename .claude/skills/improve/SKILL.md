---
name: improve
description: The executable /improve maintenance flow named in .claude/rules/continuous-improvement.md — reviews recorded improvement candidates (.claude/ops/improvements.json) and applies the ones that pass its checks to rules/agents/skills/runtime. This is the ONLY place those files get edited based on an observed pattern; never mid-mission.
---

# Improve

1. Read `.claude/ops/improvements.json` (via `node .claude/runtime/ops.mjs improve --text "..."`
   entries recorded during missions).
2. For each candidate, check: has this exact issue recurred (not a one-off)? Is the scope precise
   (which rule/agent/skill/runtime file, not "make things better")? Does it conflict with existing
   policy? Would a deterministic hook/test enforce it better than another line of prose?
3. Apply only the candidates that pass — edit the specific rule/agent/skill/runtime file, run
   `node .claude/runtime/registry.mjs` and the test suite to confirm nothing broke, then mark the
   candidate's `appliedAt`.
4. Prefer deleting/merging obsolete guidance over accumulating rules forever — an applied
   improvement that makes an existing rule redundant should replace it, not sit alongside it.

## Non-goals
Do not run this mid-mission just because an agent noticed something — that's what
`ops.mjs improve` recording is for; this skill is the separate, deliberate maintenance pass.
