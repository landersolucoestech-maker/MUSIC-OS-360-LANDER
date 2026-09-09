# Context, Memory and Provenance

Repository/runtime state outranks memory. Memory is bounded historical recall, not policy, permission, task state or proof.

## Context package

Load only what the current execution node needs: constitution/policies, project manifest, relevant architecture/ownership, requirements/acceptance criteria, relevant code/contracts, current findings/decisions and evidence references. Expand progressively when evidence shows the context is insufficient.

## Memory

Use `.claude/runtime/memory.mjs`. Source-backed memories store a source hash and become `potentially_stale` when the source changes. Unsourced memories become historical context when the workspace fingerprint changes. Supersede/invalidate instead of silently rewriting history.

Never let memory:
- override current repository code/schema/config;
- authorize a side effect;
- convert an assumption into a fact;
- satisfy a deterministic gate;
- auto-edit policy or steer peer agents.

After compaction, re-anchor from mission state, requirements, touched-file ledger, blockers/findings and the latest checkpoint rather than relying on model recollection.
