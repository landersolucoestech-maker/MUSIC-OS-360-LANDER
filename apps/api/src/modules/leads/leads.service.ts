import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, ilike, or, desc, asc, count, SQL } from 'drizzle-orm';
import { DRIZZLE_DB, DrizzleDB } from '../../database/database.module';
import { leads, Lead } from '../../database/schema';
import { CreateLeadDto, UpdateLeadDto, QueryLeadDto } from './dto/leads.dto';

@Injectable()
export class LeadsService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDB) {}

  async list(tenantId: string, q: QueryLeadDto) {
    const conditions: SQL[] = [eq(leads.tenantId, tenantId)];
    if (q.status)     conditions.push(eq(leads.status, q.status));
    if (q.stage)      conditions.push(eq(leads.stage, q.stage));
    if (q.assignedTo) conditions.push(eq(leads.assignedTo, q.assignedTo));
    if (q.search)     conditions.push(or(ilike(leads.name, `%${q.search}%`), ilike(leads.email, `%${q.search}%`)) as SQL);
    const where = and(...conditions);
    const col   = q.ascending ? asc(leads.createdAt) : desc(leads.createdAt);
    const [rows, [{ value: total }]] = await Promise.all([
      this.db.select().from(leads).where(where).orderBy(col).offset(q.offset ?? 0).limit(q.limit ?? 50),
      this.db.select({ value: count() }).from(leads).where(where),
    ]);
    return { data: rows, meta: { total: Number(total), offset: q.offset ?? 0, limit: q.limit ?? 50 } };
  }

  async findById(tenantId: string, id: string): Promise<Lead> {
    const [row] = await this.db.select().from(leads)
      .where(and(eq(leads.tenantId, tenantId), eq(leads.id, id))).limit(1);
    if (!row) throw new NotFoundException('Lead não encontrado');
    return row;
  }

  async create(tenantId: string, dto: CreateLeadDto): Promise<Lead> {
    const [row] = await this.db.insert(leads).values({
      tenantId, name: dto.name,
      email:      dto.email      ?? null,
      phone:      dto.phone      ?? null,
      source:     dto.source     ?? null,
      stage:      dto.stage      ?? 'prospect',
      value:      dto.value      != null ? String(dto.value) : null,
      assignedTo: dto.assignedTo ?? null,
      notes:      dto.notes      ?? null,
      metadata:   dto.metadata   ?? {},
    }).returning();
    return row;
  }

  async update(tenantId: string, id: string, dto: UpdateLeadDto): Promise<Lead> {
    await this.findById(tenantId, id);
    const [row] = await this.db.update(leads).set({
      ...(dto.name       != null && { name:       dto.name }),
      ...(dto.email      != null && { email:      dto.email }),
      ...(dto.phone      != null && { phone:      dto.phone }),
      ...(dto.source     != null && { source:     dto.source }),
      ...(dto.status     != null && { status:     dto.status }),
      ...(dto.stage      != null && { stage:      dto.stage }),
      ...(dto.value      != null && { value:      String(dto.value) }),
      ...(dto.assignedTo != null && { assignedTo: dto.assignedTo }),
      ...(dto.notes      != null && { notes:      dto.notes }),
      ...(dto.metadata   != null && { metadata:   dto.metadata }),
      updatedAt: new Date(),
    }).where(and(eq(leads.tenantId, tenantId), eq(leads.id, id))).returning();
    return row;
  }

  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    await this.db.update(leads).set({ status: 'closed', updatedAt: new Date() })
      .where(and(eq(leads.tenantId, tenantId), eq(leads.id, id)));
    return { deleted: true };
  }
}
