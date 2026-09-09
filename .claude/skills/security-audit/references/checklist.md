# Security Audit Checklist

Grounded in `.claude/rules/security.md`. Not exhaustive — extend per what the target project
actually has (a per-project `security.md` stack rule file, once `repo-intelligence` generates one,
takes precedence for project-specific detail).

## Authentication & authorization
- [ ] Every endpoint/job entry point checks authorization server-side, scoped to the specific
      resource/tenant/owner — not just "is authenticated."
- [ ] No client-side-only authorization check protects a sensitive action.
- [ ] Session/token expiry and revocation actually work (a revoked token is rejected, not just
      absent from a "valid" list somewhere that's never checked).

## Tenant isolation
- [ ] The riskiest 2-3 cross-tenant queries/joins actually prevent tenant A reading/writing tenant
      B's data, including via a cache key or a foreign key that crosses tenant boundaries.

## Injection classes
- [ ] No string-built SQL/shell command from untrusted input.
- [ ] No server-side fetch to an attacker-influenceable URL/host without allowlisting (SSRF).
- [ ] User content is escaped/sanitized before rendering (XSS).

## Secrets & data exposure
- [ ] No secret hardcoded, logged, or returned in an error response.
- [ ] No more PII in logs/traces than the project's data-governance stance allows.

## File handling
- [ ] Uploads validate MIME/extension server-side, not just client-side.

## Rate limiting & abuse
- [ ] Sensitive endpoints (auth, password reset, OTP) have rate limiting/brute-force protection.

## Negative paths
- [ ] At least one test proves a prohibited action actually fails, not just that the happy path
      succeeds.
