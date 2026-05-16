/**
 * audit-log/audit-log.service.ts
 *
 * Read-only service for querying audit_logs.
 * Guarantees tenant isolation on every query.
 * Never updates or deletes audit log rows.
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../database/database.module';
import { AuditLogEntity } from '../../database/entities';
import type { QueryAuditLogDto } from './dto/audit-log.dto';

@Injectable()
export class AuditLogService {
  private readonly repo: Repository<AuditLogEntity> | null = null;

  constructor(@Inject(DATA_SOURCE) ds: DataSource | null) {
    if (ds) this.repo = ds.getRepository(AuditLogEntity);
  }

  async list(tenantId: string, q: QueryAuditLogDto) {
    if (!this.repo) return { data: [], meta: { total: 0, offset: 0, limit: 50 } };

    const qb = this.repo
      .createQueryBuilder('a')
      .where('a.tenant_id = :tenantId', { tenantId });

    if (q.action)        qb.andWhere('a.action ILIKE :action',             { action:        `%${q.action}%` });
    if (q.userId)        qb.andWhere('a.user_id = :userId',                { userId:        q.userId });
    if (q.entity)        qb.andWhere('a.entity = :entity',                 { entity:        q.entity });
    if (q.entityId)      qb.andWhere('a.entity_id = :entityId',            { entityId:      q.entityId });
    if (q.actorRole)     qb.andWhere('a.actor_role = :actorRole',          { actorRole:     q.actorRole });
    if (q.correlationId) qb.andWhere('a.correlation_id = :correlationId',  { correlationId: q.correlationId });
    if (q.fromDate)      qb.andWhere('a.created_at >= :fromDate',          { fromDate:      new Date(q.fromDate) });
    if (q.toDate)        qb.andWhere('a.created_at <= :toDate',            { toDate:        new Date(q.toDate) });

    const limit  = Math.min(q.limit  ?? 50, 200);
    const offset = q.offset ?? 0;

    qb.orderBy('a.created_at', q.ascending ? 'ASC' : 'DESC')
      .skip(offset)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, offset, limit } };
  }

  /** Fetch a single audit log entry (tenant-safe) */
  async findById(tenantId: string, id: string) {
    if (!this.repo) return null;
    return this.repo.createQueryBuilder('a')
      .where('a.id = :id AND a.tenant_id = :tenantId', { id, tenantId })
      .getOne();
  }
}
