# Documentation Anti-Patterns

- **Documenting intent instead of behavior**: describing what the code is "supposed to do" instead
  of what it actually does right now — the two can silently diverge over time.
- **Copy-pasted setup steps never re-run**: a runbook inherited from an older version of the
  project, never executed end-to-end since, with steps that reference a tool/flag that no longer
  exists.
- **A changelog that's really a diff summary**: "updated function X" tells a reader nothing about
  why it matters to them — document the user-visible or contract-visible effect, not the mechanics.
- **Undated "historical" content presented as current**: an old ADR or migration guide with no
  label distinguishing it from active guidance, so a reader can't tell it's superseded.
- **Documenting the internal identifier instead of the concept**: writing `status: PENDING_REVIEW`
  in a user-facing doc instead of "Pending Review" — leaks implementation detail into content a
  non-technical reader might see.
- **A README that only covers the happy path**: no mention of common failure modes or how to
  diagnose them, forcing every reader to rediscover the same troubleshooting steps.
