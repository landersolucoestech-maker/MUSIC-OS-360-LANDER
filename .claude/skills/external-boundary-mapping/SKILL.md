---
name: external-boundary-mapping
description: Maps every external integration boundary (third-party API, webhook, OAuth provider) — what crosses it, how auth/secrets are handled, and where an external name must NOT leak into internal domain naming. Use during repository discovery and before integration-reviewer or security-reviewer examines a specific provider.
---

# External Boundary Mapping

## Method

1. Enumerate providers by grepping known SDK imports, `.env.example` variable names (never their
   values), and any `integrations`/`webhooks`/`clients` directory `repo-intelligence` found.
2. For each provider, record: what data flows in, what flows out, the auth mechanism (API key,
   OAuth, signed webhook), where secrets are sourced from, and whether calls are synchronous or
   queued/async.
3. Identify the adapter/boundary layer for each provider — the file(s) that should be the only
   place the provider's own vocabulary (its field names, its status enums) is allowed to appear.
   Anything past that boundary should be translated into this project's canonical vocabulary
   (`docs/NAMING_NORMALIZATION_CANONICAL_MAP.md`) — a provider's raw field name leaking into domain code is a finding
   (category D) even if functionally harmless.
4. Flag any provider call with no visible rate-limit/timeout/retry handling, and any webhook
   receiver with no visible signature verification — hand these to `integration-reviewer` and
   `security-reviewer` respectively.

## Output

A per-provider boundary map used by `integration-reviewer`, `security-reviewer`, and
`canonical-naming` to keep external vocabulary out of internal names.
