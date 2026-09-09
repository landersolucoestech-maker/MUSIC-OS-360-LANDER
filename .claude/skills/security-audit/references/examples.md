# Security Audit — Negative-Path Example

Illustrates `references/checklist.md`'s "at least one test proves a prohibited action actually
fails" applied to a tenant-scoped resource endpoint.

## Weak audit (do not stop here)
> Confirmed: a logged-in user from tenant A can fetch their own invoice via
> `GET /invoices/:id`. Looks fine.

Only exercised the authorized path — says nothing about whether the endpoint is actually scoped.

## Correct audit
> Confirmed the authorized path works, THEN attempted the negative case: authenticated as a user
> from tenant B, requested `GET /invoices/:id` using an invoice ID belonging to tenant A.
> **Finding (category G, CRITICAL)**: the endpoint returned `200` with tenant A's invoice data —
> the query filters by `invoice.id` only, with no `tenant_id` clause
> (`src/invoices/get-invoice.ts:23`). Any authenticated user can read any other tenant's invoices
> by ID. Root cause: the repository method `findById` doesn't accept or apply a tenant scope at
> all — every caller of it across the codebase has this same gap (grep found 4 call sites).
> Recommended fix: add tenant scoping to `findById` itself (fixes all 4 call sites at once) rather
> than patching this one endpoint.

Actually attempted the prohibited action, found a real cross-tenant leak, traced it to the root
cause shared across multiple call sites (not just the one endpoint that prompted the check), and
recommended a fix that closes the whole class of the bug.
