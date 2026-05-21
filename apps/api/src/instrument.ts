/**
 * instrument.ts — Sentry SDK initialization
 *
 * MUST be the very first import in main.ts (before NestJS, Express, anything).
 * Uses synchronous init so the SDK instruments Express before the framework
 * installs its own request handlers.
 *
 * When SENTRY_DSN is absent the SDK is disabled; the app boots normally.
 */

// ── Silences ioredis noise in development ─────────────────────────────────────
// BullMQ duplicates ioredis connections per queue; duplicates emit 'error' events
// with no listeners → ioredis logs "[ioredis] Unhandled error event" to console.
// In production (Railway) Redis is reachable — this filter doesn't interfere.
if (process.env['NODE_ENV'] !== 'production') {
  const _origError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    const first = String(args[0] ?? '');
    if (
      first.includes('[ioredis]') ||
      first.includes('ENOTFOUND') ||
      first.includes('redis.railway.internal') ||
      first.includes('Connection is closed')
    ) {
      return;
    }
    _origError(...args);
  };
}

import * as Sentry from '@sentry/node';

const SENTRY_DSN = process.env['SENTRY_DSN'];

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,

    environment: process.env['NODE_ENV'] ?? 'development',

    // Release tracking — inject via CI/CD as the git SHA.
    release: process.env['SENTRY_RELEASE'] ?? undefined,

    // Distributed tracing: 10% in production, 100% in dev/staging.
    tracesSampleRate: process.env['NODE_ENV'] === 'production' ? 0.1 : 1.0,

    // Profiling: 5% in production only.
    profilesSampleRate: process.env['NODE_ENV'] === 'production' ? 0.05 : 0,

    // Never send request bodies — they may contain PII or encrypted data.
    sendDefaultPii: false,

    integrations: [
      Sentry.httpIntegration(),
      Sentry.expressIntegration(),
    ],

    // Suppress client errors (4xx) — only capture system errors.
    ignoreErrors: [
      /^NotFoundException/,
      /^UnauthorizedException/,
      /^ForbiddenException/,
      /^BadRequestException/,
      /^ConflictException/,
    ],

    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === 'console' && process.env['NODE_ENV'] === 'production') {
        return null;
      }
      return breadcrumb;
    },
  });

  console.info(`[Sentry] Initialized — env: ${process.env['NODE_ENV'] ?? 'development'}`);
} else {
  console.info('[Sentry] SENTRY_DSN not set — monitoring disabled');
}

export { Sentry };
