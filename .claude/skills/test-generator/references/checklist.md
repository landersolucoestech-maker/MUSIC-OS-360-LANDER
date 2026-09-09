# Test Generator Checklist

- [ ] Every case named in `test-strategy-engineer`'s plan has a generated skeleton — none silently
      dropped because it was harder to set up.
- [ ] Each generated test asserts one specific behavior with a real expected value, not a
      placeholder (`references/anti-patterns.md`'s placeholder-assertion smell).
- [ ] At least one negative/edge case is generated for any non-trivial logic (empty input,
      boundary value, unauthorized actor), not only the happy path.
- [ ] Test names state the behavior and input class being tested, not just "test 1", "test 2".
- [ ] Generated tests actually fail against a reverted version of the fix — verified before
      handing off to `qa-engineer`, not assumed.
- [ ] No generated test mocks away the exact boundary the strategy plan wanted exercised.
