# Code Review Anti-Pattern Catalogue

Concrete patterns `code-review` checks for — grounded in `.claude/rules/naming-canonical.md`'s
"scaffolding disguised as a fix" list and general engineering discipline. Each entry: what it looks
like, why it's a finding, not just style.

## Silent failure masking
- Empty `catch` block, or a `catch` that only logs and continues past a state the rest of the code
  assumes didn't happen.
- A fallback value substituted for a real error, without the caller ever learning something failed.
- `Promise` rejection swallowed (`.catch(() => {})`) on an operation whose failure matters.

## Type-safety erosion
- `any` (or the language's equivalent escape hatch) introduced to silence a real type error rather
  than fix the underlying mismatch.
- An unchecked cast (`as unknown as X`, a force-unwrap) on a value that can genuinely be the
  excluded case at runtime.

## Duplication and drift
- The same validation/business rule reimplemented in a second layer without a stated architectural
  reason.
- A second field/flag for a concept that already has a canonical one (check `docs/NAMING_NORMALIZATION_CANONICAL_MAP.md`).

## Retry/error handling smells
- Unbounded retry with no backoff, on an operation that can genuinely fail persistently.
- A generic `catch (e) { throw new Error("failed") }` that discards the original error's detail.

## Test smells
- An assertion so weak it would pass even if the implementation were wrong (`assert.ok(result)` on
  a function that should return a specific value).
- A test that mocks away the exact boundary the change is supposed to prove works.

## Leftover scaffolding
- A `TODO`/`FIXME` with no tracking issue reference, left in changed code.
- A feature flag with no remaining code path that reads it (dead flag).
- Debug `console.log`/print statements left in.
