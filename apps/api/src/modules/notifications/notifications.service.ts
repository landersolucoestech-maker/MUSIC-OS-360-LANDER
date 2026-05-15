/**
 * modules/notifications/notifications.service.ts
 *
 * NotificationsService — CRUD de notificações + enqueue para a fila BullMQ.
 * Quando Redis não está disponível, enqueue() é no-op silencioso.
 */

import { Injectable, Inject, Optional, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../database/database.module';
import { NotificationEntity } from '../../database/entities';
import { WsGateway } from '../../core/websocket/ws.gateway';
import { QUEUE_NAMES, NOTIFICATION_JOB_NAMES } from '../../queues/queue.constants';
import type { CreateNotificationDto } from './dto/create-notification.dto';
import type { PaginationDto }         from '../../common/dto/pagination.dto';

@Injectable()
export class NotificationsService {
  private readonly repo: Repository<NotificationEntity> | null = null;

  constructor(
    @Inject(DATA_SOURCE) ds: DataSource | null,
    @Optional()
    @InjectQueue(QUEUE_NAMES.NOTIFICATIONS) private readonly queue: Queue | null,
    private readonly ws: WsGateway,
  ) {
    if (ds) this.repo = ds.getRepository(NotificationEntity);
  }

  async enqueue(tenantId: string, dto: CreateNotificationDto): Promise<{ jobId: string | undefined }> {
    if (!this.queue) return { jobId: undefined };
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

  async list(tenantId: string, userId: string | undefined, query: PaginationDto) {
    const qb = this.repo!
      .createQueryBuilder('n')
      .where('n.tenant_id = :tenantId', { tenantId });

    if (userId) qb.andWhere('n.user_id = :userId', { userId });

    qb.orderBy('n.created_at', 'DESC')
      .skip(query.offset ?? 0)
      .take(query.limit ?? 20);

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, offset: query.offset ?? 0, limit: query.limit ?? 20 } };
  }

  async countUnread(tenantId: string, userId: string): Promise<number> {
    return this.repo!
      .createQueryBuilder('n')
      .where('n.tenant_id = :tenantId AND n.user_id = :userId AND n.read_at IS NULL', { tenantId, userId })
      .getCount();
  }

  async markRead(tenantId: string, id: string): Promise<NotificationEntity> {
    const existing = await this.repo!
      .createQueryBuilder('n')
      .where('n.id = :id AND n.tenant_id = :tenantId', { id, tenantId })
      .getOne();
    if (!existing) throw new NotFoundException('Notificação não encontrada');

    await this.repo!.update({ id } as any, { read_at: new Date() } as any);
    return this.repo!.createQueryBuilder('n').where('n.id = :id', { id }).getOne() as Promise<NotificationEntity>;
  }

  async markAllRead(tenantId: string, userId: string): Promise<{ updated: number }> {
    const result = await this.repo!
      .createQueryBuilder()
      .update(NotificationEntity)
      .set({ read_at: new Date() } as any)
      .where('tenant_id = :tenantId AND user_id = :userId AND read_at IS NULL', { tenantId, userId })
      .execute();
    return { updated: result.affected ?? 0 };
  }
}
