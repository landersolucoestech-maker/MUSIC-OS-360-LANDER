# MUSIC OS 360 Engineering OS v2.0.0

A project-specific **Software Engineering Agent Operating System** for Claude Code. This is not a prompt pack: it combines an executable control plane, formal runtime state, structured evidence, impact/risk detection, policy/gate manifests, side-effect tracking, recovery semantics, specialized agents and progressive context/memory.

## Runtime compatibility baseline

The pack fails closed on unsupported runtimes. **Node.js 20.0.0+** is required for the Engineering OS runtime. **Claude Code 2.1.228+** is required at launch; this baseline is intentionally aligned to the current stable channel as of 2026-08-26 because the pack relies on modern hook, sandbox and credential-protection behavior. `doctor.mjs` and both launchers enforce the version floor instead of assuming unsupported settings will work.

Headroom remains pinned to `0.36.5` and OmniRoute to `3.8.49`; both were rechecked against their current package registries during final hardening.

## What changed in v2

v1.2.1 relied too heavily on textual protocol and free-form validation evidence. v2.0.0 makes the critical parts enforceable:

- L0–L5 runtime impact detection plus risk signals; agent/operator declarations cannot downgrade detected impact.
- Workspace fingerprints bind PASS evidence to the exact code/config state that was validated.
- Formal `RequirementRecord -> AcceptanceCriterion -> EvidenceRecord` closure for L2+ work.
- Executed tool verification is distinct from reviewer opinion and is required for changed code.
- Reviewer `VERDICT` capture at SubagentStop creates state-bound independent-review evidence.
- Side Effect Ledger for destructive/external/repository/deployment writes and compensation/reconciliation.
- Tamper-evident hash-chained runtime journal.
- Versioned contracts, policies, gate manifests and workflows.
- Untrusted-context/prompt-injection boundary and least-authority tool gateway.
- Supply-chain, recovery, release, incident, production, AI/LLM and distributed-systems specialists activated only when needed.
- Memory provenance and source-staleness detection.
- Semantic pack validator: validates invariants and runtime wiring instead of fixed agent/skill counts.

## Architecture

```text
User request
   │
   ▼
Constitution / Policies / Authority
   │
   ▼
Project Controller + Impact/Risk + Dynamic Workflow
   │
   ├──────── Context Package / Ownership / Memory ────────┐
   │                                                      │
   ▼                                                      ▼
Agent Runtime ──► Tool Gateway ──► Repository / CI / DB / External systems
   │                  │
   │                  └─► side-effect classification + approval + ledger
   ▼
Verification + Independent Review
   │
   ▼
Evidence Ledger ──► freshness/provenance/requirement closure
   │
   ▼
Gate Engine ──► Completion Gate ──► Release/Production validation when applicable
```

## Control-plane inventory

The pack intentionally keeps specialists dormant until routing requires them. v2 ships with **31 project agents**, **28 skills**, **21 rules**, **7 policy manifests**, **6 workflow manifests**, **31 canonical JSON contracts**, one canonical completion-gate manifest and an executable Node runtime. Count is not itself a quality target; `validate-pack.mjs` validates semantic invariants and allows future expansion.

Core roles include investigation, requirements, implementation, architecture, frontend, backend, database, integration, security, QA, regression, adversarial and Git audit. Dynamically activated specialists add contracts, test strategy, supply chain, production validation, recovery, accessibility, dependencies, AI/LLM systems, distributed systems, technology selection, documentation, compliance, cost, incident investigation and root-cause analysis.

## Install

Copy `CLAUDE.md` and `.claude/` into the real MUSIC OS 360 repository, then:

```bash
.claude/install.sh
node .claude/runtime/doctor.mjs
.claude/launchers/music-os-claude.sh --native
```

Optional external routing/context dependencies:

```bash
.claude/install.sh --deps
.claude/launchers/music-os-claude.sh --stack
```

PowerShell equivalents are included. OmniRoute 3.8.49 is optional and requires Node `>=22.22.2 <23` or `>=24 <27`; Headroom 0.36.5 is optional. Provider credentials remain outside the repository. Native mode remains the safest default until the exact local proxy/provider combination is smoke-tested.

## High-value commands

```bash
node .claude/runtime/doctor.mjs --pack-only
node .claude/runtime/impact.mjs
node .claude/runtime/ops.mjs show
node .claude/runtime/ops.mjs requirement add --text "..."
node .claude/runtime/ops.mjs criterion add --requirement REQ_ID --text "..."
node .claude/runtime/ops.mjs gate
node .claude/runtime/memory.mjs search --query "..."
node .claude/runtime/validate-pack.mjs
```

Skills expose the same operating model through `/prime`, `/intake`, `/impact`, `/execute`, `/trace`, `/review`, `/evidence`, `/gate`, `/checkpoint`, `/resume`, `/incident`, `/recover`, `/release`, `/bootstrap` and domain-specific helpers.

## Runtime guarantees and limits

The pack can deterministically reject stale evidence, unexplained scope, missing requirement closure, unresolved findings/blockers, unreconciled side effects and missing required reviews. It cannot turn local hooks into an absolute security boundary: CI, Git hosting protections, cloud IAM, database privileges and deployment controls must enforce production policy independently.

Agent/model output remains nondeterministic. v2 therefore makes **governance inputs, authority, state transitions, evidence identity and completion conditions auditable**, rather than pretending model reasoning itself is deterministic.

## Documents

- `RUNTIME-ARCHITECTURE.md` — control-plane design and data flow.
- `ARCHITECTURE-DECISIONS.md` — major v2 decisions.
- `REFACTOR-AUDIT-v2.md` — line-level audit methodology, defects found and remediations.
- `VALIDATION-REPORT.md` — executable validation results.
- `KNOWN-UPSTREAM-RISKS.md` — external/runtime caveats.
- `MIGRATION-FROM-OLD-PACK.md` — v1.2.1 → v2.0.0 migration.
- `PACK-MANIFEST.json` — final file hashes.
