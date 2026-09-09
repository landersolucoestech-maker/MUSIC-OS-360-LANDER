# Small-Step Refactor Example

Extracting a duplicated validation block into a shared function, illustrating the step size and
verification cadence `refactor-guide` prescribes.

## Step 0 — characterize
Write (or confirm existing) tests covering both call sites' current behavior, including their edge
cases, before touching either.

## Step 1 — extract, keep both call sites as-is
Create the new shared function with the exact logic copied from one call site. Do not yet call it
from anywhere. Run tests — still green, since nothing behavioral changed.

## Step 2 — switch the first call site
Replace the first call site's inline logic with a call to the new function. Run tests. If they
fail, the extraction wasn't actually behavior-identical — fix the shared function, not the call
site, and re-run before proceeding.

## Step 3 — switch the second call site
Same as step 2, one call site at a time — never both at once, so a failure isolates to exactly one
step.

## Step 4 — delete the now-dead duplicated logic
Only after both call sites are confirmed passing on the shared function. Run the full suite once
more.

Each step above is its own commit-sized unit specifically so a regression is traceable to exactly
one step, not a pile of simultaneous changes.
