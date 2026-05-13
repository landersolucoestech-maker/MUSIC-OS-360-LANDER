/**
 * app.module.ts
 *
 * Módulo raiz do MUSIC OS 360 API.
 * Infraestrutura completa:
 *   - Neon PostgreSQL (Drizzle ORM)
 *   - Upstash Redis (cache / rate-limit)
 *   - Cloudflare R2 (file storage)
 *   - BullMQ + Railway Redis (filas assíncronas)
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { validateEnv } from './core/config/env.schema';
import { DatabaseModule } from './database/database.module';
import { CacheModule } from './cache/cache.module';
import { StorageModule } from './storage/storage.module';
import { HealthModule } from './modules/health/health.module';
import { QueueModule } from './queues/queue.module';

@Module({
  imports: [
    // ── Ambiente ─────────────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),

    // ── Neon PostgreSQL (Drizzle ORM) ─────────────────────────────────────────
    DatabaseModule,

    // ── Upstash Redis (cache / rate-limit) ────────────────────────────────────
    CacheModule,

    // ── Cloudflare R2 (file storage) ──────────────────────────────────────────
    StorageModule,

    // ── BullMQ — filas enterprise-ready (Railway Redis) ───────────────────────
    BullModule.forRoot({
      connection: {
        url: process.env.REDIS_QUEUE_URL,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      },
      defaultJobOptions: {
        attempts: 3,
        removeOnComplete: 100,
        removeOnFail: 1000,
        backoff: {
          type: 'exponential',
          delay: 3000,
        },
      },
    }),

    // ── Módulos de domínio ────────────────────────────────────────────────────
    HealthModule,

    // ── Filas ─────────────────────────────────────────────────────────────────
    QueueModule,
  ],
})
export class AppModule {}
