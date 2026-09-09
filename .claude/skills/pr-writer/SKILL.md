---
name: pr-writer
description: Writes the pull-request description (summary + test plan) from the mission's actual requirements, findings, and evidence — not from memory of what was discussed. Use once git-auditor has confirmed the diff matches declared scope, right before the user asks to open/update a PR.
---

# PR Writer

1. Read the closed `RequirementRecord`s and their acceptance criteria from `.claude/ops/state.json`
   — the summary describes what was actually verified, not just what was attempted.
2. List findings with `disposition: CORRIGIDA` as fixed, and any `DIVIDA_ACEITA` findings explicitly
   as known accepted debt with their justification — a PR description that hides accepted debt sets
   up a future surprise.
3. Test plan section lists the actual evidence commands run (`node .claude/runtime/ops.mjs record
   list --kind evidence` for the mission), not a generic "tests pass."
4. Never open/push the PR yourself — this skill produces the text; opening a PR is an
   EXTERNAL_WRITE action requiring the user's explicit go-ahead per `.claude/rules/git-safety.md`.
