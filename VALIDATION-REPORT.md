# Validation Report — MUSIC OS 360 Engineering OS v2.0.0

## Verdict

**Pack-level structural validation + deterministic governance regression suite: PASS at build time.**

This verdict applies to the Engineering OS artifact itself. It does not claim that the real MUSIC OS 360 application, production data, cloud accounts, or provider infrastructure were exercised inside this build container.

## Original archive coverage

The supplied v1.2.1 archive contained **96 files and 5,737 text lines**. All original files remain represented in `AUDIT-INVENTORY.json`; no source file was silently discarded. The inventory stores original bytes/lines/SHA-256, disposition, mapped v2 location, and final v2 integrity metadata. The sole deliberate exception is the final v2 hash/bytes/lines of `PACK-MANIFEST.json`: those fields are omitted and replaced by an explicit `self-excluded-manifest` marker because the manifest hashes `AUDIT-INVENTORY.json`, so storing the manifest hash back inside that inventory would create an impossible circular integrity dependency.

## Deterministic governance implemented

The v2 runtime enforces, rather than merely documents:

- L0–L5 impact detection with fail-closed escalation;
- risk/signals, dynamic ExecutionGraph and capability registry;
- formal RequirementRecord → AcceptanceCriterion → Evidence closure for L2+;
- evidence bound to the exact workspace fingerprint and invalidated after any material workspace change;
- tool-produced verification separated from agent-produced review;
- exact reviewer identities for specialist gates;
- atomic verification/review race detection;
- cross-process control-plane locking plus atomic `state.json` replacement, preventing lost updates and journal-head races under parallel agents;
- journal hash-chain validation and corruption quarantine;
- policy-backed tool authorization with project-bounded A0–A5 autonomy;
- no agent self-escalation above project authority;
- shell-composition/non-zero-masking protection for gate-attestable verification;
- control-plane mutation/impersonation protection;
- side-effect ledger and reconciliation requirements;
- mission completion/cancellation certificates issued only after deterministic Stop validation;
- fail-closed Git, context, memory and operational-state behavior;
- sandbox fail-closed configuration and no unsandboxed fallback;
- native Read/Grep and subprocess secret boundaries for `.env`, SSH, cloud, package-manager and credential stores;
- immutable pack verification before launcher startup.

## Runtime compatibility baseline

The pack now enforces its runtime floor before mutable operational state is created: **Node.js >=20.0.0** and **Claude Code >=2.1.228**. The compatibility checker is shared by the doctor, installers and launchers. An older Claude Code CLI is rejected fail-closed, while pack-only validation can still run without a Claude binary installed. The deterministic suite includes old-version rejection, baseline-version acceptance and launcher-boundary regression tests.

## Structural/static validation

The final build procedure validates:

- all **20** runtime `.mjs` files with `node --check`;
- all shell scripts with `bash -n`;
- all JSON documents parse;
- all 31 canonical contracts are valid Draft 2020-12 JSON Schemas;
- no broken or root-escaping symlink exists;
- no active failure-masking `|| true`/permission-bypass pattern exists outside regression fixtures/documentation;
- agent/Skill IDs are unique and reviewer agents expose one machine-readable verdict contract;
- required workflows, policies, gates, contracts, ownership and project manifests exist;
- Claude Code hook names and required lifecycle hooks are present;
- deterministic Stop is the sole completion authority;
- launchers validate the immutable pack before creating operational state;
- `PACK-MANIFEST.json` exactly matches the deliverable tree by SHA-256.

At build time the pack contains **31 agents, 28 Skills, 21 rules, 7 policies, 6 workflows, and 31 canonical contracts**. These are semantic capabilities; specialist agents are dynamically activated rather than permanently resident.

## Built-in deterministic self-test

`node .claude/runtime/self-test.mjs` currently executes **53 deterministic regression scenarios** in an ephemeral Git repository. They cover:

- deterministic project-root resolution;
- read-only import with no operational-state side effect;
- executed-tool verification separation;
- requirement status and evidence closure;
- stale evidence after a new patch without a new commit;
- active-mission reset denial and legitimate revalidation;
- masked-exit verification rejection;
- concurrent workspace mutation during verification and review;
- concurrent control-plane mutations preserving all state updates and a valid hash-chained journal;
- stale lock recovery and live-lock fail-closed contention behavior;
- fabricated tool evidence and fabricated reviewer evidence rejection;
- strict one-verdict reviewer contract;
- unknown/composed shell approval requirements;
- direct control-plane hook impersonation denial;
- criterion producer-class enforcement;
- `.env`, home/project-relative credential stores, native secret-read and expanded provider secret-env denial;
- autonomy self-escalation denial;
- cancellation restoration and cancellation certificate enforcement;
- L5 promotion for authorization/security changes;
- journal-chain integrity;
- capability registry and Context Package creation;
- sandbox runtime-state/control-plane protection;
- bypass-permissions disablement;
- malformed hook input fail-closed;
- Git failure fail-closed;
- required context source failure fail-closed;
- corrupted memory ledger fail-closed;
- tampered journal fail-closed;
- successful PostToolUse without matching PreToolUse snapshot quarantine.

The suite passes only when all scenarios pass.

## Key stale-evidence proof

The regression suite proves the following sequence:

1. modify code;
2. execute a real verification command through the governed shell lifecycle;
3. obtain independent `git-auditor` PASS evidence;
4. close acceptance criteria and pass governance gates;
5. modify the same code again without changing Git HEAD;
6. observe `GATE_VALIDATION`, `GATE_GIT_SCOPE` and `GATE_EVIDENCE_CLOSURE` fail because previous evidence is stale;
7. re-run verification/review against the new fingerprint;
8. pass the gates again;
9. request completion;
10. receive a completion certificate only after deterministic Stop validation.

This prevents a previous green result from validating a later unverified workspace.

## Artifact integrity

`node .claude/runtime/manifest.mjs --write` inventories every non-operational deliverable file except the manifest itself and Git metadata. `AUDIT-INVENTORY.json` correspondingly forbids final v2 hash/byte/line metadata for `PACK-MANIFEST.json` and requires the explicit `self-excluded-manifest` marker, preventing stale circular metadata from being mistaken for verified provenance. `node .claude/runtime/manifest.mjs` verifies exact path, byte count, text line count and SHA-256.

Symlinks are rejected if broken or if their resolved target escapes the pack root. Symlink integrity hashes the link target string instead of silently following external content.

`node .claude/runtime/journal-verify.mjs` independently verifies the `prevHash` / `eventHash` chain for runtime events.

## Environment-specific gates not claimed by this container

The following require the actual target environment and are therefore intentionally not represented as passing evidence here:

- execution of a real agent session under an installed Claude Code binary (the compatibility gate itself is exercised with deterministic CLI fixtures);
- native PowerShell execution on Windows;
- actual MUSIC OS 360 lint/typecheck/test/build commands;
- Supabase/PostgreSQL/RLS/tenant-isolation tests;
- live OmniRoute/Headroom routing;
- live Agent Teams/worktrees;
- live cloud/CI/CD deployments and rollback/restore;
- production SLO/telemetry validation;
- CI-produced SBOM, provenance and artifact signing.

The runtime is designed to fail visibly or require explicit approval when those proofs are required but unavailable; it does not manufacture PASS evidence.

- state/journal commit anchoring detects valid-JSON state tampering or an unjournaled state revision and fails closed.

## Hardened final-acceptance cycle

The hardened pre-freeze tree was accepted with the following pack-level evidence before the final ZIP was produced:

- `PACK-MANIFEST.json`: exact SHA-256/path/size/line verification PASS;
- semantic validator: **192 files scanned, 0 warnings**;
- deterministic runtime regression suite: **53/53 PASS**;
- Node syntax: **20/20 `.mjs` modules PASS**;
- Bash syntax: **2/2 `.sh` scripts PASS**;
- JSON parsing: **53/53 documents PASS**;
- canonical schema meta-validation: **31/31 Draft 2020-12 contracts PASS**;
- symlink containment: **0 problematic links**;
- shebang executable-bit audit: PASS;
- temporary/credential-like residue scan: PASS;
- active failure-masking / bypass scan: PASS;
- clean-install + `doctor --pack-only`: PASS;
- compatibility boundary: simulated Claude Code **2.1.227 rejected before operational-state creation**, while **2.1.228 accepted**;
- deliberate `CLAUDE.md` tampering: rejected independently by the immutable manifest verifier and semantic validator.

The final distribution procedure additionally requires the generated ZIP itself to pass archive-structure/path-traversal/duplicate/case-collision checks, clean re-extraction, source-vs-extracted byte comparison, manifest verification, validator, self-test, doctor, static validation and clean-install smoke testing. A distribution ZIP is not considered accepted until those checks pass against the re-extracted artifact.
