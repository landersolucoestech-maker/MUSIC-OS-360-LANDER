---
name: git-checkpoint
description: Records a recoverable checkpoint (workspace fingerprint + HEAD + label) in mission state at a safe point, so work can be recognized and resumed after an interruption without guessing what was already done. Use before starting a risky batch and after each batch successfully passes its gates.
---

# Git Checkpoint

This does not commit anything — it records a fingerprinted marker in mission state so
`mission-recovery` can tell what state the repo was in at a known-good point.

## Method

1. Before a risky or large batch: `git status` (never skip this) to confirm the tree is in the
   expected state, then `node .claude/runtime/ops.mjs checkpoint --label "before <batch
   description>"`.
2. After the batch passes its gates: `node .claude/runtime/ops.mjs checkpoint --label "after
   <batch description>: gates PASS"`.
3. If a batch needs to be abandoned, compare the current `git diff` against the last checkpoint's
   recorded fingerprint to see exactly what changed since — then decide with the user whether to
   keep, stash, or revert it. Never `git reset --hard`/`git clean -f` without the user explicitly
   requesting that exact destructive action (`.claude/rules/git-safety.md`).

## Output

An ordered list of checkpoints in `.claude/ops/state.json` (`checkpoints[]`), each with a
workspace fingerprint and HEAD, usable by `mission-recovery` and `git-auditor`.
