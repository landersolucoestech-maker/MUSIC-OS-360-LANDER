/**
 * modules/works/works.service.ts
 *
 * WorksService — CRUD de obras musicais com Drizzle ORM + isolamento por tenant.
 */

import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, ilike, or, desc, asc, count, SQL } from 'drizzle-orm';
import { DRIZZLE_DB, DrizzleDB } from '../../database/database.module';
import { catalogWorks, CatalogWork } from '../../database/schema';
import { CreateWorkDto }             from './dto/create-work.dto';
import { UpdateWorkDto }             from './dto/update-work.dto';
import { QueryWorkDto }              from './dto/query-work.dto';

@Injectable()
export class WorksService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDB,
  ) {}

  async list(tenantId: string, query: QueryWorkDto) {
    const conditions: SQL[] = [eq(catalogWorks.tenantId, tenantId)];

    if (query.status) conditions.push(eq(catalogWorks.status, query.status));
    if (query.genre)  conditions.push(eq(catalogWorks.genre,  query.genre));
    if (query.year)   conditions.push(eq(catalogWorks.year,   query.year));
    if (query.search) {
      conditions.push(ilike(catalogWorks.title, `%${query.search}%`) as SQL);
    }

    const where   = and(...conditions);
    const orderCol = this.resolveOrder(query.orderBy ?? 'created_at');
    const orderDir = query.ascending ? asc(orderCol) : desc(orderCol);

    const [rows, [{ value: total }]] = await Promise.all([
      this.db
        .select()
        .from(catalogWorks)
        .where(where)
        .orderBy(orderDir)
        .offset(query.offset ?? 0)
        .limit(query.limit ?? 50),
      this.db
        .select({ value: count() })
        .from(catalogWorks)
        .where(where),
    ]);

    return {
      data: rows,
      meta: { total: Number(total), offset: query.offset ?? 0, limit: query.limit ?? 50 },
    };
  }

  async findById(tenantId: string, id: string): Promise<CatalogWork> {
    const [result] = await this.db
      .select()
      .from(catalogWorks)
      .where(and(eq(catalogWorks.tenantId, tenantId), eq(catalogWorks.id, id)))
      .limit(1);

    if (!result) throw new NotFoundException('Obra não encontrada');
    return result;
  }

  async create(tenantId: string, _userId: string, dto: CreateWorkDto): Promise<CatalogWork> {
    const [created] = await this.db
      .insert(catalogWorks)
      .values({
        tenantId,
        title:    dto.title,
        iswc:     dto.iswc     ?? null,
        genre:    dto.genre    ?? null,
        year:     dto.year     ?? null,
        status:   dto.status   ?? 'active',
        authors:  dto.authors  ?? [],
        shares:   dto.shares   ?? [],
        metadata: dto.metadata ?? {},
      })
      .returning();

    return created;
  }

  async update(tenantId: string, _userId: string, id: string, dto: UpdateWorkDto): Promise<CatalogWork> {
    await this.findById(tenantId, id);

    const [updated] = await this.db
      .update(catalogWorks)
      .set({
        ...(dto.title    != null && { title:    dto.title }),
        ...(dto.iswc     != null && { iswc:     dto.iswc }),
        ...(dto.genre    != null && { genre:    dto.genre }),
        ...(dto.year     != null && { year:     dto.year }),
        ...(dto.status   != null && { status:   dto.status }),
        ...(dto.authors  != null && { authors:  dto.authors }),
        ...(dto.shares   != null && { shares:   dto.shares }),
        ...(dto.metadata != null && { metadata: dto.metadata }),
        updatedAt: new Date(),
      })
      .where(and(eq(catalogWorks.tenantId, tenantId), eq(catalogWorks.id, id)))
      .returning();

    return updated;
  }

  async softDelete(tenantId: string, id: string): Promise<{ deleted: boolean }> {
    await this.findById(tenantId, id);

    await this.db
      .update(catalogWorks)
      .set({ status: 'deleted', updatedAt: new Date() })
      .where(and(eq(catalogWorks.tenantId, tenantId), eq(catalogWorks.id, id)));

    return { deleted: true };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private resolveOrder(field: string): any {
    const map: Record<string, any> = {
      created_at: catalogWorks.createdAt,
      updated_at: catalogWorks.updatedAt,
      title:      catalogWorks.title,
    };
    return map[field] ?? catalogWorks.createdAt;
  }
}
