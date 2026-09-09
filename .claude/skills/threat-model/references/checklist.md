# STRIDE Prompt Checklist

One set of prompts per category — apply against the specific data flow being modeled, not
generically.

## Spoofing
- Can an actor claim to be someone/something else at any point in this flow (a forged
  identity/token, a spoofed webhook sender)?

## Tampering
- Can data be modified in transit or at rest without detection (an unsigned webhook payload, a
  client-controlled field trusted server-side)?

## Repudiation
- Can an actor deny having performed an action this flow needs to be accountable for (missing
  audit log on a sensitive mutation)?

## Information disclosure
- Can any actor see data they shouldn't (a response including another tenant's data, a verbose
  error leaking internals, a log capturing PII/secrets)?

## Denial of service
- Can an actor exhaust a resource (unbounded request size, unbounded loop trigger, unthrottled
  expensive endpoint) and degrade the system for others?

## Elevation of privilege
- Can an actor reach a higher-privilege action than they're authorized for (a missing
  authorization check on an admin-only path, a role check that trusts client-supplied state)?
