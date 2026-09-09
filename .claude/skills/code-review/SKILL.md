---
name: code-review
description: A PR/diff-style correctness and quality pass over a specific set of changes — the general code-review entry point (distinct from review, which routes to domain specialists, and from adversarial-reviewer, which tries to disprove a claimed-done change). Use when asked to review a diff/PR for bugs and quality, not to audit a whole subsystem.
---

# Code Review

1. Read the actual diff, not a summary of it.
2. Check against `references/anti-patterns.md` for this pack's known low-value/risky patterns.
3. Distinguish correctness bugs (will misbehave) from style/simplification opportunities (works,
   could be cleaner) — report both but don't block on the latter alone.
4. Verify the diff actually does what its description claims — a common failure mode is a
   description that oversells what the diff does.

## Output
Findings ranked most-severe first: file, line, what's wrong, concrete failure scenario for a
correctness bug. See `references/anti-patterns.md` for the specific pattern catalogue this check
draws from.
