/**
 * modules/phonograms/phonograms.service.ts
 *
 * PhonogramsService — CRUD de fonogramas com Drizzle ORM + isolamento por tenant.
 */

import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, ilike, desc, asc, count, SQL } from 'drizzle-orm';
import { DRIZZLE_DB, DrizzleDB }  from '../../database/database.module';
import { catalogTracks, CatalogTrack } from '../../database/schema';
import { CreatePhonogramDto }           from './dto/create-phonogram.dto';
import { UpdatePhonogramDto }           from './dto/update-phonogram.dto';
import { QueryPhonogramDto }            from './dto/query-phonogram.dto';

@Injectable()
export class PhonogramsService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDB,
  ) {}

  async list(tenantId: string, query: QueryPhonogramDto) {
    const conditions: SQL[] = [eq(catalogTracks.tenantId, tenantId)];

    if (query.status)   conditions.push(eq(catalogTracks.status,   query.status));
    if (query.artistId) conditions.push(eq(catalogTracks.artistId, query.artistId));
    if (query.workId)   conditions.push(eq(catalogTracks.workId,   query.workId));
    if (query.isrc)     conditions.push(eq(catalogTracks.isrc,     query.isrc));
    if (query.search)   conditions.push(ilike(catalogTracks.title, `%${query.search}%`) as SQL);

    const where    = and(...conditions);
    const orderCol = this.resolveOrder(query.orderBy ?? 'created_at');
    const orderDir = query.ascending ? asc(orderCol) : desc(orderCol);

    const [rows, [{ value: total }]] = await Promise.all([
      this.db
        .select()
        .from(catalogTracks)
        .where(where)
        .orderBy(orderDir)
        .offset(query.offset ?? 0)
        .limit(query.limit ?? 50),
      this.db
        .select({ value: count() })
        .from(catalogTracks)
        .where(where),
    ]);

    return {
      data: rows,
      meta: { total: Number(total), offset: query.offset ?? 0, limit: query.limit ?? 50 },
    };
  }

  async findById(tenantId: string, id: string): Promise<CatalogTrack> {
    const [result] = await this.db
      .select()
      .from(catalogTracks)
      .where(and(eq(catalogTracks.tenantId, tenantId), eq(catalogTracks.id, id)))
      .limit(1);

    if (!result) throw new NotFoundException('Fonograma não encontrado');
    return result;
  }

  async create(tenantId: string, _userId: string, dto: CreatePhonogramDto): Promise<CatalogTrack> {
    const [created] = await this.db
      .insert(catalogTracks)
      .values({
        tenantId,
        workId:   dto.workId   ?? null,
        artistId: dto.artistId ?? null,
        title:    dto.title,
        isrc:     dto.isrc     ?? null,
        duration: dto.duration ?? null,
        fileUrl:  dto.fileUrl  ?? null,
        status:   dto.status   ?? 'active',
        metadata: dto.metadata ?? {},
      })
      .returning();

    return created;
  }

  async update(tenantId: string, _userId: string, id: string, dto: UpdatePhonogramDto): Promise<CatalogTrack> {
    await this.findById(tenantId, id);

    const [updated] = await this.db
      .update(catalogTracks)
      .set({
        ...(dto.title    != null && { title:    dto.title }),
        ...(dto.workId   != null && { workId:   dto.workId }),
        ...(dto.artistId != null && { artistId: dto.artistId }),
        ...(dto.isrc     != null && { isrc:     dto.isrc }),
        ...(dto.duration != null && { duration: dto.duration }),
        ...(dto.fileUrl  != null && { fileUrl:  dto.fileUrl }),
        ...(dto.status   != null && { status:   dto.status }),
        ...(dto.metadata != null && { metadata: dto.metadata }),
        updatedAt: new Date(),
      })
      .where(and(eq(catalogTracks.tenantId, tenantId), eq(catalogTracks.id, id)))
      .returning();

    return updated;
  }

  async softDelete(tenantId: string, id: string): Promise<{ deleted: boolean }> {
    await this.findById(tenantId, id);

    await this.db
      .update(catalogTracks)
      .set({ status: 'deleted', updatedAt: new Date() })
      .where(and(eq(catalogTracks.tenantId, tenantId), eq(catalogTracks.id, id)));

    return { deleted: true };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private resolveOrder(field: string): any {
    const map: Record<string, any> = {
      created_at: catalogTracks.createdAt,
      updated_at: catalogTracks.updatedAt,
      title:      catalogTracks.title,
    };
    return map[field] ?? catalogTracks.createdAt;
  }
}
