# Security Audit Anti-Patterns

- **Testing only the happy/authorized path**: confirming the intended user can do the intended
  thing, without ever trying the prohibited action (wrong tenant, wrong role, missing auth).
- **Trusting a client-side check as if it were authorization**: a UI that hides a button is not a
  server-side authorization boundary — the endpoint must enforce it independently.
- **Auditing the code without tracing the actual data flow**: confirming a function "looks like" it
  checks permissions without following the real call path from the exposed entry point.
- **Treating "no exception was thrown" as evidence of security**: a silently-succeeding
  unauthorized request is often worse than a loud failure, and absence of an error proves nothing
  either way.
- **Scoping the audit too narrowly to avoid finding uncomfortable results**: auditing only the new
  code in a diff when the actual risk is in how it's wired into an existing, unaudited boundary.
- **Downgrading a real finding's severity to unblock a mission** — the completion gate exists
  specifically to prevent this; a real CRITICAL/HIGH finding stays that severity.
