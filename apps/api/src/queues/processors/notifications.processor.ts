/**
 * queues/processors/notifications.processor.ts
 *
 * Processor BullMQ para a fila "notifications".
 * Persiste a notificação no banco (tabela notifications)
 * e emite via WebSocket para o utilizador em tempo real.
 */

import { Processor, WorkerHost }      from '@nestjs/bullmq';
import { Injectable, Logger, Inject } from '@nestjs/common';
import { Job }                        from 'bullmq';
import { DataSource, Repository }     from 'typeorm';
import { QUEUE_NAMES, NOTIFICATION_JOB_NAMES } from '../queue.constants';
import { DATA_SOURCE }                from '../../database/database.module';
import { DatabaseContextService }     from '../../database/database-context.service';
import { NotificationEntity }         from '../../database/entities';
import { WsGateway }                  from '../../core/websocket/ws.gateway';

export interface NotificationPayload {
  tenantId:  string;
  userId?:   string;
  title:     string;
  body?:     string;
  /** Notification type — generic (info/warning) or domain event identifier (contract:expiring) */
  type:      string;
  entity?:   string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

@Processor(QUEUE_NAMES.NOTIFICATIONS)
@Injectable()
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);
  private readonly repo: Repository<NotificationEntity> | null = null;

  constructor(
    @Inject(DATA_SOURCE) ds: DataSource | null,
    private readonly wsGateway: WsGateway,
    private readonly dbContext: DatabaseContextService,
  ) {
    super();
    if (ds) this.repo = ds.getRepository(NotificationEntity);
  }

  async process(job: Job<NotificationPayload>): Promise<unknown> {
    this.logger.log(`[notifications] job="${job.name}" id=${job.id} tenant=${job.data.tenantId}`);

    switch (job.name) {
      case NOTIFICATION_JOB_NAMES.SEND:            return this.handleSend(job);
      case NOTIFICATION_JOB_NAMES.BROADCAST_TENANT: return this.handleBroadcast(job);
      default:
        this.logger.warn(`[notifications] job desconhecido: "${job.name}" — ignorado`);
        return null;
    }
  }

  private async handleSend(job: Job<NotificationPayload>): Promise<unknown> {
    const d = job.data;
    if (!this.repo) { this.logger.warn('[notifications/send] DB não configurado — pulando persistência'); return null; }
    // Fail-closed: an async job without a tenant must NOT touch tenant-scoped data.
    if (!d.tenantId) { this.logger.warn(`[notifications/send] job ${job.id} sem tenantId — abortado (fail-closed)`); return null; }

    // P2-5: run the write inside the tenant DB context so RLS applies once the
    // app connects via the NOBYPASSRLS role + DATABASE_SESSION_CONTEXT_ENABLED=true.
    // Flag OFF → passthrough (default manager), identical to current behaviour.
    const saved = await this.dbContext.runInTenantContext(
      { tenantId: d.tenantId, orgId: null, role: null },
      async (manager) => {
        const repo = manager ? manager.getRepository(NotificationEntity) : this.repo!;
        const entity = repo.create({
          tenant_id: d.tenantId,
          user_id:   d.userId ?? '',
          title:     d.title,
          body:      d.body     ?? null,
          type:      d.type,
          entity:    d.entity   ?? null,
          entity_id: d.entityId ?? null,
          metadata:  d.metadata ?? {},
        });
        return (await repo.save(entity)) as NotificationEntity;
      },
    );

    this.logger.log(`[notifications/send] persistida id=${saved.id}`);

    try {
      if (d.userId) {
        this.wsGateway.sendToUser(d.tenantId, d.userId, 'notification:new', {
          id: saved.id, title: d.title, body: d.body, type: d.type, entity: d.entity, entityId: d.entityId, createdAt: saved.created_at,
        });
      } else {
        this.wsGateway.sendToTenant(d.tenantId, 'notification:new', {
          id: saved.id, title: d.title, body: d.body, type: d.type, entity: d.entity, entityId: d.entityId, createdAt: saved.created_at,
        });
      }
    } catch (wsErr) {
      this.logger.warn(`[notifications/send] WS emit falhou: ${(wsErr as Error).message}`);
    }

    return saved;
  }

  private handleBroadcast(job: Job<NotificationPayload>): { broadcasted: boolean } {
    const d = job.data;
    try {
      this.wsGateway.sendToTenant(d.tenantId, 'notification:new', {
        id: null, title: d.title, body: d.body, type: d.type, entity: d.entity, entityId: d.entityId, createdAt: new Date(),
      });
      this.logger.log(`[notifications/broadcast] tenant=${d.tenantId} — "${d.title}"`);
    } catch (wsErr) {
      this.logger.warn(`[notifications/broadcast] WS emit falhou: ${(wsErr as Error).message}`);
    }
    return { broadcasted: true };
  }
}
