import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, ilike, isNull, desc, asc, count, SQL } from 'drizzle-orm';
import { DRIZZLE_DB, DrizzleDB } from '../../database/database.module';
import { works, Work }       from '../../database/schema';
import { CreateWorkDto }     from './dto/create-work.dto';
import { UpdateWorkDto }     from './dto/update-work.dto';
import { QueryWorkDto }      from './dto/query-work.dto';

@Injectable()
export class WorksService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDB,
  ) {}

  async list(tenantId: string, query: QueryWorkDto) {
    const conditions: SQL[] = [
      eq(works.tenant_id, tenantId),
      isNull(works.deleted_at),
    ];

    if (query.status) conditions.push(eq(works.status,  query.status));
    if (query.genre)  conditions.push(eq(works.genero,  query.genre));
    if (query.search) {
      conditions.push(ilike(works.titulo, `%${query.search}%`) as SQL);
    }

    const where    = and(...conditions);
    const orderCol = this.resolveOrder(query.orderBy ?? 'created_at');
    const orderDir = query.ascending ? asc(orderCol) : desc(orderCol);

    const [rows, [{ value: total }]] = await Promise.all([
      this.db.select().from(works).where(where).orderBy(orderDir)
        .offset(query.offset ?? 0).limit(query.limit ?? 50),
      this.db.select({ value: count() }).from(works).where(where),
    ]);

    return {
      data: rows,
      meta: { total: Number(total), offset: query.offset ?? 0, limit: query.limit ?? 50 },
    };
  }

  async findById(tenantId: string, id: string): Promise<Work> {
    const [result] = await this.db
      .select()
      .from(works)
      .where(and(eq(works.tenant_id, tenantId), eq(works.id, id), isNull(works.deleted_at)))
      .limit(1);

    if (!result) throw new NotFoundException('Obra não encontrada');
    return result;
  }

  async create(tenantId: string, userId: string, dto: CreateWorkDto): Promise<Work> {
    const [created] = await this.db
      .insert(works)
      .values({
        tenant_id:    tenantId,
        titulo:       dto.titulo,
        tipo:         dto.tipo          ?? 'composicao',
        iswc:         dto.iswc          ?? null,
        isrc:         dto.isrc          ?? null,
        genero:       dto.genero        ?? null,
        status:       dto.status        ?? 'pendente',
        compositor:   dto.compositor    ?? null,
        compositores: dto.compositores  ?? null,
        editora:      dto.editora       ?? null,
        metadata:     dto.metadata      ?? {},
        created_by:   userId,
        updated_by:   userId,
      })
      .returning();

    return created;
  }

  async update(tenantId: string, userId: string, id: string, dto: UpdateWorkDto): Promise<Work> {
    await this.findById(tenantId, id);

    const [updated] = await this.db
      .update(works)
      .set({
        ...(dto.titulo       != null && { titulo:       dto.titulo }),
        ...(dto.tipo         != null && { tipo:         dto.tipo }),
        ...(dto.iswc         != null && { iswc:         dto.iswc }),
        ...(dto.isrc         != null && { isrc:         dto.isrc }),
        ...(dto.genero       != null && { genero:       dto.genero }),
        ...(dto.status       != null && { status:       dto.status }),
        ...(dto.compositor   != null && { compositor:   dto.compositor }),
        ...(dto.compositores != null && { compositores: dto.compositores }),
        ...(dto.editora      != null && { editora:      dto.editora }),
        ...(dto.metadata     != null && { metadata:     dto.metadata }),
        updated_at: new Date(),
        updated_by: userId,
      })
      .where(and(eq(works.tenant_id, tenantId), eq(works.id, id), isNull(works.deleted_at)))
      .returning();

    return updated;
  }

  async softDelete(tenantId: string, id: string): Promise<{ deleted: boolean }> {
    await this.findById(tenantId, id);

    await this.db
      .update(works)
      .set({ deleted_at: new Date() })
      .where(and(eq(works.tenant_id, tenantId), eq(works.id, id)));

    return { deleted: true };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private resolveOrder(field: string): any {
    const map: Record<string, any> = {
      created_at: works.created_at,
      updated_at: works.updated_at,
      titulo:     works.titulo,
    };
    return map[field] ?? works.created_at;
  }
}
