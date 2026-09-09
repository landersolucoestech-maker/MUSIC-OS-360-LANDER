# Feature Planning Checklist

- [ ] Every requirement traces to something the user actually said, not an inferred nice-to-have
      (`requirements-reviewer` challenges this independently, but check it yourself first).
- [ ] Explicit non-requirements are captured, not silently dropped.
- [ ] Every acceptance criterion is something a command or reviewer can actually check.
- [ ] The task-spec breakdown respects dependency order (schema before backend before frontend,
      etc.) — no task assumes something a later task produces.
- [ ] Any new dependency/technology choice went through `technology-selection-reviewer` before
      being assumed in the plan.
- [ ] A new external-facing surface or trust boundary has a `threat-model` pass before
      implementation starts, not after.
- [ ] The plan states its impact level (L0-L5) and which gates that implies, before implementation
      begins — not decided retroactively once code exists.
