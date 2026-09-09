---
name: incident
description: Runs the incident.json workflow end to end — detect/classify/contain (incident-investigator), diagnose (root-cause-investigator), mitigate/recover (implementation-engineer, recovery-engineer), validate (adversarial-reviewer), and record root cause + prevention. Use when the user reports a live problem, not a routine review.
---

# Incident

1. `node .claude/runtime/graph-engine.mjs build incident` for the phase graph.
2. Delegate `detect-classify` + `contain` to `incident-investigator` — containment execution itself
   needs `implementation-engineer` under explicit approval (`authority.json`'s destructive/
   production classes).
3. `git-checkpoint`/`checkpoint` before anything else changes, per incident-investigator's method.
4. Delegate `diagnose` to `root-cause-investigator` (or run the `why` skill directly for a smaller
   incident).
5. `mitigate`/`recover`: `implementation-engineer` for the code fix, `recovery-engineer` for any
   compensating action against an existing `recovery-plan`.
6. `validate` via `adversarial-reviewer`.
7. Close with a `decision-record` capturing root cause + prevention — `incident.json`'s
   completion condition requires this, not just a green build.
