# Feature Planning Anti-Patterns

- **Planning implementation before requirements are challenged**: skipping `requirements-reviewer`
  because "the ask seems obvious" — the obvious reading is often the adjacent-but-wrong one.
- **A task-spec breakdown with no dependency order**: tasks that assume something a later task
  produces, discovered only when implementation starts.
- **Silently absorbing scope creep into the plan**: the user asked for A, the plan grows to include
  B and C because they seemed related — record B/C as separate findings/requests, don't fold them
  in unasked.
- **Skipping `threat-model` for a new external-facing surface** because "we'll review it at the
  end" — security review after implementation finds design-level issues that are expensive to
  unwind.
- **Planning around a new dependency without `technology-selection-reviewer`**: assuming a new
  library is fine because it looked good in a search, without checking whether the stack already
  covers the need.
- **Acceptance criteria that can't actually be checked** ("the feature should feel fast") instead
  of something a command or reviewer can verify.
