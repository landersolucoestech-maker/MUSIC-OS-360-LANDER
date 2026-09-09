# Verification and Test Strategy

Tests are selected by risk and changed boundaries, not by ritual. Never invent script names; inspect package/project configuration first.

## Minimum behavior

Changed product code needs fresh executed validation bound to the current workspace fingerprint. Use the narrowest fast checks first, then broader checks required by impact.

Select among unit, integration, contract, component, e2e/browser, visual, property/fuzz, mutation, performance/load, concurrency, migration/restore, security and production synthetic testing according to the failure modes introduced.

## False-green prevention

A green suite is insufficient when:
- the test never exercises the changed path;
- mocks remove the boundary under review;
- assertions are too weak;
- the evidence was produced before the latest code change;
- the environment differs materially from the target;
- required tests were skipped.

For broad/high-risk work, activate `test-strategy-engineer`. For authorization/tenant/data changes, include negative tests proving prohibited access/invalid transitions fail, not only happy paths.

A failed test is evidence to investigate. Never delete/skip/weaken a check merely to obtain green.
