# Requirement Traceability

For L2+ work normalize explicit user/product requirements into `RequirementRecord`s. Preserve constraints and explicit non-requirements; do not silently reinterpret them.

Each RequirementRecord has one or more executable/verifiable AcceptanceCriteria. Each criterion closes only with fresh PASS evidence. Use trace links for relevant implementation files/contracts when useful.

The required chain is:
`request -> requirement -> acceptance criterion -> implementation/change -> evidence -> gate result`.

Requirements review must challenge dropped, narrowed, adjacent-but-different and out-of-scope behavior.

## Practical mechanism

`node .claude/runtime/ops.mjs requirement add --text "..." [--non-requirement "..."]` then `criterion add --requirement <id> --text "..."`. `node .claude/runtime/ops.mjs status` reports open criteria and whether the mission is ready for the completion gate.
