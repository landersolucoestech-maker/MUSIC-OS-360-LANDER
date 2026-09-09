---
name: recall
description: Reads bounded historical memory via memory.mjs — never used to override current repository state, satisfy a gate, or authorize an action (see .claude/rules/context-memory.md). Use when you need to check what was previously observed about this project before re-deriving it from scratch.
---

# Recall

`node .claude/runtime/memory.mjs recall [--key <slug>]` lists entries with their staleness
(`fresh`/`potentially_stale`/`historical`/`superseded`). Treat anything not `fresh` as needing
re-verification against the current repository before acting on it — memory is context, not proof.
`node .claude/runtime/memory.mjs check` gives the staleness summary across all entries.
