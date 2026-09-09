---
name: release-checkpoint
description: Produces the final closure report for a mission once completion-gate.mjs returns PASS — a durable record of what requirements were verified, what findings were disposed of and how, and what evidence backs closure. Use as the last step of systemic-audit, or of any L2+ task, before telling the user it's done.
---

# Release Checkpoint

Do not run this until `node .claude/runtime/completion-gate.mjs --run-gates` has actually returned
`PASS` — this skill documents closure, it does not decide it.

## Method

1. Run the completion gate and capture its output verbatim (status, workspace fingerprint,
   missionId).
2. Read the final `.claude/ops/state.json` and summarize: every RequirementRecord and its
   AcceptanceCriteria's closing evidence IDs; every Finding and its final disposition (Section 50);
   any `DIVIDA_ACEITA` dispositions with their justification, called out explicitly since those are
   accepted debt, not resolved issues.
3. Record a final checkpoint: `node .claude/runtime/ops.mjs checkpoint --label "mission closed:
   <missionId>"`.
4. If any continuous-improvement candidates were recorded during the mission
   (`.claude/ops/improvements.json`), surface them to the user for the `/improve` maintenance flow
   — do not silently apply them to rules/agents/skills as part of closing this mission
   (`.claude/rules/continuous-improvement.md`).
5. Present the summary to the user in plain terms: what was verified, what was fixed, what was
   accepted as known debt and why, what (if anything) is explicitly out of scope and left for a
   follow-up mission.

## Non-goals

Do not claim production readiness beyond what `.claude/rules/release-production.md` actually
allows this mission to have verified — a passing local gate is not a production health check.
