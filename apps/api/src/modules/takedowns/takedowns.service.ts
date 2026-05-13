import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, ilike, desc, asc, count, SQL } from 'drizzle-orm';
import { DRIZZLE_DB, DrizzleDB } from '../../database/database.module';
import { takedowns, Takedown } from '../../database/schema';
import { CreateTakedownDto, UpdateTakedownDto, QueryTakedownDto } from './dto/takedowns.dto';

@Injectable()
export class TakedownsService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDB) {}

  async list(tenantId: string, q: QueryTakedownDto) {
    const conditions: SQL[] = [eq(takedowns.tenantId, tenantId)];
    if (q.status)   conditions.push(eq(takedowns.status,   q.status));
    if (q.platform) conditions.push(eq(takedowns.platform, q.platform));
    if (q.trackId)  conditions.push(eq(takedowns.trackId,  q.trackId));
    if (q.search)   conditions.push(ilike(takedowns.platform, `%${q.search}%`));
    const where = and(...conditions);
    const col   = q.ascending ? asc(takedowns.createdAt) : desc(takedowns.createdAt);
    const [rows, [{ value: total }]] = await Promise.all([
      this.db.select().from(takedowns).where(where).orderBy(col).offset(q.offset ?? 0).limit(q.limit ?? 50),
      this.db.select({ value: count() }).from(takedowns).where(where),
    ]);
    return { data: rows, meta: { total: Number(total), offset: q.offset ?? 0, limit: q.limit ?? 50 } };
  }

  async findById(tenantId: string, id: string): Promise<Takedown> {
    const [row] = await this.db.select().from(takedowns)
      .where(and(eq(takedowns.tenantId, tenantId), eq(takedowns.id, id))).limit(1);
    if (!row) throw new NotFoundException('Takedown não encontrado');
    return row;
  }

  async create(tenantId: string, dto: CreateTakedownDto): Promise<Takedown> {
    const [row] = await this.db.insert(takedowns).values({
      tenantId,
      platform:    dto.platform,
      trackId:     dto.trackId     ?? null,
      reason:      dto.reason      ?? null,
      requestedAt: dto.requestedAt ?? new Date(),
      metadata:    dto.metadata    ?? {},
    }).returning();
    return row;
  }

  async update(tenantId: string, id: string, dto: UpdateTakedownDto): Promise<Takedown> {
    await this.findById(tenantId, id);
    const [row] = await this.db.update(takedowns).set({
      ...(dto.platform    != null && { platform:    dto.platform }),
      ...(dto.reason      != null && { reason:      dto.reason }),
      ...(dto.status      != null && { status:      dto.status }),
      ...(dto.resolvedAt  != null && { resolvedAt:  dto.resolvedAt }),
      ...(dto.metadata    != null && { metadata:    dto.metadata }),
      updatedAt: new Date(),
    }).where(and(eq(takedowns.tenantId, tenantId), eq(takedowns.id, id))).returning();
    return row;
  }

  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    await this.db.update(takedowns).set({ status: 'rejected', updatedAt: new Date() })
      .where(and(eq(takedowns.tenantId, tenantId), eq(takedowns.id, id)));
    return { deleted: true };
  }
}
