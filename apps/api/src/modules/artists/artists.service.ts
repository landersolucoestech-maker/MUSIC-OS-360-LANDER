/**
 * modules/artists/artists.service.ts
 *
 * ArtistsService — CRUD com Drizzle ORM + isolamento por tenant.
 */

import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, ilike, or, isNull, desc, asc, count, SQL } from 'drizzle-orm';
import { DRIZZLE_DB, DrizzleDB } from '../../database/database.module';
import { artists, Artist }        from '../../database/schema';
import { CreateArtistDto }         from './dto/create-artist.dto';
import { UpdateArtistDto }         from './dto/update-artist.dto';
import { QueryArtistDto }          from './dto/query-artist.dto';

@Injectable()
export class ArtistsService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDB,
  ) {}

  async list(tenantId: string, query: QueryArtistDto) {
    const conditions: SQL[] = [
      eq(artists.tenantId, tenantId),
      isNull(artists.updatedAt), // placeholder — Drizzle soft-delete via status
    ];

    // Override: use status filter
    conditions.pop();
    if (query.status) {
      conditions.push(eq(artists.status, query.status));
    }

    if (query.genre) {
      conditions.push(eq(artists.genre, query.genre));
    }

    if (query.search) {
      conditions.push(
        or(
          ilike(artists.name,      `%${query.search}%`),
          ilike(artists.stageName, `%${query.search}%`),
        ) as SQL,
      );
    }

    const where = and(...conditions);

    const orderCol = this.resolveOrder(query.orderBy ?? 'created_at');
    const orderDir = query.ascending ? asc(orderCol) : desc(orderCol);

    const [rows, [{ value: total }]] = await Promise.all([
      this.db
        .select()
        .from(artists)
        .where(where)
        .orderBy(orderDir)
        .offset(query.offset ?? 0)
        .limit(query.limit ?? 50),
      this.db
        .select({ value: count() })
        .from(artists)
        .where(where),
    ]);

    return {
      data: rows,
      meta: { total: Number(total), offset: query.offset ?? 0, limit: query.limit ?? 50 },
    };
  }

  async findById(tenantId: string, id: string): Promise<Artist> {
    const [result] = await this.db
      .select()
      .from(artists)
      .where(and(eq(artists.tenantId, tenantId), eq(artists.id, id)))
      .limit(1);

    if (!result) throw new NotFoundException('Artista não encontrado');
    return result;
  }

  async create(tenantId: string, _userId: string, dto: CreateArtistDto): Promise<Artist> {
    const [created] = await this.db
      .insert(artists)
      .values({
        tenantId,
        name:        dto.name,
        stageName:   dto.stageName ?? null,
        genre:       dto.genre     ?? null,
        status:      dto.status    ?? 'active',
        bio:         dto.bio       ?? null,
        avatarUrl:   dto.avatarUrl ?? null,
        socialLinks: dto.socialLinks ?? {},
        metadata:    dto.metadata    ?? {},
      })
      .returning();

    return created;
  }

  async update(tenantId: string, _userId: string, id: string, dto: UpdateArtistDto): Promise<Artist> {
    const existing = await this.findById(tenantId, id);
    if (!existing) throw new NotFoundException('Artista não encontrado');

    const [updated] = await this.db
      .update(artists)
      .set({
        ...(dto.name        != null && { name:        dto.name }),
        ...(dto.stageName   != null && { stageName:   dto.stageName }),
        ...(dto.genre       != null && { genre:       dto.genre }),
        ...(dto.status      != null && { status:      dto.status }),
        ...(dto.bio         != null && { bio:         dto.bio }),
        ...(dto.avatarUrl   != null && { avatarUrl:   dto.avatarUrl }),
        ...(dto.socialLinks != null && { socialLinks: dto.socialLinks }),
        ...(dto.metadata    != null && { metadata:    dto.metadata }),
        updatedAt: new Date(),
      })
      .where(and(eq(artists.tenantId, tenantId), eq(artists.id, id)))
      .returning();

    return updated;
  }

  async softDelete(tenantId: string, id: string): Promise<{ deleted: boolean }> {
    await this.findById(tenantId, id);

    await this.db
      .update(artists)
      .set({ status: 'deleted', updatedAt: new Date() })
      .where(and(eq(artists.tenantId, tenantId), eq(artists.id, id)));

    return { deleted: true };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private resolveOrder(field: string): any {
    const map: Record<string, any> = {
      created_at: artists.createdAt,
      updated_at: artists.updatedAt,
      name:       artists.name,
    };
    return map[field] ?? artists.createdAt;
  }
}
