# PR Description — Weak vs. Correct

## Weak (do not write this)
```
## Summary
Fixed the bug and updated some tests.

## Test plan
Tests pass.
```
Says nothing about what was actually wrong, what changed, or what was actually verified — a
reviewer has to re-derive all of it from the diff.

## Correct
```
## Summary
- Fixed a race condition where two concurrent checkout requests for the same seat could both
  succeed, double-booking it (requirement req-a1b2, criterion ac-c3d4).
- Root cause: the availability check and the reservation write were not in the same transaction.
- Fix: wrapped both in a single transaction with a row-level lock on the seat record.

## Known accepted debt
- The same race condition pattern exists in the (out-of-scope) waitlist feature — recorded as
  finding find-e5f6, disposition DIVIDA_ACEITA, tracked for a follow-up.

## Test plan
- `node .claude/runtime/ops.mjs evidence run --cmd "npm run test:concurrency"` — new test
  simulating 50 concurrent checkout attempts for one seat, confirms exactly one succeeds
  (evidence ev-7g8h, PASS).
- Full regression suite: evidence ev-9i0j, PASS.
```
Names the actual requirement/criterion closed, states the root cause (not just the symptom),
discloses known accepted debt instead of hiding it, and cites the actual evidence IDs a reviewer
can look up rather than asserting "tests pass."
