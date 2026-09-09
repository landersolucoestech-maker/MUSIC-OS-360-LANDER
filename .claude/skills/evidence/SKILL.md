---
name: evidence
description: Short-form alias for evidence-collection — attaches COMMAND or REVIEW evidence to an acceptance criterion by actually executing a command or recording a completed review. Use this name when you just need the two commands; use evidence-collection for the full governance rationale.
---

# Evidence

`node .claude/runtime/ops.mjs evidence run --cmd "<real command>" --criterion <id>` (executes and
records PASS/FAIL bound to the current workspace fingerprint) or `evidence review --reviewer
<agent> --verdict PASS|FAIL --summary "..." --criterion <id>` (only after that agent has actually
finished). See the `evidence-collection` skill for the full rules (freshness, why fabrication is
impossible to detect and therefore an integrity rule not just a mechanical one).
