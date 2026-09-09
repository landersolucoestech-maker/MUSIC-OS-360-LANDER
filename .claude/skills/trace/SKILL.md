---
name: trace
description: Traces a single RequirementRecord (not a shared contract — see contract-tracing for that) all the way through its full chain — requirement -> implementing code -> test -> evidence -> gate result — to answer "is this requirement actually done, and can I prove it end to end." Use when closing out a requirement, or when a completion-gate BLOCKED reason cites a specific criterion and you need to see its full history.
---

# Trace

1. `node .claude/runtime/ops.mjs status` and read the specific `RequirementRecord` from
   `.claude/ops/state.json` for its `acceptanceCriteria`.
2. For each criterion, resolve every linked evidence id: `node .claude/runtime/ops.mjs record list
   --kind evidence` (or read `.claude/ops/evidence/<id>.json` directly) and check
   `workspaceFingerprint` freshness.
3. Grep the actual implementation the criterion's evidence command exercised, to confirm the
   evidence really covers the code path the requirement describes (not a coincidentally-passing
   unrelated test — see `.claude/rules/testing.md` false-green prevention).
4. Report the full chain: requirement text -> files touched -> command run -> PASS/FAIL ->
   fingerprint freshness — a single line per requirement is not sufficient traceability for a
   disputed or reopened requirement.
