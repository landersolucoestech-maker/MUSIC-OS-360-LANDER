import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, ilike, isNull, desc, asc, count, SQL } from 'drizzle-orm';
import { DRIZZLE_DB, DrizzleDB } from '../../database/database.module';
import { events, Event }         from '../../database/schema';
import { CreateEventDto, UpdateEventDto, QueryEventDto } from './dto/events.dto';

@Injectable()
export class EventsService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDB) {}

  async list(tenantId: string, q: QueryEventDto) {
    const conditions: SQL[] = [
      eq(events.tenant_id, tenantId),
      isNull(events.deleted_at),
    ];
    if (q.status)   conditions.push(eq(events.status,     q.status));
    if (q.type)     conditions.push(eq(events.tipo,       q.type));
    if (q.artistId) conditions.push(eq(events.artista_id, q.artistId));
    if (q.search)   conditions.push(ilike(events.titulo,  `%${q.search}%`) as SQL);

    const where = and(...conditions);
    const col   = q.ascending ? asc(events.data) : desc(events.data);

    const [rows, [{ value: total }]] = await Promise.all([
      this.db.select().from(events).where(where).orderBy(col)
        .offset(q.offset ?? 0).limit(q.limit ?? 50),
      this.db.select({ value: count() }).from(events).where(where),
    ]);
    return { data: rows, meta: { total: Number(total), offset: q.offset ?? 0, limit: q.limit ?? 50 } };
  }

  async findById(tenantId: string, id: string): Promise<Event> {
    const [row] = await this.db.select().from(events)
      .where(and(eq(events.tenant_id, tenantId), eq(events.id, id), isNull(events.deleted_at)))
      .limit(1);
    if (!row) throw new NotFoundException('Evento não encontrado');
    return row;
  }

  async create(tenantId: string, userId: string, dto: CreateEventDto): Promise<Event> {
    const [row] = await this.db.insert(events).values({
      tenant_id:   tenantId,
      titulo:      dto.title,
      tipo:        dto.type,
      artista_id:  dto.artistId ?? null,
      local:       dto.venue    ?? null,
      data:        dto.startsAt ? new Date(dto.startsAt) : new Date(),
      valor:       null,
      observacoes: null,
      status:      'agendado',
      metadata:    dto.metadata ?? {},
      created_by:  userId,
      updated_by:  userId,
    }).returning();
    return row;
  }

  async update(tenantId: string, userId: string, id: string, dto: UpdateEventDto): Promise<Event> {
    await this.findById(tenantId, id);
    const [row] = await this.db.update(events).set({
      ...(dto.title    != null && { titulo:     dto.title }),
      ...(dto.type     != null && { tipo:       dto.type }),
      ...(dto.status   != null && { status:     dto.status }),
      ...(dto.artistId != null && { artista_id: dto.artistId }),
      ...(dto.venue    != null && { local:      dto.venue }),
      ...(dto.startsAt != null && { data:       new Date(dto.startsAt) }),
      ...(dto.metadata != null && { metadata:   dto.metadata }),
      updated_at: new Date(),
      updated_by: userId,
    }).where(and(eq(events.tenant_id, tenantId), eq(events.id, id), isNull(events.deleted_at)))
      .returning();
    return row;
  }

  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    await this.db.update(events).set({ deleted_at: new Date() })
      .where(and(eq(events.tenant_id, tenantId), eq(events.id, id)));
    return { deleted: true };
  }
}
