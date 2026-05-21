# ADR-001: Supabase Auth as the Sole Identity Provider

**Status:** Accepted  
**Date:** 2026-05-20  
**Deciders:** Engineering team

## Context

The system previously had a legacy third-party auth surface while Supabase was already the database provider. Running two identity surfaces added complexity: double billing, two SDK surfaces, and synchronization friction when user data needed to live in the same database.

## Decision

Use Supabase Auth as the sole identity provider.

- JWT format: ES256 via JWKS endpoint (`{SUPABASE_URL}/auth/v1/.well-known/jwks.json`)
- Custom Access Token Hook (SQL): injects `app_metadata.org_id` and `app_metadata.role` into every JWT at issuance time
- Backend: `JwtAuthGuard` validates via JWKS; reads `app_metadata` for tenant/role
- Frontend: Supabase JS SDK manages session lifecycle

## Consequences

**Positive:**
- Single auth surface — one SDK, one billing line, zero sync
- RLS policies can use JWT claims directly (`app_metadata.org_id`)
- No external auth synchronization webhook to maintain

**Negative:**
- Legacy external-auth conveniences must be replaced with Supabase-native flows
- Custom Access Token Hook requires Supabase paid plan (Pro+)
- JWKS validation adds one HTTP round-trip per cold start (mitigated by caching)

## Rejected Alternatives

- **Keep a second auth provider + add Supabase sync webhook**: extra complexity, dual billing
- **Auth0**: adds third vendor, no advantage over Supabase for this use case
