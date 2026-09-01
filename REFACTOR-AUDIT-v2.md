# Refactor Audit — v1.2.1 → v2.0.0

## Scope

The supplied ZIP was fully extracted. All 96 original files / 5,737 lines were decoded and scanned. `AUDIT-INVENTORY.json` is the machine-readable coverage record, including source SHA-256, bytes, lines and per-file disposition against v2. Final v2 integrity metadata is recorded for mapped files except `PACK-MANIFEST.json`, whose final hash/bytes/lines are intentionally omitted under the explicit `self-excluded-manifest` policy to avoid a circular manifest↔inventory hash dependency.

## Critical defects found and remediated

| Severity | v1.2.1 defect | v2 remediation |
|---|---|---|
| Critical | `completion-gate` could accept PASS validation with free-form text evidence | EvidenceRecord has producer, hashes, environment and exact workspace fingerprint; changed code makes PASS stale |
| Critical | HEAD-only semantics were insufficient for uncommitted agent edits | fingerprint includes staged/unstaged binary diffs + untracked content + HEAD + branch |
| High | T0–T3 classification depended heavily on model judgment | deterministic L0–L5 signal detection + weighted risk; detected impact cannot be downgraded |
| High | requirements/DoD lived mostly in prose | formal RequirementRecord + AcceptanceCriterion + trace + evidence closure |
| High | reviewer output was not machine consumable | standardized `VERDICT: PASS|FAIL|BLOCKED` captured automatically on SubagentStop |
| High | verification/review were conflated | changed code requires fresh **tool-produced verification**; reviewer evidence is separate |
| High | external/destructive effects had no first-class lifecycle | Side Effect Ledger + reconciliation/compensation gate |
| High | policies/gates/workflows were mostly Markdown instructions | versioned JSON manifests + executable runtime enforcement |
| High | dynamic DAG was conceptual only | `graph-engine.mjs` compiles an impact/signal-driven execution graph |
| High | no formal untrusted-context boundary | trust-boundary policy/rule; external/retrieved content cannot grant authority |
| Medium | memory lacked source hash/fingerprint validity | source-backed provenance + potentially-stale/current/historical validity |
| Medium | runtime journal lacked tamper linkage | `prevHash`/`eventHash` hash chain |
| Medium | validator froze architecture to exact component counts | semantic validator checks invariants, schemas, runtime wiring and minimum capabilities |
| Medium | no supply-chain/release/production specialist plane | policies + contracts + supply-chain, dependency, recovery, production validators |
| Medium | no dedicated AI/LLM/distributed-system review domains | dynamically activated specialist agents added |
| Critical | shell verification could theoretically hide a failed exit with constructs such as `test || true` | verification commands with failure-masking shell composition are non-attestable and cannot create PASS evidence |
| Critical | test/review could race with concurrent source mutation | verification/review captures start fingerprint; PASS becomes BLOCKED if workspace changed before completion |
| Critical | parallel hooks/agents could race `state.json` and journal head updates | cross-process control-plane lease + atomic state replacement + serialized/fsynced journal; regression suite executes real concurrent writers |
| Critical | manual CLI evidence could impersonate tool-produced proof | `ops evidence` forbids `producer-kind=tool`; tool evidence is hook-owned |
| High | acceptance criteria could be closed by generic fresh prose evidence | each criterion has an evidence mode; default is fresh tool verification, with explicit review/external/mixed alternatives |
| High | requirement record itself did not have to be PASS | `GATE_REQUIREMENTS_SATISFIED` requires explicit PASS in addition to criterion evidence closure |
| High | sandbox could silently fall back when unavailable | `failIfUnavailable: true` + `allowUnsandboxedCommands: false` |
| High | arbitrary sandboxed Bash could mutate runtime/control-plane files | Bash writes to `.claude/**` and `CLAUDE.md` are OS-sandbox denied; runtime-owned `.claude/ops` is protected |
| High | `bypassPermissions` remained a possible agent permission mode | project governance disables bypass mode and validator rejects agents declaring it |
| High | pack manifest was stale and did not cover the refactored tree | manifest is generated and verified by executable SHA-256 integrity tooling and validator |

## What was intentionally preserved

- safe native routing default;
- optional Headroom/OmniRoute roles with no governance authority;
- native Claude project agents/Skills/hooks/status lines;
- touched-file hash baselines and shell reconciliation;
- fail-visible malformed state handling;
- pre-existing dirty-file preservation;
- bounded progressive memory concept;
- repeated-failure loop breaker;
- Agent Teams explicit opt-in rather than default.

## What remains deliberately external

v2 does not pretend a local Claude Code pack can replace Git server branch protection, CI attestations, cloud IAM, database privileges, secret manager, production observability or distributed durable workflow infrastructure. It defines ports/contracts/policies for those concerns and requires external evidence when applicable.


## Additional hardening found during final verification

- **Deterministic runtime root:** CLI/runtime fallback no longer depends on the caller's `cwd`; absent `CLAUDE_PROJECT_DIR`, it resolves the project root from the installed `.claude/runtime` location.
- **Read-only imports are side-effect free:** importing core/integrity modules no longer creates `.claude/ops`; operational directories are created lazily only by write paths.
- **Headroom patch security:** optional Headroom pin advanced from `0.36.0` to `0.36.5`, retaining the same minor line while including upstream patch fixes through 0.36.5.
