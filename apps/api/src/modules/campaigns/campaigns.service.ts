import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, ilike, desc, asc, count, SQL } from 'drizzle-orm';
import { DRIZZLE_DB, DrizzleDB } from '../../database/database.module';
import { campaigns, Campaign } from '../../database/schema';
import { CreateCampaignDto, UpdateCampaignDto, QueryCampaignDto } from './dto/campaigns.dto';

@Injectable()
export class CampaignsService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDB) {}

  async list(tenantId: string, q: QueryCampaignDto) {
    const conditions: SQL[] = [eq(campaigns.tenantId, tenantId)];
    if (q.status)   conditions.push(eq(campaigns.status, q.status));
    if (q.type)     conditions.push(eq(campaigns.type, q.type));
    if (q.artistId) conditions.push(eq(campaigns.artistId, q.artistId));
    if (q.search)   conditions.push(ilike(campaigns.title, `%${q.search}%`));
    const where = and(...conditions);
    const col   = q.ascending ? asc(campaigns.createdAt) : desc(campaigns.createdAt);
    const [rows, [{ value: total }]] = await Promise.all([
      this.db.select().from(campaigns).where(where).orderBy(col).offset(q.offset ?? 0).limit(q.limit ?? 50),
      this.db.select({ value: count() }).from(campaigns).where(where),
    ]);
    return { data: rows, meta: { total: Number(total), offset: q.offset ?? 0, limit: q.limit ?? 50 } };
  }

  async findById(tenantId: string, id: string): Promise<Campaign> {
    const [row] = await this.db.select().from(campaigns)
      .where(and(eq(campaigns.tenantId, tenantId), eq(campaigns.id, id))).limit(1);
    if (!row) throw new NotFoundException('Campanha não encontrada');
    return row;
  }

  async create(tenantId: string, dto: CreateCampaignDto): Promise<Campaign> {
    const [row] = await this.db.insert(campaigns).values({
      tenantId, title: dto.title, type: dto.type,
      artistId:  dto.artistId  ?? null,
      budget:    dto.budget    != null ? String(dto.budget) : null,
      currency:  dto.currency  ?? 'BRL',
      startsAt:  dto.startsAt  ?? null,
      endsAt:    dto.endsAt    ?? null,
      platforms: dto.platforms ?? [],
      metadata:  dto.metadata  ?? {},
    }).returning();
    return row;
  }

  async update(tenantId: string, id: string, dto: UpdateCampaignDto): Promise<Campaign> {
    await this.findById(tenantId, id);
    const [row] = await this.db.update(campaigns).set({
      ...(dto.title     != null && { title:     dto.title }),
      ...(dto.type      != null && { type:      dto.type }),
      ...(dto.status    != null && { status:    dto.status }),
      ...(dto.artistId  != null && { artistId:  dto.artistId }),
      ...(dto.budget    != null && { budget:    String(dto.budget) }),
      ...(dto.startsAt  != null && { startsAt:  dto.startsAt }),
      ...(dto.endsAt    != null && { endsAt:    dto.endsAt }),
      ...(dto.platforms != null && { platforms: dto.platforms }),
      ...(dto.metadata  != null && { metadata:  dto.metadata }),
      updatedAt: new Date(),
    }).where(and(eq(campaigns.tenantId, tenantId), eq(campaigns.id, id))).returning();
    return row;
  }

  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    await this.db.update(campaigns).set({ status: 'cancelled', updatedAt: new Date() })
      .where(and(eq(campaigns.tenantId, tenantId), eq(campaigns.id, id)));
    return { deleted: true };
  }
}
