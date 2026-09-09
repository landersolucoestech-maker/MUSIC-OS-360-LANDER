---
name: continuous-improvement
description: The recording half of .claude/rules/continuous-improvement.md — observes high-signal events during a mission (explicit user correction, a repeated failure fingerprint, a recurring manual workflow, a rule/skill gap that caused a real defect) and records a candidate. The applying half is the improve skill, run separately during maintenance.
---

# Continuous Improvement (recording)

Watch for exactly these signal types during a mission, nothing looser:
- an explicit user correction to behavior/output;
- the same failure fingerprint repeating twice (see gate-result/failure-record);
- a recurring manual workflow with clear reusable value;
- a missing rule/skill that caused a concrete defect or waste;
- a contradiction between a current rule/skill and repository reality;
- a reviewer finding that exposes a generalizable blind spot (not a one-off).

When one occurs: `node .claude/runtime/ops.mjs improve --text "..." --scope
rules|agents|skills|runtime`. Do not edit rules/agents/skills mid-mission because of this — that's
exactly what the separate `improve` skill's deliberate maintenance pass is for.
