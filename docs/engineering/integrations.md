---
paths:
  - "apps/api/src/modules/integrations/**"
  - "server/**"
description: Third-party integrations (Supabase, Stripe, AI providers, OAuth)
---

# Integrations

This repo integrates Supabase (auth/storage/realtime), Stripe (billing), OpenAI/Anthropic/Google
Generative AI (AI features, see `server/ai-proxy.ts` and `apps/api` AI modules), Sentry, PostHog.

- OAuth/token handling: follow the existing pattern in
  `apps/api/src/modules/integrations/integrations.oauth-security.spec.ts` and neighboring code —
  don't roll a new token storage/refresh mechanism.
- Never hardcode API keys or webhook secrets; they come from env config
  (`apps/api/src/core/config/env.schema.ts`) which validates presence/shape at startup — extend
  that schema rather than reading `process.env` ad hoc in a new module.
- Webhook handlers (Stripe, etc.) must verify signatures before trusting payload contents.
- Placeholder/dummy detection exists on purpose for Sentry/PostHog (`isPlaceholder`,
  `isPostHogPlaceholder` — see `security-regression` CI job) — don't remove it to silence a
  warning; fix the actual missing config.
- AI provider calls should have real error handling for rate limits/timeouts, not a silent
  fallback that fabricates a response.
