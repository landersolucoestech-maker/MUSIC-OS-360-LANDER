import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'staging', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3001),

  // Database (PostgreSQL â€” node-postgres / TypeORM)
  // Required in production â€” migrations, queries, RLS all depend on it.
  DATABASE_URL: z
    .string()
    .optional()
    .refine(
      (val) => process.env['NODE_ENV'] !== 'production' || !!val,
      { message: 'DATABASE_URL Ã© obrigatÃ³rio em produÃ§Ã£o' },
    ),

  // Redis (BullMQ Queues via ioredis â€” obrigatÃ³rio em produÃ§Ã£o para idempotency e filas)
  REDIS_QUEUE_URL: z
    .string()
    .optional()
    .refine(
      (val) => process.env['NODE_ENV'] !== 'production' || !!val,
      { message: 'REDIS_QUEUE_URL Ã© obrigatÃ³rio em produÃ§Ã£o (BullMQ + IdempotencyStore)' },
    ),

  // Auth (Supabase â€” JWKS via ES256)
  // Required in production â€” without it JwtAuthGuard cannot validate any token.
  // JWKS endpoint is derived as: <SUPABASE_URL>/auth/v1/.well-known/jwks.json
  SUPABASE_URL: z
    .string()
    .optional()
    .refine(
      (val) => process.env['NODE_ENV'] !== 'production' || !!val,
      { message: 'SUPABASE_URL Ã© obrigatÃ³rio em produÃ§Ã£o (JwtAuthGuard usa JWKS)' },
    ),


  // Auth (JWT legado â€” mantido para compatibilidade)
  JWT_SECRET: z.string().default('dev_jwt_secret_placeholder'),
  JWT_EXPIRES_IN: z.string().default('1h'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  // CORS
  CORS_ORIGINS: z.string().default('http://localhost:5000'),

  // Criptografia AES-256
  ENCRYPTION_KEY: z
    .string()
    .length(64, 'ENCRYPTION_KEY deve ter 64 chars hex (256 bits)')
    .default('0000000000000000000000000000000000000000000000000000000000000000')
    .refine(
      (val) => {
        const isProduction = process.env.NODE_ENV === 'production';
        const isAllZero = /^0+$/.test(val);
        return !(isProduction && isAllZero);
      },
      { message: 'ENCRYPTION_KEY nÃ£o pode ser all-zero em produÃ§Ã£o. Gere uma chave segura com: openssl rand -hex 32' },
    ),
  ENCRYPTION_IV_SECRET: z.string().min(1).default('dev_iv_secret_placeholder'),

  // Stripe (opcional em dev)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_STARTER: z.string().optional(),
  STRIPE_PRICE_PROFESSIONAL: z.string().optional(),
  STRIPE_PRICE_ENTERPRISE: z.string().optional(),

  // Cloudflare R2 (S3-compatible)
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY: z.string().optional(),
  R2_SECRET_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().default('music-os-360'),
  R2_PUBLIC_URL: z.string().optional(),

  // AI
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GOOGLE_AI_API_KEY: z.string().optional(),

  // Resend
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z
    .string()
    .email()
    .default('noreply@musicos360.com.br'),

  // Monitoramento
  SENTRY_DSN: z.string().optional(),
  SENTRY_RELEASE: z.string().optional(), // Git SHA injected by CI/CD for release tracking
  POSTHOG_API_KEY: z.string().optional(),
  POSTHOG_HOST: z.string().default('https://app.posthog.com'),

  // Idempotency
  IDEMPOTENCY_TTL_HOURS: z.coerce.number().min(1).max(168).default(24), // 1hâ€“7d

  // App URL (para templates de email, etc.)
  APP_URL: z.string().default('http://localhost:5000'),

  // ACRCloud (monitoramento musical)
  ACRCLOUD_HOST: z.string().optional(),
  ACRCLOUD_ACCESS_KEY: z.string().optional(),
  ACRCLOUD_ACCESS_SECRET: z.string().optional(),

  // Spotify (OAuth + streaming metrics)
  SPOTIFY_CLIENT_ID: z.string().optional(),
  SPOTIFY_CLIENT_SECRET: z.string().optional(),
  SPOTIFY_REDIRECT_URI: z.string().optional(),

  // YouTube Data API v3
  YOUTUBE_API_KEY: z.string().optional(),

  // SoundCloud
  SOUNDCLOUD_CLIENT_ID: z.string().optional(),
  SOUNDCLOUD_CLIENT_SECRET: z.string().optional(),

  // Meta / Facebook (Instagram OAuth)
  META_APP_ID: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
  META_REDIRECT_URI: z.string().optional(),

  // TikTok
  TIKTOK_CLIENT_KEY: z.string().optional(),
  TIKTOK_CLIENT_SECRET: z.string().optional(),
  TIKTOK_REDIRECT_URI: z.string().optional(),

  // Google Ads
  GOOGLE_ADS_CLIENT_ID: z.string().optional(),
  GOOGLE_ADS_CLIENT_SECRET: z.string().optional(),
  GOOGLE_ADS_REDIRECT_URI: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    console.error('âŒ VariÃ¡veis de ambiente invÃ¡lidas:');
    result.error.issues.forEach((issue) => {
      console.error(`  ${issue.path.join('.')}: ${issue.message}`);
    });
    process.exit(1);
  }
  return result.data;
}
