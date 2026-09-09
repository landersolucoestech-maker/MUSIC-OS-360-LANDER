---
name: security-audit
description: A focused, standalone security pass across a broader scope than one change — orchestrates security-reviewer, ai-llm-systems-reviewer (if AI/LLM code is in scope), and compliance-reviewer (if a regime applies) together, for a periodic/on-demand audit rather than per-change review. Use when the user explicitly asks for a security audit, not for the automatic per-change security-reviewer pass that L5 work already triggers.
---

# Security Audit

1. Scope the audit: whole repo, one module, or one boundary (auth, an integration, a data export) —
   state the scope explicitly, since "the whole system" and "this endpoint" need different depth.
2. Delegate `security-reviewer` against `references/checklist.md` for the scoped area.
3. If AI/LLM code is in scope, also delegate `ai-llm-systems-reviewer`.
4. If a compliance regime is established for the project, also delegate `compliance-reviewer`.
5. Consolidate findings; a CRITICAL/HIGH finding here follows the same disposition/evidence rules
   as any other finding — no separate "security exception" path exists.

## Output
Every finding via `node .claude/runtime/ops.mjs finding add --category G ...`; the audit's own
closing evidence via `evidence review --reviewer security-audit --verdict PASS|FAIL --summary
"scope covered: ..."` so the scope itself is on record, not just the findings.
