import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, ilike, desc, asc, count, SQL } from 'drizzle-orm';
import { DRIZZLE_DB, DrizzleDB } from '../../database/database.module';
import { briefings, Briefing } from '../../database/schema';
import { CreateBriefingDto, UpdateBriefingDto, QueryBriefingDto } from './dto/briefings.dto';

@Injectable()
export class BriefingsService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDB) {}

  async list(tenantId: string, q: QueryBriefingDto) {
    const conditions: SQL[] = [eq(briefings.tenantId, tenantId)];
    if (q.status)     conditions.push(eq(briefings.status, q.status));
    if (q.campaignId) conditions.push(eq(briefings.campaignId, q.campaignId));
    if (q.search)     conditions.push(ilike(briefings.title, `%${q.search}%`));
    const where = and(...conditions);
    const col   = q.ascending ? asc(briefings.createdAt) : desc(briefings.createdAt);
    const [rows, [{ value: total }]] = await Promise.all([
      this.db.select().from(briefings).where(where).orderBy(col).offset(q.offset ?? 0).limit(q.limit ?? 50),
      this.db.select({ value: count() }).from(briefings).where(where),
    ]);
    return { data: rows, meta: { total: Number(total), offset: q.offset ?? 0, limit: q.limit ?? 50 } };
  }

  async findById(tenantId: string, id: string): Promise<Briefing> {
    const [row] = await this.db.select().from(briefings)
      .where(and(eq(briefings.tenantId, tenantId), eq(briefings.id, id))).limit(1);
    if (!row) throw new NotFoundException('Briefing não encontrado');
    return row;
  }

  async create(tenantId: string, dto: CreateBriefingDto): Promise<Briefing> {
    const [row] = await this.db.insert(briefings).values({
      tenantId, title: dto.title,
      campaignId: dto.campaignId ?? null,
      content:    dto.content    ?? null,
      objectives: dto.objectives ?? [],
      dueAt:      dto.dueAt      ?? null,
      metadata:   dto.metadata   ?? {},
    }).returning();
    return row;
  }

  async update(tenantId: string, id: string, dto: UpdateBriefingDto): Promise<Briefing> {
    await this.findById(tenantId, id);
    const [row] = await this.db.update(briefings).set({
      ...(dto.title      != null && { title:      dto.title }),
      ...(dto.status     != null && { status:     dto.status }),
      ...(dto.content    != null && { content:    dto.content }),
      ...(dto.objectives != null && { objectives: dto.objectives }),
      ...(dto.dueAt      != null && { dueAt:      dto.dueAt }),
      ...(dto.metadata   != null && { metadata:   dto.metadata }),
      updatedAt: new Date(),
    }).where(and(eq(briefings.tenantId, tenantId), eq(briefings.id, id))).returning();
    return row;
  }

  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    await this.db.update(briefings).set({ status: 'archived', updatedAt: new Date() })
      .where(and(eq(briefings.tenantId, tenantId), eq(briefings.id, id)));
    return { deleted: true };
  }
}
