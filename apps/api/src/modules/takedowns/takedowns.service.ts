import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, ilike, isNull, desc, asc, count, SQL } from 'drizzle-orm';
import { DRIZZLE_DB, DrizzleDB } from '../../database/database.module';
import { takedowns, Takedown }   from '../../database/schema';
import { CreateTakedownDto, UpdateTakedownDto, QueryTakedownDto } from './dto/takedowns.dto';

@Injectable()
export class TakedownsService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDB) {}

  async list(tenantId: string, q: QueryTakedownDto) {
    const conditions: SQL[] = [
      eq(takedowns.tenant_id, tenantId),
      isNull(takedowns.deleted_at),
    ];
    if (q.status)   conditions.push(eq(takedowns.status,     q.status));
    if (q.platform) conditions.push(eq(takedowns.plataforma, q.platform));
    if (q.trackId)  conditions.push(eq(takedowns.obra_id,    q.trackId));
    if (q.search)   conditions.push(ilike(takedowns.titulo,  `%${q.search}%`) as SQL);

    const where = and(...conditions);
    const col   = q.ascending ? asc(takedowns.created_at) : desc(takedowns.created_at);

    const [rows, [{ value: total }]] = await Promise.all([
      this.db.select().from(takedowns).where(where).orderBy(col)
        .offset(q.offset ?? 0).limit(q.limit ?? 50),
      this.db.select({ value: count() }).from(takedowns).where(where),
    ]);
    return { data: rows, meta: { total: Number(total), offset: q.offset ?? 0, limit: q.limit ?? 50 } };
  }

  async findById(tenantId: string, id: string): Promise<Takedown> {
    const [row] = await this.db.select().from(takedowns)
      .where(and(eq(takedowns.tenant_id, tenantId), eq(takedowns.id, id), isNull(takedowns.deleted_at)))
      .limit(1);
    if (!row) throw new NotFoundException('Takedown não encontrado');
    return row;
  }

  async create(tenantId: string, userId: string, dto: CreateTakedownDto): Promise<Takedown> {
    const [row] = await this.db.insert(takedowns).values({
      tenant_id:  tenantId,
      titulo:     dto.platform,
      plataforma: dto.platform,
      url:        null,
      obra_id:    dto.trackId ?? null,
      artista_id: null,
      motivo:     dto.reason   ?? null,
      status:     'pendente',
      metadata:   dto.metadata ?? {},
      created_by: userId,
    }).returning();
    return row;
  }

  async update(tenantId: string, id: string, dto: UpdateTakedownDto): Promise<Takedown> {
    await this.findById(tenantId, id);
    const [row] = await this.db.update(takedowns).set({
      ...(dto.platform   != null && { plataforma: dto.platform }),
      ...(dto.reason     != null && { motivo:     dto.reason }),
      ...(dto.status     != null && { status:     dto.status }),
      ...(dto.resolvedAt != null && { updated_at: new Date(dto.resolvedAt) }),
      ...(dto.metadata   != null && { metadata:   dto.metadata }),
      updated_at: new Date(),
    }).where(and(eq(takedowns.tenant_id, tenantId), eq(takedowns.id, id), isNull(takedowns.deleted_at)))
      .returning();
    return row;
  }

  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    await this.db.update(takedowns).set({ deleted_at: new Date() })
      .where(and(eq(takedowns.tenant_id, tenantId), eq(takedowns.id, id)));
    return { deleted: true };
  }
}
