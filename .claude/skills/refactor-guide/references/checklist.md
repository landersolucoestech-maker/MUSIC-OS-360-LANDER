# Refactor Guide Checklist

- [ ] A characterization test exists and passes BEFORE any structural change starts.
- [ ] The refactor is split from any bug fix — never combined in the same diff/step.
- [ ] Renaming is its own mechanical step, separate from restructuring logic.
- [ ] Each step is small enough that a failing test isolates to exactly that step, not a pile of
      simultaneous changes.
- [ ] Tests are run after every step, not just at the very end.
- [ ] No behavior changed — if the "refactor" actually needs different behavior, that's
      `feature-planner`/`execute` territory, not this skill, and the scope should be renamed
      accordingly rather than silently drifting.
- [ ] An unrelated improvement noticed mid-refactor is recorded as a separate finding, not folded
      into this diff (`.claude/rules/scope-control.md`).
