---
name: recover
description: Runs the recovery.json workflow after a genuine failure — reconciling an unreconciled side effect, resolving blockers, and refreshing stale evidence. Distinct from resume (re-anchoring after a plain interruption/compaction with no failure involved) and from recovery-engineer (which executes one specific recovery-plan record this skill's phases may invoke).
---

# Recover

1. `node .claude/runtime/ops.mjs status` — read what's actually blocked/stale right now.
2. For any unreconciled `side-effect-record` (`node .claude/runtime/ops.mjs record list --kind
   effect`), get or create a matching `recovery-plan` and delegate execution to
   `recovery-engineer`.
3. Resolve open blockers (`node .claude/runtime/ops.mjs blocker resolve --id <id>`) only once
   actually resolved, not preemptively.
4. Re-run `evidence run` for any criterion whose evidence `memory.mjs check`/`completion-gate.mjs`
   flags as stale — a source/config/dependency change since it was recorded invalidates it.
5. Resume forward progress once `completion-gate.mjs` no longer lists the failure's reasons.
