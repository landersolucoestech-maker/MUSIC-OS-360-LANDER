/**
 * modules/notifications/notifications.processor.ts
 *
 * NotificationsProcessor — processa jobs da fila NOTIFICATIONS:
 *   1. Persiste a notificação no banco via Drizzle ORM
 *   2. Emite evento WebSocket para o utilizador alvo (ou todo o tenant)
 *
 * Adapta o padrão do documento FASE 4 para Drizzle (sem PrismaService).
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { DRIZZLE_DB, DrizzleDB } from '../../database/database.module';
import { notifications }          from '../../database/schema';
import { WsGateway }              from '../../core/websocket/ws.gateway';
import { QUEUE_NAMES, NOTIFICATION_JOB_NAMES } from '../../queues/queue.constants';

export interface NotificationJobData {
  tenantId:  string;
  userId?:   string;
  title:     string;
  body?:     string;
  type:      string;
  entity?:   string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

@Processor(QUEUE_NAMES.NOTIFICATIONS)
@Injectable()
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDB,
    private readonly ws: WsGateway,
  ) {
    super();
  }

  async process(job: Job<NotificationJobData>): Promise<unknown> {
    switch (job.name) {
      case NOTIFICATION_JOB_NAMES.SEND:
        return this.handleSend(job);
      case NOTIFICATION_JOB_NAMES.BROADCAST_TENANT:
        return this.handleBroadcast(job);
      default:
        this.logger.warn(`[notifications] job desconhecido: "${job.name}" — ignorado`);
        return null;
    }
  }

  private async handleSend(job: Job<NotificationJobData>): Promise<unknown> {
    const d = job.data;

    // 1. Persistir notificação no banco
    const [created] = await this.db
      .insert(notifications)
      .values({
        tenantId: d.tenantId,
        userId:   d.userId   ?? null,
        title:    d.title,
        body:     d.body     ?? null,
        type:     d.type,
        entity:   d.entity   ?? null,
        entityId: d.entityId ?? null,
        metadata: d.metadata ?? {},
      })
      .returning();

    // 2. Emitir via WebSocket
    const payload = {
      id:         created.id,
      title:      created.title,
      body:       created.body,
      type:       created.type,
      entity:     created.entity,
      entityId:   created.entityId,
      createdAt:  created.createdAt,
    };

    if (d.userId) {
      this.ws.sendToUser(d.tenantId, d.userId, 'notification:new', payload);
    } else {
      this.ws.sendToTenant(d.tenantId, 'notification:new', payload);
    }

    this.logger.log(`[notifications/send] entregue: tenant=${d.tenantId} user=${d.userId ?? 'all'} — "${d.title}"`);
    return created;
  }

  private async handleBroadcast(job: Job<NotificationJobData>): Promise<unknown> {
    // Broadcast para todo o tenant sem persistir (notificação efémera)
    const d = job.data;

    this.ws.sendToTenant(d.tenantId, 'notification:new', {
      id:        null,
      title:     d.title,
      body:      d.body,
      type:      d.type,
      entity:    d.entity,
      entityId:  d.entityId,
      createdAt: new Date(),
    });

    this.logger.log(`[notifications/broadcast] tenant=${d.tenantId} — "${d.title}"`);
    return { broadcasted: true };
  }
}
