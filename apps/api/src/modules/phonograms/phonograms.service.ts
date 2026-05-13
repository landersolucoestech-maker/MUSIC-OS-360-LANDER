import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, ilike, isNull, desc, asc, count, SQL } from 'drizzle-orm';
import { DRIZZLE_DB, DrizzleDB }  from '../../database/database.module';
import { phonograms, Phonogram }  from '../../database/schema';
import { CreatePhonogramDto }      from './dto/create-phonogram.dto';
import { UpdatePhonogramDto }      from './dto/update-phonogram.dto';
import { QueryPhonogramDto }       from './dto/query-phonogram.dto';

@Injectable()
export class PhonogramsService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDB,
  ) {}

  async list(tenantId: string, query: QueryPhonogramDto) {
    const conditions: SQL[] = [
      eq(phonograms.tenant_id, tenantId),
      isNull(phonograms.deleted_at),
    ];

    if (query.status)   conditions.push(eq(phonograms.status,     query.status));
    if (query.artistId) conditions.push(eq(phonograms.artista_id, query.artistId));
    if (query.workId)   conditions.push(eq(phonograms.obra_id,    query.workId));
    if (query.isrc)     conditions.push(eq(phonograms.isrc,       query.isrc));
    if (query.search)   conditions.push(ilike(phonograms.titulo,  `%${query.search}%`) as SQL);

    const where    = and(...conditions);
    const orderCol = this.resolveOrder(query.orderBy ?? 'created_at');
    const orderDir = query.ascending ? asc(orderCol) : desc(orderCol);

    const [rows, [{ value: total }]] = await Promise.all([
      this.db.select().from(phonograms).where(where).orderBy(orderDir)
        .offset(query.offset ?? 0).limit(query.limit ?? 50),
      this.db.select({ value: count() }).from(phonograms).where(where),
    ]);

    return {
      data: rows,
      meta: { total: Number(total), offset: query.offset ?? 0, limit: query.limit ?? 50 },
    };
  }

  async findById(tenantId: string, id: string): Promise<Phonogram> {
    const [result] = await this.db
      .select()
      .from(phonograms)
      .where(and(eq(phonograms.tenant_id, tenantId), eq(phonograms.id, id), isNull(phonograms.deleted_at)))
      .limit(1);

    if (!result) throw new NotFoundException('Fonograma não encontrado');
    return result;
  }

  async create(tenantId: string, userId: string, dto: CreatePhonogramDto): Promise<Phonogram> {
    const [created] = await this.db
      .insert(phonograms)
      .values({
        tenant_id:    tenantId,
        obra_id:      dto.workId    ?? null,
        artista_id:   dto.artistId  ?? null,
        titulo:       dto.titulo,
        tipo:         dto.tipo      ?? 'gravacao',
        isrc:         dto.isrc      ?? null,
        duracao:      dto.duracao   ?? null,
        status:       dto.status    ?? 'pendente',
        compositores: dto.compositores ?? null,
        interpretes:  dto.interpretes  ?? null,
        produtores:   dto.produtores   ?? null,
        metadata:     dto.metadata ?? {},
        created_by:   userId,
        updated_by:   userId,
      })
      .returning();

    return created;
  }

  async update(tenantId: string, userId: string, id: string, dto: UpdatePhonogramDto): Promise<Phonogram> {
    await this.findById(tenantId, id);

    const [updated] = await this.db
      .update(phonograms)
      .set({
        ...(dto.titulo        != null && { titulo:        dto.titulo }),
        ...(dto.tipo          != null && { tipo:          dto.tipo }),
        ...(dto.workId        != null && { obra_id:       dto.workId }),
        ...(dto.artistId      != null && { artista_id:    dto.artistId }),
        ...(dto.isrc          != null && { isrc:          dto.isrc }),
        ...(dto.duracao       != null && { duracao:       dto.duracao }),
        ...(dto.status        != null && { status:        dto.status }),
        ...(dto.compositores  != null && { compositores:  dto.compositores }),
        ...(dto.interpretes   != null && { interpretes:   dto.interpretes }),
        ...(dto.produtores    != null && { produtores:    dto.produtores }),
        ...(dto.metadata      != null && { metadata:      dto.metadata }),
        updated_at: new Date(),
        updated_by: userId,
      })
      .where(and(eq(phonograms.tenant_id, tenantId), eq(phonograms.id, id), isNull(phonograms.deleted_at)))
      .returning();

    return updated;
  }

  async softDelete(tenantId: string, id: string): Promise<{ deleted: boolean }> {
    await this.findById(tenantId, id);

    await this.db
      .update(phonograms)
      .set({ deleted_at: new Date() })
      .where(and(eq(phonograms.tenant_id, tenantId), eq(phonograms.id, id)));

    return { deleted: true };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private resolveOrder(field: string): any {
    const map: Record<string, any> = {
      created_at: phonograms.created_at,
      updated_at: phonograms.updated_at,
      titulo:     phonograms.titulo,
    };
    return map[field] ?? phonograms.created_at;
  }
}
