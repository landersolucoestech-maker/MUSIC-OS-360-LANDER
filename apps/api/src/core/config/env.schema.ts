import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'staging', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3001),

  DATABASE_URL: z
    .string()
    .optional()
    .refine(
      (val) => process.env['NODE_ENV'] !== 'production' || !!val,
      { message: 'DATABASE_URL is required in production' },
    ),

  // ── RLS defense-in-depth (P2-2) ─────────────────────────────────────────────
  // Optional connection string for an application DB role WITHOUT BYPASSRLS.
  // When unset the app keeps using DATABASE_URL (current behaviour). Only consumed
  // when DATABASE_SESSION_CONTEXT_ENABLED=true; never auto-rotated.
  APP_DATABASE_URL: z.string().optional(),
  // Master switch for runtime session-context (SET LOCAL app.current_tenant_id).
  // OFF by default → zero behavioural change. Must be explicitly 'true' to enable.
  DATABASE_SESSION_CONTEXT_ENABLED: z.enum(['true', 'false']).default('false'),
  // Reserved gate documenting that the API should connect with a NOBYPASSRLS role.
  // OFF by default; enabling is an explicit operator decision per environment.
  DATABASE_RLS_ENFORCEMENT: z.enum(['true', 'false']).default('false'),

  REDIS_QUEUE_URL: z
    .string()
    .optional()
    .refine(
      (val) => process.env['NODE_ENV'] !== 'production' || !!val,
      { message: 'REDIS_QUEUE_URL is required in production' },
    ),
  REDIS_URL: z.string().optional(),
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z.coerce.number().optional(),
  REDIS_PASSWORD: z.string().optional(),
  RBAC_PERSISTED_AUTHORITY: z.enum(['OFF', 'SHADOW', 'ON']).default('SHADOW'),
  RBAC_DUAL_READ_TELEMETRY: z.enum(['true', 'false']).default('true'),
  RBAC_DISTRIBUTED_CACHE_ENABLED: z.enum(['true', 'false']).default('true'),
  RBAC_AUDIT_MIRROR_ENABLED: z.enum(['true', 'false']).default('true'),
  RBAC_DECISION_RETENTION_DAYS: z.coerce.number().min(1).max(365).default(30),
  RBAC_DECISION_RETENTION_INTERVAL_HOURS: z.coerce
    .number()
    .min(1)
    .max(168)
    .default(6),

  SUPABASE_URL: z
    .string()
    .optional()
    .refine(
      (val) => process.env['NODE_ENV'] !== 'production' || !!val,
      { message: 'SUPABASE_URL is required in production' },
    ),

  JWT_SECRET: z.string().default('dev_jwt_secret_placeholder'),
  JWT_EXPIRES_IN: z.string().default('1h'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  CORS_ORIGINS: z
    .string()
    .default('http://localhost:5000')
    .refine(
      (val) => {
        if (process.env['NODE_ENV'] !== 'production') return true;
        // Production must NOT include localhost / 127.0.0.1
        return !/localhost|127\.0\.0\.1/i.test(val);
      },
      { message: 'CORS_ORIGINS cannot contain localhost in production' },
    ),

  ENCRYPTION_KEY: z
    .string()
    .length(64, 'ENCRYPTION_KEY must be 64 hex chars')
    .default('0000000000000000000000000000000000000000000000000000000000000000')
    .refine(
      (val) => {
        const isProduction = process.env.NODE_ENV === 'production';
        const isAllZero = /^0+$/.test(val);
        return !(isProduction && isAllZero);
      },
      { message: 'ENCRYPTION_KEY cannot be all-zero in production' },
    ),
  ENCRYPTION_IV_SECRET: z.string().min(1).default('dev_iv_secret_placeholder'),

  // Supabase auth keys — service role only ever used in backend (never VITE_*)
  SUPABASE_ANON_KEY: z
    .string()
    .optional()
    .refine(
      (val) => process.env['NODE_ENV'] !== 'production' || !!val,
      { message: 'SUPABASE_ANON_KEY is required in production' },
    ),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .optional()
    .refine(
      (val) => process.env['NODE_ENV'] !== 'production' || !!val,
      { message: 'SUPABASE_SERVICE_ROLE_KEY is required in production' },
    ),

  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_CONNECT_CLIENT_ID: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z
    .string()
    .optional()
    .refine(
      (val) => {
        // Required in production when Stripe is active (STRIPE_SECRET_KEY is set)
        if (process.env['NODE_ENV'] !== 'production') return true;
        const stripeActive = !!process.env['STRIPE_SECRET_KEY'];
        return !stripeActive || !!val;
      },
      { message: 'STRIPE_WEBHOOK_SECRET is required in production when STRIPE_SECRET_KEY is set' },
    ),
  STRIPE_PRICE_STARTER: z.string().optional(),
  STRIPE_PRICE_PROFESSIONAL: z.string().optional(),
  STRIPE_PRICE_ENTERPRISE: z.string().optional(),

  AUTENTIQUE_WEBHOOK_SECRET: z
    .string()
    .min(24, 'AUTENTIQUE_WEBHOOK_SECRET must have at least 24 characters')
    .optional()
    .refine(
      (val) => process.env['NODE_ENV'] !== 'production' || !!val,
      { message: 'AUTENTIQUE_WEBHOOK_SECRET is required in production' },
    ),

  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY: z.string().optional(),
  R2_SECRET_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().default('music-os-360'),
  R2_PUBLIC_URL: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (process.env['NODE_ENV'] !== 'production') return true;
        // Block placeholder values in production
        return !val || (!val.includes('pub-xxx') && !val.includes('placeholder'));
      },
      { message: 'R2_PUBLIC_URL must be set to a real Cloudflare R2 public URL in production' },
    ),

  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GOOGLE_AI_API_KEY: z.string().optional(),

  RESEND_API_KEY: z
    .string()
    .optional()
    .refine(
      (val) => process.env['NODE_ENV'] !== 'production' || !!val,
      { message: 'RESEND_API_KEY is required in production for transactional email' },
    ),
  RESEND_FROM_EMAIL: z
    .string()
    .email()
    .default('noreply@musicos360.com.br'),

  SENTRY_DSN: z
    .string()
    .url({ message: 'SENTRY_DSN must be a valid URL' })
    .optional()
    .refine(
      (val) => process.env['NODE_ENV'] !== 'production' || !!val,
      { message: 'SENTRY_DSN is required in production for error monitoring' },
    ),
  SENTRY_RELEASE: z.string().optional(),
  POSTHOG_API_KEY: z.string().optional(),
  POSTHOG_HOST: z.string().default('https://app.posthog.com'),

  IDEMPOTENCY_TTL_HOURS: z.coerce.number().min(1).max(168).default(24),
  APP_URL: z
    .string()
    .default('http://localhost:5000')
    .refine(
      (val) => {
        if (process.env['NODE_ENV'] !== 'production') return true;
        return !/localhost|127\.0\.0\.1/i.test(val);
      },
      { message: 'APP_URL cannot point to localhost in production' },
    ),
  FRONTEND_URL: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (process.env['NODE_ENV'] !== 'production') return true;
        return !val || !/localhost|127\.0\.0\.1/i.test(val);
      },
      { message: 'FRONTEND_URL cannot point to localhost in production' },
    ),

  ACRCLOUD_HOST: z.string().optional(),
  ACRCLOUD_ACCESS_KEY: z.string().optional(),
  ACRCLOUD_ACCESS_SECRET: z.string().optional(),

  SPOTIFY_CLIENT_ID: z.string().optional(),
  SPOTIFY_CLIENT_SECRET: z.string().optional(),
  SPOTIFY_REDIRECT_URI: z.string().optional(),
  SPOTIFY_OAUTH_STATE_SECRET: z.string().optional(),

  YOUTUBE_API_KEY: z.string().optional(),

  SOUNDCLOUD_CLIENT_ID: z.string().optional(),
  SOUNDCLOUD_CLIENT_SECRET: z.string().optional(),

  META_APP_ID: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
  META_REDIRECT_URI: z.string().optional(),

  TIKTOK_CLIENT_KEY: z.string().optional(),
  TIKTOK_CLIENT_SECRET: z.string().optional(),
  TIKTOK_REDIRECT_URI: z.string().optional(),

  DOCUSIGN_INTEGRATION_KEY: z.string().optional(),
  DOCUSIGN_CLIENT_SECRET: z.string().optional(),
  DOCUSIGN_AUTH_BASE_URL: z.string().url().default('https://account-d.docusign.com'),

  GOOGLE_ADS_CLIENT_ID: z.string().optional(),
  GOOGLE_ADS_CLIENT_SECRET: z.string().optional(),
  GOOGLE_ADS_REDIRECT_URI: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    console.error('Invalid environment variables:');
    result.error.issues.forEach((issue) => {
      console.error(`  ${issue.path.join('.')}: ${issue.message}`);
    });
    process.exit(1);
  }
  return result.data;
}
