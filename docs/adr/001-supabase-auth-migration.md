# ADR-001: Migrate Authentication from Clerk to Supabase

**Status:** Accepted  
**Date:** 2026-05-20  
**Deciders:** Engineering team

## Context

The system was using Clerk for JWT issuance and user management. Supabase was already the database provider. Running two auth services added complexity: double billing, two SDK surfaces, and synchronization friction when user data needed to be in the same DB.

## Decision

Replace Clerk with Supabase Auth as the sole identity provider.

- JWT format: ES256 via JWKS endpoint (`{SUPABASE_URL}/auth/v1/.well-known/jwks.json`)
- Custom Access Token Hook (SQL): injects `app_metadata.org_id` and `app_metadata.role` into every JWT at issuance time
- Backend: `JwtAuthGuard` validates via JWKS; reads `app_metadata` for tenant/role
- Frontend: Supabase JS SDK manages session lifecycle

## Consequences

**Positive:**
- Single auth surface — one SDK, one billing line, zero sync
- RLS policies can use JWT claims directly (`app_metadata.org_id`)
- No Clerk webhook to maintain for user sync

**Negative:**
- Clerk-specific features (Organizations UI, magic links via Clerk) must be replaced
- Custom Access Token Hook requires Supabase paid plan (Pro+)
- JWKS validation adds one HTTP round-trip per cold start (mitigated by caching)

## Rejected Alternatives

- **Keep Clerk + add Supabase sync webhook**: extra complexity, dual billing
- **Auth0**: adds third vendor, no advantage over Supabase for this use case
