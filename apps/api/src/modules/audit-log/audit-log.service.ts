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
    const qb = this.repo!
      .createQueryBuilder('a')
      .where('a.tenant_id = :tenantId', { tenantId });

    if (q.action)   qb.andWhere('a.action ILIKE :action',     { action:   `%${q.action}%` });
    if (q.userId)   qb.andWhere('a.user_id = :userId',        { userId:   q.userId });
    if (q.entity)   qb.andWhere('a.entity = :entity',         { entity:   q.entity });
    if (q.entityId) qb.andWhere('a.entity_id = :entityId',    { entityId: q.entityId });

    qb.orderBy('a.created_at', q.ascending ? 'ASC' : 'DESC')
      .skip(q.offset ?? 0)
      .take(q.limit ?? 100);

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, offset: q.offset ?? 0, limit: q.limit ?? 100 } };
  }
}
