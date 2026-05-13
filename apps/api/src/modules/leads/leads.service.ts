import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, ilike, isNull, desc, asc, count, SQL } from 'drizzle-orm';
import { DRIZZLE_DB, DrizzleDB } from '../../database/database.module';
import { leads, Lead }           from '../../database/schema';
import { CreateLeadDto, UpdateLeadDto, QueryLeadDto } from './dto/leads.dto';

@Injectable()
export class LeadsService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDB) {}

  async list(tenantId: string, q: QueryLeadDto) {
    const conditions: SQL[] = [
      eq(leads.tenant_id, tenantId),
      isNull(leads.deleted_at),
    ];
    if (q.status) conditions.push(eq(leads.status, q.status));
    if (q.stage)  conditions.push(eq(leads.pipeline_stage, q.stage));
    if (q.search) conditions.push(ilike(leads.nome, `%${q.search}%`) as SQL);

    const where = and(...conditions);
    const col   = q.ascending ? asc(leads.created_at) : desc(leads.created_at);

    const [rows, [{ value: total }]] = await Promise.all([
      this.db.select().from(leads).where(where).orderBy(col)
        .offset(q.offset ?? 0).limit(q.limit ?? 50),
      this.db.select({ value: count() }).from(leads).where(where),
    ]);
    return { data: rows, meta: { total: Number(total), offset: q.offset ?? 0, limit: q.limit ?? 50 } };
  }

  async findById(tenantId: string, id: string): Promise<Lead> {
    const [row] = await this.db.select().from(leads)
      .where(and(eq(leads.tenant_id, tenantId), eq(leads.id, id), isNull(leads.deleted_at)))
      .limit(1);
    if (!row) throw new NotFoundException('Lead não encontrado');
    return row;
  }

  async create(tenantId: string, userId: string, dto: CreateLeadDto): Promise<Lead> {
    const [row] = await this.db.insert(leads).values({
      tenant_id:          tenantId,
      nome:               dto.nome,
      email_encrypted:    dto.email    ?? null,
      telefone_encrypted: dto.telefone ?? null,
      empresa:            dto.empresa  ?? null,
      fonte:              dto.fonte    ?? null,
      pipeline_stage:     dto.stage    ?? 'prospecto',
      score:              dto.score    ?? 0,
      status:             dto.status   ?? 'novo',
      metadata:           dto.metadata ?? {},
      created_by:         userId,
      updated_by:         userId,
    }).returning();
    return row;
  }

  async update(tenantId: string, userId: string, id: string, dto: UpdateLeadDto): Promise<Lead> {
    await this.findById(tenantId, id);
    const [row] = await this.db.update(leads).set({
      ...(dto.nome     != null && { nome:               dto.nome }),
      ...(dto.email    != null && { email_encrypted:    dto.email }),
      ...(dto.telefone != null && { telefone_encrypted: dto.telefone }),
      ...(dto.empresa  != null && { empresa:            dto.empresa }),
      ...(dto.fonte    != null && { fonte:              dto.fonte }),
      ...(dto.status   != null && { status:             dto.status }),
      ...(dto.stage    != null && { pipeline_stage:     dto.stage }),
      ...(dto.score    != null && { score:              dto.score }),
      ...(dto.metadata != null && { metadata:           dto.metadata }),
      updated_at: new Date(),
      updated_by: userId,
    }).where(and(eq(leads.tenant_id, tenantId), eq(leads.id, id), isNull(leads.deleted_at)))
      .returning();
    return row;
  }

  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    await this.db.update(leads).set({ deleted_at: new Date() })
      .where(and(eq(leads.tenant_id, tenantId), eq(leads.id, id)));
    return { deleted: true };
  }
}
