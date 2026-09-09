# Evidence Governance

Evidence has provenance, scope, producer, status and workspace identity. Claims and inferences may guide investigation but cannot satisfy deterministic gates.

PASS evidence used for completion must be fresh for the current workspace unless it is explicitly immutable/non-change-sensitive. Agent review evidence must include a machine-readable `VERDICT` and is recorded only after the agent ends.

Never manually create a PASS EvidenceRecord for a command that was not executed or a review that did not occur. If evidence is imported from CI or an external system, bind it to artifact/source identity and environment.

For L2+, close each acceptance criterion with one or more fresh EvidenceRecord IDs. A requirement with no criteria or a criterion with stale/missing evidence blocks completion.

## Practical mechanism

`node .claude/runtime/ops.mjs evidence run --cmd "<command>" --criterion <id>` is the only sanctioned way to attach COMMAND evidence: it actually executes the command, captures the real exit code, and binds the result to the workspace fingerprint at execution time. `evidence review --reviewer <agent> --verdict PASS|FAIL --summary "..."` is the only sanctioned way to attach REVIEW evidence, and must only be called after the reviewing agent has produced its verdict — never pre-emptively.
