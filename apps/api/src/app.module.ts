/**
 * app.module.ts
 *
 * Módulo raiz do MUSIC OS 360 API.
 * Infraestrutura completa:
 *   - Neon PostgreSQL (Drizzle ORM)
 *   - Upstash Redis (cache / rate-limit)
 *   - Cloudflare R2 (file storage)
 *   - BullMQ + Railway Redis (filas assíncronas)
 *   - Clerk (autenticação JWT + webhook sync)
 */

import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { Reflector } from '@nestjs/core';
import { validateEnv } from './core/config/env.schema';
import { DatabaseModule }       from './database/database.module';
import { CacheModule }          from './cache/cache.module';
import { StorageModule }        from './storage/storage.module';
import { HealthModule }         from './modules/health/health.module';
import { QueueModule }          from './queues/queue.module';
import { AuthModule }           from './modules/auth/auth.module';
import { CoreModule }           from './core/core.module';
import { ArtistsModule }        from './modules/artists/artists.module';
import { WorksModule }          from './modules/works/works.module';
import { PhonogramsModule }     from './modules/phonograms/phonograms.module';
import { ContractsModule }      from './modules/contracts/contracts.module';
import { TransactionsModule }   from './modules/transactions/transactions.module';
import { WsModule }             from './core/websocket/ws.module';
import { NotificationsModule }  from './modules/notifications/notifications.module';
import { ClerkAuthGuard }       from './core/guards/clerk-auth.guard';
import { TenantGuard }          from './core/guards/tenant.guard';
import { RolesGuard }           from './core/guards/roles.guard';

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

    // ── Core (EncryptionService, AuditService, RateLimitService) ─────────────
    CoreModule,

    // ── Auth (Clerk JWT + Webhook Sync) ───────────────────────────────────────
    AuthModule,

    // ── Filas ─────────────────────────────────────────────────────────────────
    QueueModule,

    // ── WebSocket Gateway (Socket.IO + Redis Pub/Sub) ─────────────────────────
    WsModule,

    // ── Módulos de domínio ────────────────────────────────────────────────────
    HealthModule,
    ArtistsModule,
    WorksModule,
    PhonogramsModule,
    ContractsModule,
    TransactionsModule,
    NotificationsModule,
  ],
  providers: [
    // Guards globais aplicados a TODAS as rotas
    // Ordem: ClerkAuthGuard → TenantGuard → RolesGuard
    Reflector,
    {
      provide:  APP_GUARD,
      useClass: ClerkAuthGuard,
    },
    {
      provide:  APP_GUARD,
      useClass: TenantGuard,
    },
    {
      provide:  APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
