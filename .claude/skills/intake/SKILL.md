---
name: intake
description: The very first triage step of any request — classify roughly what kind of work this is (bug/feature/audit/incident/question) and whether mission state already exists, before requirements-analyst does full formalization. Use at the start of a conversation to decide which workflow (greenfield/brownfield-change/incident/migration/recovery/release) actually applies.
---

# Intake

1. Check `.claude/ops/state.json` — if present, this is a `resume`, not new intake.
2. Classify the request: a live problem -> `incident` workflow; a schema/data change -> `migration`;
   a new project with no product code -> `greenfield`; a bounded change to existing code ->
   `brownfield-change`; a release/deploy -> `release`; recovering from a prior failure -> `recovery`.
3. Note anything the user explicitly said is OUT of scope right now — this becomes a
   `nonRequirements` entry once `requirements-analyst` runs, not something to silently forget.
4. Hand off to `requirements-analyst` (or `mission-recovery`/`recover` if resuming) with the
   classification and any explicit constraints — intake decides WHICH workflow, it doesn't do the
   workflow's own work.
