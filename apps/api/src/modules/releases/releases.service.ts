import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, ilike, desc, asc, count, SQL } from 'drizzle-orm';
import { DRIZZLE_DB, DrizzleDB } from '../../database/database.module';
import { releases, Release } from '../../database/schema';
import { CreateReleaseDto, UpdateReleaseDto, QueryReleaseDto } from './dto/releases.dto';

@Injectable()
export class ReleasesService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDB) {}

  async list(tenantId: string, q: QueryReleaseDto) {
    const conditions: SQL[] = [eq(releases.tenantId, tenantId)];
    if (q.status)      conditions.push(eq(releases.status,      q.status));
    if (q.type)        conditions.push(eq(releases.type,        q.type));
    if (q.artistId)    conditions.push(eq(releases.artistId,    q.artistId));
    if (q.distributor) conditions.push(eq(releases.distributor, q.distributor));
    if (q.search)      conditions.push(ilike(releases.title, `%${q.search}%`));
    const where = and(...conditions);
    const col   = q.ascending ? asc(releases.createdAt) : desc(releases.createdAt);
    const [rows, [{ value: total }]] = await Promise.all([
      this.db.select().from(releases).where(where).orderBy(col).offset(q.offset ?? 0).limit(q.limit ?? 50),
      this.db.select({ value: count() }).from(releases).where(where),
    ]);
    return { data: rows, meta: { total: Number(total), offset: q.offset ?? 0, limit: q.limit ?? 50 } };
  }

  async findById(tenantId: string, id: string): Promise<Release> {
    const [row] = await this.db.select().from(releases)
      .where(and(eq(releases.tenantId, tenantId), eq(releases.id, id))).limit(1);
    if (!row) throw new NotFoundException('Lançamento não encontrado');
    return row;
  }

  async create(tenantId: string, dto: CreateReleaseDto): Promise<Release> {
    const [row] = await this.db.insert(releases).values({
      tenantId,
      title:       dto.title,
      type:        dto.type,
      artistId:    dto.artistId    ?? null,
      upc:         dto.upc         ?? null,
      distributor: dto.distributor ?? null,
      releasedAt:  dto.releasedAt  ?? null,
      platforms:   dto.platforms   ?? [],
      coverUrl:    dto.coverUrl    ?? null,
      metadata:    dto.metadata    ?? {},
    }).returning();
    return row;
  }

  async update(tenantId: string, id: string, dto: UpdateReleaseDto): Promise<Release> {
    await this.findById(tenantId, id);
    const [row] = await this.db.update(releases).set({
      ...(dto.title       != null && { title:       dto.title }),
      ...(dto.type        != null && { type:        dto.type }),
      ...(dto.status      != null && { status:      dto.status }),
      ...(dto.artistId    != null && { artistId:    dto.artistId }),
      ...(dto.upc         != null && { upc:         dto.upc }),
      ...(dto.distributor != null && { distributor: dto.distributor }),
      ...(dto.releasedAt  != null && { releasedAt:  dto.releasedAt }),
      ...(dto.platforms   != null && { platforms:   dto.platforms }),
      ...(dto.coverUrl    != null && { coverUrl:    dto.coverUrl }),
      ...(dto.metadata    != null && { metadata:    dto.metadata }),
      updatedAt: new Date(),
    }).where(and(eq(releases.tenantId, tenantId), eq(releases.id, id))).returning();
    return row;
  }

  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    await this.db.update(releases).set({ status: 'archived', updatedAt: new Date() })
      .where(and(eq(releases.tenantId, tenantId), eq(releases.id, id)));
    return { deleted: true };
  }
}
