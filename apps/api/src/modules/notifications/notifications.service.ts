/**
 * modules/notifications/notifications.service.ts
 *
 * NotificationsService — CRUD de notificações + enqueue para a fila BullMQ.
 *
 * Dois modos de entrega:
 *   enqueue()   — persiste no banco e entrega via WS (assíncrono, resiliente)
 *   sendDirect() — emite WS directamente sem persistir (para casos urgentes)
 */

import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { eq, and, isNull, desc, count, SQL } from 'drizzle-orm';
import { DRIZZLE_DB, DrizzleDB }    from '../../database/database.module';
import { notifications, Notification } from '../../database/schema';
import { WsGateway }                from '../../core/websocket/ws.gateway';
import { QUEUE_NAMES, NOTIFICATION_JOB_NAMES } from '../../queues/queue.constants';
import { CreateNotificationDto }    from './dto/create-notification.dto';
import { PaginationDto }            from '../../common/dto/pagination.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDB,
    @InjectQueue(QUEUE_NAMES.NOTIFICATIONS) private readonly queue: Queue,
    private readonly ws: WsGateway,
  ) {}

  /** Enfileira notificação para processamento assíncrono (persiste + WS). */
  async enqueue(tenantId: string, dto: CreateNotificationDto): Promise<{ jobId: string | undefined }> {
    const job = await this.queue.add(NOTIFICATION_JOB_NAMES.SEND, {
      tenantId,
      userId:   dto.userId,
      title:    dto.title,
      body:     dto.body,
      type:     dto.type,
      entity:   dto.entity,
      entityId: dto.entityId,
      metadata: dto.metadata,
    });

    return { jobId: job.id };
  }

  /** Lista notificações paginadas do tenant (opcionalmente filtra por userId). */
  async list(tenantId: string, userId: string | undefined, query: PaginationDto) {
    const conditions: SQL[] = [eq(notifications.tenantId, tenantId)];

    if (userId) conditions.push(eq(notifications.userId, userId));

    const where = and(...conditions);

    const [rows, [{ value: total }]] = await Promise.all([
      this.db
        .select()
        .from(notifications)
        .where(where)
        .orderBy(desc(notifications.createdAt))
        .offset(query.offset ?? 0)
        .limit(query.limit ?? 20),
      this.db
        .select({ value: count() })
        .from(notifications)
        .where(where),
    ]);

    return {
      data: rows,
      meta: { total: Number(total), offset: query.offset ?? 0, limit: query.limit ?? 20 },
    };
  }

  /** Conta notificações não lidas do utilizador. */
  async countUnread(tenantId: string, userId: string): Promise<number> {
    const [{ value: total }] = await this.db
      .select({ value: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.tenantId, tenantId),
          eq(notifications.userId, userId),
          isNull(notifications.readAt),
        ),
      );

    return Number(total);
  }

  /** Marca uma notificação como lida. */
  async markRead(tenantId: string, id: string): Promise<Notification> {
    const [existing] = await this.db
      .select()
      .from(notifications)
      .where(and(eq(notifications.tenantId, tenantId), eq(notifications.id, id)))
      .limit(1);

    if (!existing) throw new NotFoundException('Notificação não encontrada');

    const [updated] = await this.db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.tenantId, tenantId), eq(notifications.id, id)))
      .returning();

    return updated;
  }

  /** Marca todas as notificações do utilizador como lidas. */
  async markAllRead(tenantId: string, userId: string): Promise<{ updated: number }> {
    const result = await this.db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.tenantId, tenantId),
          eq(notifications.userId, userId),
          isNull(notifications.readAt),
        ),
      )
      .returning();

    return { updated: result.length };
  }
}
