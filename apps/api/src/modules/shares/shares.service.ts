import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, desc, asc, count, SQL } from 'drizzle-orm';
import { DRIZZLE_DB, DrizzleDB } from '../../database/database.module';
import { shares, Share } from '../../database/schema';
import { CreateShareDto, UpdateShareDto, QueryShareDto } from './dto/shares.dto';

@Injectable()
export class SharesService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDB) {}

  async list(tenantId: string, q: QueryShareDto) {
    const conditions: SQL[] = [eq(shares.tenantId, tenantId)];
    if (q.workId)  conditions.push(eq(shares.workId,  q.workId));
    if (q.trackId) conditions.push(eq(shares.trackId, q.trackId));
    if (q.role)    conditions.push(eq(shares.role,    q.role));
    const where = and(...conditions);
    const col   = q.ascending ? asc(shares.createdAt) : desc(shares.createdAt);
    const [rows, [{ value: total }]] = await Promise.all([
      this.db.select().from(shares).where(where).orderBy(col).offset(q.offset ?? 0).limit(q.limit ?? 50),
      this.db.select({ value: count() }).from(shares).where(where),
    ]);
    return { data: rows, meta: { total: Number(total), offset: q.offset ?? 0, limit: q.limit ?? 50 } };
  }

  async findById(tenantId: string, id: string): Promise<Share> {
    const [row] = await this.db.select().from(shares)
      .where(and(eq(shares.tenantId, tenantId), eq(shares.id, id))).limit(1);
    if (!row) throw new NotFoundException('Share não encontrado');
    return row;
  }

  async create(tenantId: string, dto: CreateShareDto): Promise<Share> {
    const [row] = await this.db.insert(shares).values({
      tenantId,
      holderName: dto.holderName,
      role:       dto.role,
      percentage: String(dto.percentage),
      workId:     dto.workId    ?? null,
      trackId:    dto.trackId   ?? null,
      holderDoc:  dto.holderDoc ?? null,
      metadata:   dto.metadata  ?? {},
    }).returning();
    return row;
  }

  async update(tenantId: string, id: string, dto: UpdateShareDto): Promise<Share> {
    await this.findById(tenantId, id);
    const [row] = await this.db.update(shares).set({
      ...(dto.holderName != null && { holderName: dto.holderName }),
      ...(dto.holderDoc  != null && { holderDoc:  dto.holderDoc }),
      ...(dto.role       != null && { role:       dto.role }),
      ...(dto.percentage != null && { percentage: String(dto.percentage) }),
      ...(dto.status     != null && { status:     dto.status }),
      ...(dto.workId     != null && { workId:     dto.workId }),
      ...(dto.trackId    != null && { trackId:    dto.trackId }),
      ...(dto.metadata   != null && { metadata:   dto.metadata }),
      updatedAt: new Date(),
    }).where(and(eq(shares.tenantId, tenantId), eq(shares.id, id))).returning();
    return row;
  }

  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    await this.db.update(shares).set({ status: 'inactive', updatedAt: new Date() })
      .where(and(eq(shares.tenantId, tenantId), eq(shares.id, id)));
    return { deleted: true };
  }
}
