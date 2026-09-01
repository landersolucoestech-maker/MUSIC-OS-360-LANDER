# Architecture Decisions — Engineering OS v2.0.0

| Decision | Choice | Reason |
|---|---|---|
| System core | Deterministic Node control plane above agents | Model confidence cannot govern destructive authority, evidence freshness or completion. |
| Impact model | L0–L5 + weighted risk signals | File-count/task-size tiers under-classify tiny but dangerous auth/data/production changes. |
| Evidence identity | Full workspace fingerprint | HEAD alone does not change during ordinary uncommitted implementation. |
| Requirements | Formal RequirementRecord + AcceptanceCriterion | Prevents literal user requirements from disappearing into prose/implementation. |
| Verification | Executed tool evidence distinct from reviewer evidence | A reviewer saying tests passed is not proof a command ran. |
| Reviewer protocol | Machine-readable `VERDICT` captured on SubagentStop | Makes independent review consumable by gates and automatically stale after changes. |
| Policy shape | JSON policy/gate/workflow manifests + executable runtime | Keeps governance inspectable/versionable while critical enforcement stays deterministic. |
| Side effects | Dedicated ledger | Git revert cannot reverse email, billing, DB, cloud or deployment effects. |
| Journal | Hash-chained NDJSON | Detects accidental/basic tampering without pretending to provide signed attestations. |
| Memory | Progressive ledger with source hash/fingerprint | Historical context remains useful but cannot masquerade as current truth. |
| Parallelism | Read-only parallelism; disjoint/worktree writers | Prevents agent overwrite and contaminated review. |
| Specialists | Large dormant registry, dynamic activation | Preserve capability without paying every agent on every task. |
| Agent Teams | Explicit opt-in | Useful for truly independent workstreams but higher coordination/token cost. |
| External proxies | Optional adapters; native default | Headroom/OmniRoute are performance/routing tools, not governance authorities. |
| Production enforcement | Local hooks + external CI/IAM/branch protections | Local prompt/runtime control is defense in depth, not an absolute security boundary. |
