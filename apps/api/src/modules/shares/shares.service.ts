import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, isNull, desc, asc, count, SQL } from 'drizzle-orm';
import { DRIZZLE_DB, DrizzleDB } from '../../database/database.module';
import { shares, Share }         from '../../database/schema';
import { CreateShareDto, UpdateShareDto, QueryShareDto } from './dto/shares.dto';

@Injectable()
export class SharesService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDB) {}

  async list(tenantId: string, q: QueryShareDto) {
    const conditions: SQL[] = [
      eq(shares.tenant_id, tenantId),
      isNull(shares.deleted_at),
    ];
    if (q.workId)  conditions.push(eq(shares.obra_id,      q.workId));
    if (q.trackId) conditions.push(eq(shares.fonograma_id, q.trackId));
    if (q.role)    conditions.push(eq(shares.papel,        q.role));

    const where = and(...conditions);
    const col   = q.ascending ? asc(shares.created_at) : desc(shares.created_at);

    const [rows, [{ value: total }]] = await Promise.all([
      this.db.select().from(shares).where(where).orderBy(col)
        .offset(q.offset ?? 0).limit(q.limit ?? 50),
      this.db.select({ value: count() }).from(shares).where(where),
    ]);
    return { data: rows, meta: { total: Number(total), offset: q.offset ?? 0, limit: q.limit ?? 50 } };
  }

  async findById(tenantId: string, id: string): Promise<Share> {
    const [row] = await this.db.select().from(shares)
      .where(and(eq(shares.tenant_id, tenantId), eq(shares.id, id), isNull(shares.deleted_at)))
      .limit(1);
    if (!row) throw new NotFoundException('Share não encontrado');
    return row;
  }

  async create(tenantId: string, dto: CreateShareDto): Promise<Share> {
    const [row] = await this.db.insert(shares).values({
      tenant_id:    tenantId,
      titular_nome: dto.holderName,
      papel:        dto.role,
      percentual:   String(dto.percentage),
      obra_id:      dto.workId    ?? null,
      fonograma_id: dto.trackId   ?? null,
      titular_doc:  dto.holderDoc ?? null,
      status:       'ativo',
      metadata:     dto.metadata  ?? {},
    }).returning();
    return row;
  }

  async update(tenantId: string, id: string, dto: UpdateShareDto): Promise<Share> {
    await this.findById(tenantId, id);
    const [row] = await this.db.update(shares).set({
      ...(dto.holderName != null && { titular_nome: dto.holderName }),
      ...(dto.holderDoc  != null && { titular_doc:  dto.holderDoc }),
      ...(dto.role       != null && { papel:        dto.role }),
      ...(dto.percentage != null && { percentual:   String(dto.percentage) }),
      ...(dto.status     != null && { status:       dto.status }),
      ...(dto.workId     != null && { obra_id:      dto.workId }),
      ...(dto.trackId    != null && { fonograma_id: dto.trackId }),
      ...(dto.metadata   != null && { metadata:     dto.metadata }),
      updated_at: new Date(),
    }).where(and(eq(shares.tenant_id, tenantId), eq(shares.id, id), isNull(shares.deleted_at)))
      .returning();
    return row;
  }

  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    await this.db.update(shares).set({ deleted_at: new Date() })
      .where(and(eq(shares.tenant_id, tenantId), eq(shares.id, id)));
    return { deleted: true };
  }
}
