import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, ilike, desc, asc, count, SQL } from 'drizzle-orm';
import { DRIZZLE_DB, DrizzleDB } from '../../database/database.module';
import { supportTickets, SupportTicket } from '../../database/schema';
import { CreateSupportTicketDto, UpdateSupportTicketDto, QuerySupportTicketDto } from './dto/support-tickets.dto';

@Injectable()
export class SupportTicketsService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDB) {}

  async list(tenantId: string, q: QuerySupportTicketDto) {
    const conditions: SQL[] = [eq(supportTickets.tenantId, tenantId)];
    if (q.status)   conditions.push(eq(supportTickets.status,   q.status));
    if (q.priority) conditions.push(eq(supportTickets.priority, q.priority));
    if (q.category) conditions.push(eq(supportTickets.category, q.category));
    if (q.search)   conditions.push(ilike(supportTickets.title, `%${q.search}%`));
    const where = and(...conditions);
    const col   = q.ascending ? asc(supportTickets.createdAt) : desc(supportTickets.createdAt);
    const [rows, [{ value: total }]] = await Promise.all([
      this.db.select().from(supportTickets).where(where).orderBy(col).offset(q.offset ?? 0).limit(q.limit ?? 50),
      this.db.select({ value: count() }).from(supportTickets).where(where),
    ]);
    return { data: rows, meta: { total: Number(total), offset: q.offset ?? 0, limit: q.limit ?? 50 } };
  }

  async findById(tenantId: string, id: string): Promise<SupportTicket> {
    const [row] = await this.db.select().from(supportTickets)
      .where(and(eq(supportTickets.tenantId, tenantId), eq(supportTickets.id, id))).limit(1);
    if (!row) throw new NotFoundException('Ticket não encontrado');
    return row;
  }

  async create(tenantId: string, userId: string, dto: CreateSupportTicketDto): Promise<SupportTicket> {
    const [row] = await this.db.insert(supportTickets).values({
      tenantId,
      userId,
      title:       dto.title,
      description: dto.description ?? null,
      priority:    dto.priority,
      category:    dto.category    ?? null,
      metadata:    dto.metadata    ?? {},
    }).returning();
    return row;
  }

  async update(tenantId: string, id: string, dto: UpdateSupportTicketDto): Promise<SupportTicket> {
    await this.findById(tenantId, id);
    const [row] = await this.db.update(supportTickets).set({
      ...(dto.title       != null && { title:       dto.title }),
      ...(dto.description != null && { description: dto.description }),
      ...(dto.priority    != null && { priority:    dto.priority }),
      ...(dto.category    != null && { category:    dto.category }),
      ...(dto.status      != null && { status:      dto.status }),
      ...(dto.resolvedAt  != null && { resolvedAt:  dto.resolvedAt }),
      ...(dto.metadata    != null && { metadata:    dto.metadata }),
      updatedAt: new Date(),
    }).where(and(eq(supportTickets.tenantId, tenantId), eq(supportTickets.id, id))).returning();
    return row;
  }

  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    await this.db.update(supportTickets).set({ status: 'closed', updatedAt: new Date() })
      .where(and(eq(supportTickets.tenantId, tenantId), eq(supportTickets.id, id)));
    return { deleted: true };
  }
}
