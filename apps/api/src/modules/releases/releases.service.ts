import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, ilike, isNull, desc, asc, count, SQL } from 'drizzle-orm';
import { DRIZZLE_DB, DrizzleDB } from '../../database/database.module';
import { releases, Release }     from '../../database/schema';
import { CreateReleaseDto, UpdateReleaseDto, QueryReleaseDto } from './dto/releases.dto';

@Injectable()
export class ReleasesService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDB) {}

  async list(tenantId: string, q: QueryReleaseDto) {
    const conditions: SQL[] = [
      eq(releases.tenant_id, tenantId),
      isNull(releases.deleted_at),
    ];
    if (q.status)      conditions.push(eq(releases.status,        q.status));
    if (q.type)        conditions.push(eq(releases.tipo,          q.type));
    if (q.artistId)    conditions.push(eq(releases.artista_id,    q.artistId));
    if (q.distributor) conditions.push(eq(releases.distribuidora, q.distributor));
    if (q.search)      conditions.push(ilike(releases.titulo,     `%${q.search}%`) as SQL);

    const where = and(...conditions);
    const col   = q.ascending ? asc(releases.created_at) : desc(releases.created_at);

    const [rows, [{ value: total }]] = await Promise.all([
      this.db.select().from(releases).where(where).orderBy(col)
        .offset(q.offset ?? 0).limit(q.limit ?? 50),
      this.db.select({ value: count() }).from(releases).where(where),
    ]);
    return { data: rows, meta: { total: Number(total), offset: q.offset ?? 0, limit: q.limit ?? 50 } };
  }

  async findById(tenantId: string, id: string): Promise<Release> {
    const [row] = await this.db.select().from(releases)
      .where(and(eq(releases.tenant_id, tenantId), eq(releases.id, id), isNull(releases.deleted_at)))
      .limit(1);
    if (!row) throw new NotFoundException('Lançamento não encontrado');
    return row;
  }

  async create(tenantId: string, userId: string, dto: CreateReleaseDto): Promise<Release> {
    const [row] = await this.db.insert(releases).values({
      tenant_id:       tenantId,
      titulo:          dto.titulo,
      tipo:            dto.tipo,
      artista_id:      dto.artistId    ?? null,
      upc:             dto.upc         ?? null,
      distribuidora:   dto.distributor ?? null,
      data_lancamento: dto.dataLancamento ? new Date(dto.dataLancamento) : null,
      plataformas:     dto.plataformas ?? [],
      capa_url:        dto.capaUrl     ?? null,
      status:          dto.status      ?? 'planejamento',
      metadata:        dto.metadata    ?? {},
      created_by:      userId,
      updated_by:      userId,
    }).returning();
    return row;
  }

  async update(tenantId: string, userId: string, id: string, dto: UpdateReleaseDto): Promise<Release> {
    await this.findById(tenantId, id);
    const [row] = await this.db.update(releases).set({
      ...(dto.titulo          != null && { titulo:          dto.titulo }),
      ...(dto.tipo            != null && { tipo:            dto.tipo }),
      ...(dto.status          != null && { status:          dto.status }),
      ...(dto.artistId        != null && { artista_id:      dto.artistId }),
      ...(dto.upc             != null && { upc:             dto.upc }),
      ...(dto.distributor     != null && { distribuidora:   dto.distributor }),
      ...(dto.dataLancamento  != null && { data_lancamento: new Date(dto.dataLancamento) }),
      ...(dto.plataformas     != null && { plataformas:     dto.plataformas }),
      ...(dto.capaUrl         != null && { capa_url:        dto.capaUrl }),
      ...(dto.metadata        != null && { metadata:        dto.metadata }),
      updated_at: new Date(),
      updated_by: userId,
    }).where(and(eq(releases.tenant_id, tenantId), eq(releases.id, id), isNull(releases.deleted_at)))
      .returning();
    return row;
  }

  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    await this.db.update(releases).set({ deleted_at: new Date() })
      .where(and(eq(releases.tenant_id, tenantId), eq(releases.id, id)));
    return { deleted: true };
  }
}
