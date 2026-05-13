import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, desc, asc, count, SQL } from 'drizzle-orm';
import { DRIZZLE_DB, DrizzleDB } from '../../database/database.module';
import { leadInteractions, LeadInteraction } from '../../database/schema';
import { CreateLeadInteractionDto, QueryLeadInteractionDto } from './dto/lead-interactions.dto';

@Injectable()
export class LeadInteractionsService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDB) {}

  async list(tenantId: string, q: QueryLeadInteractionDto) {
    const conditions: SQL[] = [eq(leadInteractions.tenantId, tenantId)];
    if (q.leadId) conditions.push(eq(leadInteractions.leadId, q.leadId));
    if (q.type)   conditions.push(eq(leadInteractions.type, q.type));
    const where = and(...conditions);
    const col   = q.ascending ? asc(leadInteractions.createdAt) : desc(leadInteractions.createdAt);
    const [rows, [{ value: total }]] = await Promise.all([
      this.db.select().from(leadInteractions).where(where).orderBy(col).offset(q.offset ?? 0).limit(q.limit ?? 50),
      this.db.select({ value: count() }).from(leadInteractions).where(where),
    ]);
    return { data: rows, meta: { total: Number(total), offset: q.offset ?? 0, limit: q.limit ?? 50 } };
  }

  async create(tenantId: string, userId: string, dto: CreateLeadInteractionDto): Promise<LeadInteraction> {
    const [row] = await this.db.insert(leadInteractions).values({
      tenantId, userId, leadId: dto.leadId, type: dto.type,
      notes: dto.notes ?? null, metadata: dto.metadata ?? {},
    }).returning();
    return row;
  }

  async remove(tenantId: string, id: string) {
    const [row] = await this.db.select().from(leadInteractions)
      .where(and(eq(leadInteractions.tenantId, tenantId), eq(leadInteractions.id, id))).limit(1);
    if (!row) throw new NotFoundException('Interacção não encontrada');
    await this.db.delete(leadInteractions)
      .where(and(eq(leadInteractions.tenantId, tenantId), eq(leadInteractions.id, id)));
    return { deleted: true };
  }
}
