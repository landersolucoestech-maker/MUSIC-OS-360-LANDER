---
name: checkpoint
description: Records a general-purpose checkpoint (workspace fingerprint + label) at any safe point in a mission — the direct ops.mjs command for when you just need a marker, without the full before/after batch ceremony git-checkpoint prescribes. Use git-checkpoint instead when you specifically need the before-risky-batch / after-gates-pass pattern.
---

# Checkpoint

`node .claude/runtime/ops.mjs checkpoint --label "<what just happened>"`. Stores a
`checkpoint-record` (`.claude/contracts/checkpoint-record.schema.json`) under
`.claude/ops/checkpoints/<id>.json`, pointed to from `state.json`'s `checkpointIds[]`.

Use this directly for a quick marker (before trying something exploratory, after a milestone).
Use the `git-checkpoint` skill instead when you need the paired before/after convention around a
specific risky batch, or `mission-recovery` to read checkpoints back after an interruption.
