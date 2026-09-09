---
paths: []
description: How to establish ground truth about a repository's real architecture before making claims about it
---

# Architecture

**The current repository is authoritative.** This pack ships no assumptions about any specific
stack, framework, ORM, package manager or folder layout — those vary per installed project.
Before any structural claim or change, `repo-intelligence` must verify the actual root manifests,
workspace files, source tree, persistence layer and current dependency versions. Do not treat a
version number or path pattern from a rule, memory, or prior conversation as product truth.

Preserve established architecture unless the requested work actually requires a boundary change.
In particular, do not casually introduce a second package manager, competing ORM, parallel
migration mechanism, duplicate state-management source, or second tenant/security boundary.

For database changes, inspect the current scripts and migrations before deciding whether a
`db:*`/`verify:*` command is read-only or mutating; command names are not evidence. For
tenant-sensitive behavior, verify the current RLS/tenant-context implementation rather than
assuming a pattern from another project still matches.

If discovery finds the repository's real architecture diverges from any cached rule/memory in
this pack, record the discovered current architecture (via `node .claude/runtime/memory.mjs
remember`) and prefer the freshly-observed state. `architecture-reviewer` owns independent review
of meaningful boundary/contract changes.

## Per-installation stack rules

When this pack is installed into a real project, `repo-intelligence`'s first-run discovery should
generate path-scoped stack rule files here (e.g. `backend.md`, `database.md`, `frontend.md`,
`integrations.md`, each with a `paths:` frontmatter list) describing that project's actual real
scripts, ORM, auth/tenant pattern and conventions — mirroring this file's structure. Do not ship
another project's stack-specific rules as if they were generic; regenerate them from the target
repository, per mission section 54 (autonomous discovery).
