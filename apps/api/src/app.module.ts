/**
 * app.module.ts
 *
 * Módulo raiz do MUSIC OS 360 API.
 * BullMQ configurado com REDIS_QUEUE_URL — infraestrutura de filas enterprise.
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { HealthModule } from './modules/health/health.module';
import { QueueModule } from './queues/queue.module';
import { validateEnv } from './core/config/env.schema';

@Module({
  imports: [
    // ── Configuração de ambiente ─────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),

    // ── BullMQ — filas enterprise-ready ─────────────────────────────────────
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

    // ── Módulos de infraestrutura ────────────────────────────────────────────
    HealthModule,

    // ── Filas ────────────────────────────────────────────────────────────────
    QueueModule,
  ],
})
export class AppModule {}
