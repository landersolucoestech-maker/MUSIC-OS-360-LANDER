import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, ilike, isNull, desc, asc, count, SQL } from 'drizzle-orm';
import { DRIZZLE_DB, DrizzleDB } from '../../database/database.module';
import { briefings, Briefing }   from '../../database/schema';
import { CreateBriefingDto, UpdateBriefingDto, QueryBriefingDto } from './dto/briefings.dto';

@Injectable()
export class BriefingsService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDB) {}

  async list(tenantId: string, q: QueryBriefingDto) {
    const conditions: SQL[] = [
      eq(briefings.tenant_id, tenantId),
      isNull(briefings.deleted_at),
    ];
    if (q.status)     conditions.push(eq(briefings.status,      q.status));
    if (q.campaignId) conditions.push(eq(briefings.campanha_id, q.campaignId));
    if (q.search)     conditions.push(ilike(briefings.titulo,   `%${q.search}%`) as SQL);

    const where = and(...conditions);
    const col   = q.ascending ? asc(briefings.created_at) : desc(briefings.created_at);

    const [rows, [{ value: total }]] = await Promise.all([
      this.db.select().from(briefings).where(where).orderBy(col)
        .offset(q.offset ?? 0).limit(q.limit ?? 50),
      this.db.select({ value: count() }).from(briefings).where(where),
    ]);
    return { data: rows, meta: { total: Number(total), offset: q.offset ?? 0, limit: q.limit ?? 50 } };
  }

  async findById(tenantId: string, id: string): Promise<Briefing> {
    const [row] = await this.db.select().from(briefings)
      .where(and(eq(briefings.tenant_id, tenantId), eq(briefings.id, id), isNull(briefings.deleted_at)))
      .limit(1);
    if (!row) throw new NotFoundException('Briefing não encontrado');
    return row;
  }

  async create(tenantId: string, userId: string, dto: CreateBriefingDto): Promise<Briefing> {
    const [row] = await this.db.insert(briefings).values({
      tenant_id:   tenantId,
      titulo:      dto.title,
      campanha_id: dto.campaignId ?? null,
      descricao:   dto.content    ?? null,
      status:      'rascunho',
      prazo:       dto.dueAt     ? new Date(dto.dueAt) : null,
      metadata:    dto.metadata   ?? {},
      created_by:  userId,
    }).returning();
    return row;
  }

  async update(tenantId: string, userId: string, id: string, dto: UpdateBriefingDto): Promise<Briefing> {
    await this.findById(tenantId, id);
    const [row] = await this.db.update(briefings).set({
      ...(dto.title      != null && { titulo:      dto.title }),
      ...(dto.status     != null && { status:      dto.status }),
      ...(dto.content    != null && { descricao:   dto.content }),
      ...(dto.campaignId != null && { campanha_id: dto.campaignId }),
      ...(dto.dueAt      != null && { prazo:       new Date(dto.dueAt) }),
      ...(dto.metadata   != null && { metadata:    dto.metadata }),
      updated_at: new Date(),
    }).where(and(eq(briefings.tenant_id, tenantId), eq(briefings.id, id), isNull(briefings.deleted_at)))
      .returning();
    return row;
  }

  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    await this.db.update(briefings).set({ deleted_at: new Date() })
      .where(and(eq(briefings.tenant_id, tenantId), eq(briefings.id, id)));
    return { deleted: true };
  }
}
