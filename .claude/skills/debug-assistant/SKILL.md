---
name: debug-assistant
description: Systematic debugging for something broken but not yet classified as a full incident (no live user impact, or a dev-time failure) — reproduce, isolate, hypothesize, test, fix the root cause. Escalate to the incident skill instead if there's live user/production impact.
---

# Debug Assistant

1. **Reproduce**: get the exact steps/input that trigger the failure — a bug you can't reproduce
   isn't ready to fix yet; keep narrowing input/environment until it's reliable.
2. **Isolate**: bisect the failure to the smallest scope — which function, which commit
   (`git log`/`git bisect`-style reasoning), which specific input value.
3. **Hypothesize**: form a specific, falsifiable hypothesis about the cause — not "something's
   wrong with the parser," but "the parser mishandles an empty string because of X."
4. **Test the hypothesis**: add a minimal check/log/test that would confirm or refute it before
   writing the fix — don't fix speculatively.
5. **Fix the root cause**, not the symptom (`why` skill if the cause isn't obvious yet), then add a
   regression test proving the specific bug is caught (`qa-engineer`/`test-generator`).

## Non-goals
Do not ship a fix you haven't actually confirmed addresses the isolated cause — "I changed
something and it seems to work now" is not root-cause resolution.
