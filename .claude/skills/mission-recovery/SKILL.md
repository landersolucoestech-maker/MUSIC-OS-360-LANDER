---
name: mission-recovery
description: Resumes an in-progress mission after context compaction, an interrupted session, or a fresh conversation, by re-anchoring from mission state instead of relying on model recollection. Use at the start of any session where .claude/ops/state.json already exists.
---

# Mission Recovery

Implements `.claude/rules/context-memory.md` §"After compaction, re-anchor from mission state...".

## Method

1. Check for `.claude/ops/state.json`. If present, this is a resume, not a fresh mission — do not
   run `ops.mjs init` (it will report `EXISTS` if you try; that's the signal you needed this
   skill).
2. Run `node .claude/runtime/ops.mjs status` to get counts: open criteria, open findings,
   critical/high open findings, open blockers, evidence count, and `readyForCompletionGate`.
3. Read the requirements and findings arrays directly from `.claude/ops/state.json` to see exactly
   what's open, not just the counts.
4. Check `checkpoints[]` for the last recorded checkpoint and compare its fingerprint against
   `git status`/`git diff` now — has anything changed since, expected or not?
5. Read `docs/NAMING_NORMALIZATION_CANONICAL_MAP.md` if it exists — canonical decisions already made must not be
   re-litigated or silently overridden by a fresh agent that doesn't know about them.
6. If there are open blockers, resolve or escalate them before resuming forward progress
   (`node .claude/runtime/ops.mjs blocker resolve --id <id>` once actually resolved).
7. Resume at the first phase of `systemic-audit` that has open work, not from Phase 1 — do not
   re-run discovery/requirements work that's already recorded unless something material has
   changed since (check with `node .claude/runtime/memory.mjs check` for anything flagged stale).

## Non-goals

Do not treat a memory entry (`.claude/runtime/memory.mjs`) as authoritative over the current
mission state or current repository content — memory is bounded historical recall, state.json and
the actual repo are ground truth.
