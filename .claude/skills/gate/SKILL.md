---
name: gate
description: Runs a declarative gate definition via gate-engine.mjs — completion.json by default, or a project-specific one under .claude/gates/. Use when you need to check (or enforce) a gate outside the full completion-gate.mjs CLI wrapper, e.g. a custom per-phase gate a workflow references.
---

# Gate

`node .claude/runtime/gate-engine.mjs <gate-name> [--run-gates]` where `<gate-name>` matches a file
under `.claude/gates/<gate-name>.json`. The GATE DEFINITION (what checks, what parameters) lives in
that JSON file; the GATE ENGINE (how each check type actually executes) lives in
`gate-engine.mjs`'s `CHECKS` registry — extend the definition to add/remove checks without editing
runtime code; add a new check *type* only when no existing one covers it, and register it in
`CHECKS` when you do.

`node .claude/runtime/completion-gate.mjs [--run-gates]` remains the shorthand specifically for
`completion.json`.
