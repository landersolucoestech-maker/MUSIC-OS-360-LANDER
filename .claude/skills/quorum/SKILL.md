---
name: quorum
description: Resolves a conflict-record when multiple agents disagree (contradictory canonical names, contradictory severity, contradictory PASS/FAIL verdicts on the same criterion) by requiring explicit arbitration rather than majority-vote or last-write-wins. Use whenever ops.mjs reports more than one evidence/finding touching the same subject with incompatible content.
---

# Quorum

Implements `.claude/rules/agent-orchestration.md`'s arbiter role and the completion checklist's
"conflicts must be detected and resolved, never left ambiguous."

## Method
1. `node .claude/runtime/ops.mjs record add --kind conflict --data '{"parties":["agent-a",
   "agent-b"],"description":"...","status":"OPEN"}'` the moment a contradiction is noticed — do
   not let it sit silently unresolved while other work continues on the same subject.
2. Re-examine both positions against the actual evidence each cites (not just their stated
   conclusion) — a "quorum" here means requiring the winning position to be evidence-backed, not
   counting votes.
3. `mission-orchestrator` makes the call with a stated rationale:
   `node .claude/runtime/ops.mjs record add --kind decision --data '{"topic":"...","decision":
   "...","decidedBy":"mission-orchestrator","conflictId":"<id>"}'`.
4. Update the conflict record's status to RESOLVED with the decision's id, and correct whichever
   position lost (a canonical-map entry, a finding severity, a re-run evidence check) before
   implementation proceeds on that subject.

## Non-goals
Never let two agents "agree to disagree" silently by both proceeding on their own version — that
produces exactly the two-sources-of-truth problem `.claude/rules/naming-canonical.md` exists to
prevent.
