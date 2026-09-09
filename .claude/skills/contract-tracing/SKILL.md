---
name: contract-tracing
description: Traces every producer and every consumer of a specific internal or external contract (a DTO, an API route, an event payload, a shared type) so a change to it can be verified complete on both sides. Use before changing any shared contract, and whenever contract-reviewer or backend-reviewer flags a possible mismatch.
---

# Contract Tracing

## Method

1. Identify the contract's canonical definition (the type/schema/DTO that is the actual source of
   truth for its shape) — not a copy of it.
2. Grep for every place that constructs a value of this shape (producers) and every place that
   reads/destructures it (consumers) — across backend, frontend, workers, other services, and
   tests/fixtures/mocks that assert against its shape.
3. For each producer/consumer pair, confirm they currently agree on field names, types, and
   nullability. Disagreement found here is a finding for `contract-reviewer` (category C for
   internal, D for external) even if you weren't asked to fix it.
4. If the contract is genuinely external (a real third party, or a consumer outside this
   repository's control), you cannot fix the other side — document the boundary and prefer a
   versioned/backward-compatible change over a breaking one.
5. If the contract is fully internal, produce the list of every file that must change together;
   hand it to `implementation-engineer` as one bounded batch so nothing is left on the old shape.

## Output

A producer/consumer list attached to the relevant finding or requirement, used by `implementation-engineer` to
scope one coherent batch and by `git-auditor` to confirm nothing outside that list changed.
