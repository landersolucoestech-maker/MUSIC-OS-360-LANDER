# Debugging Checklist

- [ ] The failure is reproduced reliably (not "sometimes happens") before any fix is attempted.
- [ ] The exact input/state that triggers it is written down, not held only in your head.
- [ ] The failure is bisected to the smallest scope: which function, which recent change
      (`git log`/`git bisect`-style reasoning), which specific value.
- [ ] A specific, falsifiable hypothesis exists before the fix is written — not just "let's try
      this and see."
- [ ] The hypothesis was actually tested (a minimal check/log/assertion) before committing to the
      fix.
- [ ] The fix addresses the root cause identified by the hypothesis, not just the symptom that was
      first noticed.
- [ ] A regression test exists that would fail if the bug were reintroduced.
