import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, ilike, desc, asc, count, SQL } from 'drizzle-orm';
import { DRIZZLE_DB, DrizzleDB } from '../../database/database.module';
import { events, Event } from '../../database/schema';
import { CreateEventDto, UpdateEventDto, QueryEventDto } from './dto/events.dto';

@Injectable()
export class EventsService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDB) {}

  async list(tenantId: string, q: QueryEventDto) {
    const conditions: SQL[] = [eq(events.tenantId, tenantId)];
    if (q.status)   conditions.push(eq(events.status, q.status));
    if (q.type)     conditions.push(eq(events.type, q.type));
    if (q.artistId) conditions.push(eq(events.artistId, q.artistId));
    if (q.search)   conditions.push(ilike(events.title, `%${q.search}%`));
    const where = and(...conditions);
    const col   = q.ascending ? asc(events.startsAt) : desc(events.startsAt);
    const [rows, [{ value: total }]] = await Promise.all([
      this.db.select().from(events).where(where).orderBy(col).offset(q.offset ?? 0).limit(q.limit ?? 50),
      this.db.select({ value: count() }).from(events).where(where),
    ]);
    return { data: rows, meta: { total: Number(total), offset: q.offset ?? 0, limit: q.limit ?? 50 } };
  }

  async findById(tenantId: string, id: string): Promise<Event> {
    const [row] = await this.db.select().from(events)
      .where(and(eq(events.tenantId, tenantId), eq(events.id, id))).limit(1);
    if (!row) throw new NotFoundException('Evento não encontrado');
    return row;
  }

  async create(tenantId: string, dto: CreateEventDto): Promise<Event> {
    const [row] = await this.db.insert(events).values({
      tenantId, title: dto.title, type: dto.type,
      artistId:  dto.artistId  ?? null,
      venue:     dto.venue     ?? null,
      city:      dto.city      ?? null,
      country:   dto.country   ?? 'BR',
      startsAt:  dto.startsAt  ?? null,
      endsAt:    dto.endsAt    ?? null,
      capacity:  dto.capacity  ?? null,
      ticketUrl: dto.ticketUrl ?? null,
      metadata:  dto.metadata  ?? {},
    }).returning();
    return row;
  }

  async update(tenantId: string, id: string, dto: UpdateEventDto): Promise<Event> {
    await this.findById(tenantId, id);
    const [row] = await this.db.update(events).set({
      ...(dto.title     != null && { title:     dto.title }),
      ...(dto.type      != null && { type:      dto.type }),
      ...(dto.status    != null && { status:    dto.status }),
      ...(dto.artistId  != null && { artistId:  dto.artistId }),
      ...(dto.venue     != null && { venue:     dto.venue }),
      ...(dto.city      != null && { city:      dto.city }),
      ...(dto.country   != null && { country:   dto.country }),
      ...(dto.startsAt  != null && { startsAt:  dto.startsAt }),
      ...(dto.endsAt    != null && { endsAt:    dto.endsAt }),
      ...(dto.capacity  != null && { capacity:  dto.capacity }),
      ...(dto.ticketUrl != null && { ticketUrl: dto.ticketUrl }),
      ...(dto.metadata  != null && { metadata:  dto.metadata }),
      updatedAt: new Date(),
    }).where(and(eq(events.tenantId, tenantId), eq(events.id, id))).returning();
    return row;
  }

  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    await this.db.update(events).set({ status: 'cancelled', updatedAt: new Date() })
      .where(and(eq(events.tenantId, tenantId), eq(events.id, id)));
    return { deleted: true };
  }
}
