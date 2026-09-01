# Runtime Architecture — v2.0.0

## Control hierarchy

`constitution -> organization/project policy -> workflow -> task constraints -> agent instructions -> model decision`.

A lower layer cannot waive a higher layer. The model is deliberately the lowest authority in the chain.

## State and event model

`.claude/ops/state.json` uses schema v4 and stores mission, session, tasks, requirements, acceptance criteria, trace links, touched files, evidence, decisions, assumptions, findings, side effects, blockers, failure fingerprints, improvements, active/finished agents, checkpoints and gate results.

The journal is append-only NDJSON with `prevHash` and `eventHash`, creating a basic tamper-evident chain for execution events. It is an audit mechanism, not cryptographic non-repudiation.

## Workspace identity

A workspace fingerprint hashes:

- current HEAD;
- current branch;
- complete staged binary diff;
- complete unstaged binary diff;
- names and content hashes of untracked files outside `.claude/ops`.

Change-sensitive PASS evidence must match the current fingerprint. This closes the v1 failure mode where a test result from an older source state could still satisfy completion.

## Control-plane concurrency and atomic state

Mutating runtime entrypoints (`ops`, hooks, completion gate and memory) acquire a cross-process lease at `.claude/ops/runtime/control-plane.lock`. The lease uses atomic exclusive creation, owner PID/token metadata, bounded contention timeout, dead-owner stale-lock recovery and fail-closed behavior for live contention. `state.json` is replaced through a same-directory temporary file, `fsync`, and atomic rename. Journal append is serialized and `fsync`ed under the same re-entrant process lock. This prevents parallel agents/hooks from silently losing state updates or producing competing `prevHash` journal heads.

## State/journal commit anchoring

`state.json` is not trusted merely because it parses. Every state write receives a monotonically increasing `stateRevision`; the exact serialized bytes are SHA-256 hashed and anchored as a `state-commit` event in the journal hash-chain before the operation is considered durable. On load, revision and state hash must match the latest anchor or the runtime fails closed. This detects state tampering and the dangerous crash window where state advanced without a corresponding ledger commit.

## Evidence classes

Runtime evidence records source/tool/agent identity, status, scope, environment, workspace fingerprint, command/result/artifact hashes and requirement/criterion links. Executed verification produced by shell hooks is required for changed code. Independent agent verdicts are separate review evidence.

## Tool gateway

PreToolUse classifies commands before execution. Secret access, destructive Git/filesystem operations, database mutation-capable commands, deploy/infra writes, repository external writes, dependency mutation and external-service writes require explicit approval. PostToolUse reconciles the actual repository delta instead of trusting the declared command.

## Gate model

`gate-engine.mjs` calculates effective impact and requires gates dynamically. Base gates clear blockers, high findings and side effects. Changed code requires executed verification and Git/scope audit. L2+ adds requirements/evidence closure and domain review; higher impact levels add progressively independent and specialized review.

`completion-gate.mjs` is the Stop enforcement layer. It independently validates operational state and the final live repository before allowing completion.

## Recovery and durability

Checkpoints capture workspace fingerprint and execution topology. Memory is source-aware. Repeated identical tool failures trigger strategy change rather than infinite retry. Recovery workflows distinguish retry, reanalysis, rollback, restore and external compensation.

The local Node runtime is resumable via state/checkpoints but is not a distributed durable-workflow engine. If future execution spans machines/days/approvals, place a `DurableExecutionPort` behind the same contracts rather than embedding durable semantics into agent prompts.
