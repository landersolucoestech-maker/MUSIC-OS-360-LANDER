/**
 * queues/processors/notifications.processor.ts
 *
 * Processor BullMQ para a fila "notifications".
 * Persiste a notificação no banco (tabela notifications)
 * e emite via WebSocket para o utilizador em tempo real.
 */

import { Processor, WorkerHost }        from '@nestjs/bullmq';
import { Injectable, Logger, Inject }   from '@nestjs/common';
import { Job }                          from 'bullmq';
import { QUEUE_NAMES }                  from '../queue.constants';
import { DRIZZLE_DB, DrizzleDB }        from '../../database/database.module';
import { WsGateway }                    from '../../core/websocket/ws.gateway';
import { notifications }                from '../../database/schema';

// ─── Payload ──────────────────────────────────────────────────────────────────

export interface NotificationPayload {
  tenantId:  string;
  userId:    string;
  title:     string;
  body?:     string;
  type:      string;
  entity?:   string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

// ─── Processor ────────────────────────────────────────────────────────────────

@Processor(QUEUE_NAMES.NOTIFICATIONS)
@Injectable()
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDB,
    private readonly wsGateway: WsGateway,
  ) { super(); }

  async process(job: Job<NotificationPayload>): Promise<void> {
    const d = job.data;
    this.logger.log(
      `[notifications] job="${job.name}" id=${job.id} userId=${d.userId} type=${d.type}`,
    );

    // 1. Persistir no banco
    const [saved] = await this.db
      .insert(notifications)
      .values({
        tenant_id: d.tenantId,
        user_id:   d.userId,
        title:     d.title,
        body:      d.body ?? null,
        type:      d.type,
        entity:    d.entity ?? null,
        entity_id: d.entityId ?? null,
        metadata:  d.metadata ?? {},
      })
      .returning();

    this.logger.log(`[notifications] persistida id=${saved?.id}`);

    // 2. Emitir via WebSocket (fire-and-forget, gateway é @Global())
    try {
      this.wsGateway.sendToUser(d.tenantId, d.userId, 'notification:new', {
        id:        saved?.id,
        title:     d.title,
        body:      d.body,
        type:      d.type,
        entity:    d.entity,
        entityId:  d.entityId,
        createdAt: saved?.created_at,
      });
    } catch (wsErr) {
      // WebSocket pode não ter utilizador conectado — não é erro crítico
      this.logger.warn(`[notifications] WS emit falhou (userId=${d.userId}): ${(wsErr as Error).message}`);
    }
  }
}
