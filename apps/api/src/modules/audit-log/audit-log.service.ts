import { Injectable, Inject } from '@nestjs/common';
import { eq, and, ilike, desc, asc, count, SQL } from 'drizzle-orm';
import { DRIZZLE_DB, DrizzleDB } from '../../database/database.module';
import { auditLogs } from '../../database/schema';
import { QueryAuditLogDto } from './dto/audit-log.dto';

@Injectable()
export class AuditLogService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDB) {}

  async list(tenantId: string, q: QueryAuditLogDto) {
    const conditions: SQL[] = [eq(auditLogs.tenantId, tenantId)];
    if (q.action)   conditions.push(ilike(auditLogs.action,    `%${q.action}%`));
    if (q.userId)   conditions.push(eq(auditLogs.userId,       q.userId));
    if (q.entity)   conditions.push(eq(auditLogs.entity,       q.entity));
    if (q.entityId) conditions.push(eq(auditLogs.entityId,     q.entityId));
    const where = and(...conditions);
    const col   = q.ascending ? asc(auditLogs.createdAt) : desc(auditLogs.createdAt);
    const [rows, [{ value: total }]] = await Promise.all([
      this.db.select().from(auditLogs).where(where).orderBy(col).offset(q.offset ?? 0).limit(q.limit ?? 100),
      this.db.select({ value: count() }).from(auditLogs).where(where),
    ]);
    return { data: rows, meta: { total: Number(total), offset: q.offset ?? 0, limit: q.limit ?? 100 } };
  }
}
