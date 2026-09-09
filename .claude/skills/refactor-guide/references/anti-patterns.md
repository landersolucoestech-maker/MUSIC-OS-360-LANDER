# Refactor Anti-Patterns

- **Refactor-and-fix combined in one step**: changing structure and fixing a bug in the same edit
  makes it impossible to tell which change caused a test to go red. Separate them into two steps.
- **No characterization test before starting**: "I'll add tests after" on a refactor means there's
  nothing proving behavior didn't change — write it first, always.
- **Renaming and restructuring in the same diff**: a rename should be a mechanical, reviewable-in-
  isolation step; bundling it with logic changes hides both.
- **"While I'm in here" scope creep**: fixing an unrelated thing noticed mid-refactor turns a
  reviewable small diff into an unreviewable large one — record it as a finding instead
  (`.claude/rules/scope-control.md`).
- **Skipping the intermediate green checks**: running tests only at the very end of a multi-step
  refactor means a regression introduced at step 2 isn't caught until step 8, and is now much
  harder to isolate.
