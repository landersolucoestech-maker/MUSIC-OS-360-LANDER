# Code Review — Finding Write-Up Example

## Weak (do not write this)
> "This function looks a bit off, might want to double check it."

Not actionable — no file/line, no concrete failure scenario, no severity.

## Correct
> **`src/billing/charge.ts:47`** (ALTO/HIGH) — `chargeCustomer()` reads `customer.balance`, then
> later writes `customer.balance - amount` without a transaction or row lock. Two concurrent
> requests to charge the same customer can both read the same starting balance and both succeed,
> under-charging the customer by one of the two amounts (a lost-update race). Wrap the read and
> write in a single transaction with a row-level lock (see how `src/inventory/reserve.ts` handles
> the equivalent race for stock reservation).

Names the exact file/line, states the concrete failure scenario (two concurrent requests, the
specific wrong outcome), assigns a severity, and points to an existing pattern in the codebase that
already solves the same class of problem correctly.
