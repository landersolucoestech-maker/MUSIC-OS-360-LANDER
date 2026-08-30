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
  private readonly ds: DataSource | null = null;

  constructor(@Inject(DATA_SOURCE) ds: DataSource | null) {
    this.ds = ds;
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

  /**
   * REM-01 (Remaining Product Completion Backlog): the Admin SaaS panel's
   * `admin-audit.service.ts` was calling this same `list()` — `@CurrentTenant()`-
   * scoped by design — so a super_admin only ever saw their own one tenant's
   * audit trail, never a real cross-tenant view. Mirrors the same
   * `listAdmin()` convention added to support-tickets: raw SQL, no tenant_id
   * filter (relies on `super_admin_full_access` RLS + `RequireRole('super_admin')`
   * at the controller), joined with `tenants` for `tenant_name`.
   */
  async listAdmin(query: { action?: string; entity?: string; limit?: number }) {
    if (!this.ds) return [];
    const params: unknown[] = [];
    const filters: string[] = ['tn.deleted_at IS NULL'];

    if (query.action) {
      params.push(`%${query.action}%`);
      filters.push(`a.action ILIKE $${params.length}`);
    }
    if (query.entity) {
      params.push(query.entity);
      filters.push(`a.entity = $${params.length}`);
    }
    params.push(Math.min(query.limit ?? 200, 500));

    return this.ds.query(
      `
      SELECT
        a.id, a.action, a.entity, a.entity_id, a.user_id, a.actor_role,
        a.tenant_id, tn.name AS tenant_name, a.ip_address, a.created_at
      FROM audit_logs a
      JOIN tenants tn ON tn.id = a.tenant_id
      WHERE ${filters.join(' AND ')}
      ORDER BY a.created_at DESC
      LIMIT $${params.length}
      `,
      params,
    );
  }

  /** Fetch a single audit log entry (tenant-safe) */
  async findById(tenantId: string, id: string) {
    if (!this.repo) return null;
    return this.repo.createQueryBuilder('a')
      .where('a.id = :id AND a.tenant_id = :tenantId', { id, tenantId })
      .getOne();
  }
}
