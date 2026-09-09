# Test Generator Anti-Patterns

- **Generating only happy-path cases**: skeletons that exercise the expected input, with no
  negative/edge/boundary case even when the strategy plan called for one.
- **A placeholder assertion**: `expect(result).toBeDefined()` or `assert.ok(result)` generated as a
  stand-in and never replaced with a real, specific expected value.
- **Testing the mock instead of the real boundary**: generating a test that only asserts a mocked
  dependency was called, without ever exercising the actual logic under test.
- **One test asserting five unrelated things**: makes a failure ambiguous about which behavior
  broke — generate one behavior per test, per `references/examples.md`'s pattern.
- **Copy-pasting an existing test's structure without adapting its assertions**: produces a test
  that always passes because it's still checking the OLD function's behavior, not the new one's.
- **Skipping the case `test-strategy-engineer` explicitly called out** because it's harder to set up
  than the happy path — the harder case is usually the one that matters most.
