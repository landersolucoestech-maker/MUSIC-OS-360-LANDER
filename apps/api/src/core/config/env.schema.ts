import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'staging', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3001),

  // Database (Replit built-in PostgreSQL — não usar directamente no NestJS)
  DATABASE_URL: z.string().optional(),

  // Database (Neon PostgreSQL — usar no NestJS/Drizzle)
  NEON_DATABASE_URL: z.string().optional(),
  NEON_DATABASE_DIRECT_URL: z.string().optional(),

  // Redis (BullMQ Queues via ioredis — deve ser URL acessível, não Railway internal)
  REDIS_QUEUE_URL: z.string().optional(),

  // Redis (Upstash — Cache / Rate Limit via REST API https://...)
  UPSTASH_REDIS_URL: z.string().optional(),
  UPSTASH_REDIS_TOKEN: z.string().optional(),
  // UPSTASH_REST_URL: URL REST HTTPS do Upstash (preferida sobre UPSTASH_REDIS_URL quando disponível)
  UPSTASH_REST_URL: z.string().optional(),

  // Auth (Clerk)
  CLERK_SECRET_KEY: z
    .string()
    .min(1, 'CLERK_SECRET_KEY é obrigatório')
    .default('sk_test_placeholder'),
  CLERK_PUBLISHABLE_KEY: z.string().optional(),
  CLERK_WEBHOOK_SECRET: z.string().default('whsec_placeholder'),

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
      { message: 'ENCRYPTION_KEY não pode ser all-zero em produção. Gere uma chave segura com: openssl rand -hex 32' },
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
  POSTHOG_API_KEY: z.string().optional(),
  POSTHOG_HOST: z.string().default('https://app.posthog.com'),

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
    console.error('❌ Variáveis de ambiente inválidas:');
    result.error.issues.forEach((issue) => {
      console.error(`  ${issue.path.join('.')}: ${issue.message}`);
    });
    process.exit(1);
  }
  return result.data;
}
