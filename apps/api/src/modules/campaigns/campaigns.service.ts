import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, ilike, isNull, desc, asc, count, SQL } from 'drizzle-orm';
import { DRIZZLE_DB, DrizzleDB } from '../../database/database.module';
import { campaigns, Campaign }   from '../../database/schema';
import { CreateCampaignDto, UpdateCampaignDto, QueryCampaignDto } from './dto/campaigns.dto';

@Injectable()
export class CampaignsService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDB) {}

  async list(tenantId: string, q: QueryCampaignDto) {
    const conditions: SQL[] = [
      eq(campaigns.tenant_id, tenantId),
      isNull(campaigns.deleted_at),
    ];
    if (q.status)   conditions.push(eq(campaigns.status,     q.status));
    if (q.type)     conditions.push(eq(campaigns.tipo,       q.type));
    if (q.artistId) conditions.push(eq(campaigns.artista_id, q.artistId));
    if (q.search)   conditions.push(ilike(campaigns.nome,    `%${q.search}%`) as SQL);

    const where = and(...conditions);
    const col   = q.ascending ? asc(campaigns.created_at) : desc(campaigns.created_at);

    const [rows, [{ value: total }]] = await Promise.all([
      this.db.select().from(campaigns).where(where).orderBy(col)
        .offset(q.offset ?? 0).limit(q.limit ?? 50),
      this.db.select({ value: count() }).from(campaigns).where(where),
    ]);
    return { data: rows, meta: { total: Number(total), offset: q.offset ?? 0, limit: q.limit ?? 50 } };
  }

  async findById(tenantId: string, id: string): Promise<Campaign> {
    const [row] = await this.db.select().from(campaigns)
      .where(and(eq(campaigns.tenant_id, tenantId), eq(campaigns.id, id), isNull(campaigns.deleted_at)))
      .limit(1);
    if (!row) throw new NotFoundException('Campanha não encontrada');
    return row;
  }

  async create(tenantId: string, userId: string, dto: CreateCampaignDto): Promise<Campaign> {
    const [row] = await this.db.insert(campaigns).values({
      tenant_id:   tenantId,
      nome:        dto.title,
      tipo:        dto.type,
      artista_id:  dto.artistId  ?? null,
      orcamento:   dto.budget != null ? String(dto.budget) : null,
      objetivo:    null,
      data_inicio: dto.startsAt ? new Date(dto.startsAt) : null,
      data_fim:    dto.endsAt   ? new Date(dto.endsAt)   : null,
      metadata:    dto.metadata ?? {},
      created_by:  userId,
      updated_by:  userId,
    }).returning();
    return row;
  }

  async update(tenantId: string, userId: string, id: string, dto: UpdateCampaignDto): Promise<Campaign> {
    await this.findById(tenantId, id);
    const [row] = await this.db.update(campaigns).set({
      ...(dto.title    != null && { nome:        dto.title }),
      ...(dto.type     != null && { tipo:        dto.type }),
      ...(dto.status   != null && { status:      dto.status }),
      ...(dto.artistId != null && { artista_id:  dto.artistId }),
      ...(dto.budget   != null && { orcamento:   String(dto.budget) }),
      ...(dto.startsAt != null && { data_inicio: new Date(dto.startsAt) }),
      ...(dto.endsAt   != null && { data_fim:    new Date(dto.endsAt) }),
      ...(dto.metadata != null && { metadata:    dto.metadata }),
      updated_at: new Date(),
      updated_by: userId,
    }).where(and(eq(campaigns.tenant_id, tenantId), eq(campaigns.id, id), isNull(campaigns.deleted_at)))
      .returning();
    return row;
  }

  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    await this.db.update(campaigns).set({ deleted_at: new Date() })
      .where(and(eq(campaigns.tenant_id, tenantId), eq(campaigns.id, id)));
    return { deleted: true };
  }
}
