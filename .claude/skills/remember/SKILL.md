---
name: remember
description: Writes a bounded historical memory entry via memory.mjs, source-backed when possible. Use when you've learned something about the project worth recalling in a future session that isn't already derivable by reading the code (an architecture fact, a non-obvious constraint) — not for task state, which belongs in mission state via ops.mjs.
---

# Remember

`node .claude/runtime/memory.mjs remember --key <slug> --text "..." [--source <file>]`. Prefer
`--source` whenever the fact is backed by one real file (the entry then flips to
`potentially_stale` automatically when that file changes, instead of silently rotting). Writing
the same key again supersedes the prior entry rather than editing it in place — history stays
traceable.

## Non-goals
Do not use this for anything that belongs in `.claude/ops/state.json` (requirements, findings,
evidence, blockers) — memory is recall, not mission state, and cannot satisfy a gate.
