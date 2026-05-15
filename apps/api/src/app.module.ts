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
import { NotificationsModule }     from './modules/notifications/notifications.module';
import { UploadsModule }           from './modules/uploads/uploads.module';
import { ContractTemplatesModule } from './modules/contract-templates/contract-templates.module';
import { InvoicesModule }          from './modules/invoices/invoices.module';
import { ClientsModule }           from './modules/clients/clients.module';
import { LeadsModule }             from './modules/leads/leads.module';
import { LeadInteractionsModule }  from './modules/lead-interactions/lead-interactions.module';
import { CampaignsModule }         from './modules/campaigns/campaigns.module';
import { BriefingsModule }         from './modules/briefings/briefings.module';
import { EventsModule }            from './modules/events/events.module';
import { ProjectsModule }          from './modules/projects/projects.module';
import { TakedownsModule }         from './modules/takedowns/takedowns.module';
import { SharesModule }            from './modules/shares/shares.module';
import { ReleasesModule }          from './modules/releases/releases.module';
import { UsersModule }             from './modules/users/users.module';
import { AuditLogModule }          from './modules/audit-log/audit-log.module';
import { SupportTicketsModule }    from './modules/support-tickets/support-tickets.module';
import { IntegrationsModule }      from './modules/integrations/integrations.module';
import { AIModule }                from './modules/ai/ai.module';
import { BillingModule }           from './modules/billing/billing.module';
import { ArtistGoalsModule }       from './modules/artist-goals/artist-goals.module';
import { ContentDetectionsModule } from './modules/content-detections/content-detections.module';
import { EcadReportsModule }       from './modules/ecad-reports/ecad-reports.module';
import { HrModule }                from './modules/hr/hr.module';
import { ClerkAuthGuard }    from './core/guards/clerk-auth.guard';
import { TenantGuard }       from './core/guards/tenant.guard';
import { RolesGuard }        from './core/guards/roles.guard';
import { RateLimitGuard }    from './core/guards/rate-limit.guard';

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

    // ── Core (EncryptionService, AuditService, RateLimitService) ─────────────
    CoreModule,

    // ── Auth (Clerk JWT + Webhook Sync) ───────────────────────────────────────
    AuthModule,

    // ── Filas (BullMQ + QueueModule) — só quando Redis ioredis está disponível
    QueueModule.register(),

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
    UploadsModule,

    // ── Módulos FASE 3 ────────────────────────────────────────────────────────
    ContractTemplatesModule,
    InvoicesModule,
    ClientsModule,
    LeadsModule,
    LeadInteractionsModule,
    CampaignsModule,
    BriefingsModule,
    EventsModule,
    ProjectsModule,
    TakedownsModule,
    SharesModule,
    ReleasesModule,
    UsersModule,
    AuditLogModule,
    SupportTicketsModule,

    // ── Módulos FASE 7 — Integrações Reais ───────────────────────────────────
    IntegrationsModule,

    // ── Módulos FASE 8 — AI Gateway ──────────────────────────────────────────
    AIModule,

    // ── Módulos FASE 6 — Stripe Billing ──────────────────────────────────────
    BillingModule,

    // ── Módulos FASE 10 — Artist Goals / Content Detections / ECAD / HR ──────
    ArtistGoalsModule,
    ContentDetectionsModule,
    EcadReportsModule,
    HrModule,
  ],
  providers: [
    // Guards globais aplicados a TODAS as rotas
    // Ordem: RateLimitGuard → ClerkAuthGuard → TenantGuard → RolesGuard
    Reflector,
    {
      provide:  APP_GUARD,
      useClass: RateLimitGuard,
    },
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
