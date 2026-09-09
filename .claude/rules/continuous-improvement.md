# Continuous improvement

Observe only high-signal events:
- explicit user correction to behavior/output;
- same failure fingerprint repeats twice;
- recurring manual workflow with clear reusable value;
- missing rule/skill that caused a concrete defect or waste;
- contradiction between current rule/skill and repository reality;
- reviewer finding that exposes a generalizable blind spot.

Record a candidate with `node .claude/runtime/ops.mjs improve --text "..." --scope <rules|agents|skills|runtime>`. Do not auto-edit rules, agents or skills during the delivery task merely because an improvement was observed.

Apply proposals during `/improve` maintenance only after checking recurrence, scope, conflict with existing policy and whether a deterministic hook/test would enforce it better than prose. Prefer deleting/merging obsolete guidance to accumulating rules forever.
