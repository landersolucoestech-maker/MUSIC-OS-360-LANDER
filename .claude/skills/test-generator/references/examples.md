# Test Generator — Expected Shape

Illustrates the assertion quality this skill's generated skeletons must meet (mirrors the actual
style used throughout this pack's own `tests/`).

## Weak (do not generate this)
```js
test("add works", () => {
  const result = add(2, 3);
  assert.ok(result);
});
```
`assert.ok` passes for any truthy result — this wouldn't fail even if `add` returned `1`.

## Correct
```js
test("add returns the sum of two positive integers", () => {
  assert.equal(add(2, 3), 5);
});

test("add throws on non-numeric input rather than returning NaN silently", () => {
  assert.throws(() => add(2, "x"));
});

test("add handles negative numbers correctly", () => {
  assert.equal(add(-2, 3), 1);
});
```
Each test names the specific behavior and input class; the assertion checks an exact expected
value, so a regression in the implementation actually fails the test.

## Negative-case pattern for an authorization check
```js
test("a user from tenant B cannot read tenant A's record", () => {
  const result = getRecord({ actor: tenantBUser, recordId: tenantARecordId });
  assert.equal(result.status, 403);
});
```
Proves the prohibited action actually fails — not just that the allowed action succeeds.
