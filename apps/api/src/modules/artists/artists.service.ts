import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, ilike, or, isNull, desc, asc, count, SQL } from 'drizzle-orm';
import { DRIZZLE_DB, DrizzleDB } from '../../database/database.module';
import { artists, Artist }       from '../../database/schema';
import { CreateArtistDto }        from './dto/create-artist.dto';
import { UpdateArtistDto }        from './dto/update-artist.dto';
import { QueryArtistDto }         from './dto/query-artist.dto';

@Injectable()
export class ArtistsService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDB,
  ) {}

  async list(tenantId: string, query: QueryArtistDto) {
    const conditions: SQL[] = [
      eq(artists.tenant_id, tenantId),
      isNull(artists.deleted_at),
    ];

    if (query.status) {
      conditions.push(eq(artists.status, query.status));
    }
    if (query.genre) {
      conditions.push(eq(artists.genero_musical, query.genre));
    }
    if (query.search) {
      conditions.push(
        or(
          ilike(artists.nome_artistico, `%${query.search}%`),
          ilike(artists.nome_civil,     `%${query.search}%`),
        ) as SQL,
      );
    }

    const where    = and(...conditions);
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
      this.db.select({ value: count() }).from(artists).where(where),
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
      .where(
        and(
          eq(artists.tenant_id, tenantId),
          eq(artists.id, id),
          isNull(artists.deleted_at),
        ),
      )
      .limit(1);

    if (!result) throw new NotFoundException('Artista não encontrado');
    return result;
  }

  async create(tenantId: string, userId: string, dto: CreateArtistDto): Promise<Artist> {
    const [created] = await this.db
      .insert(artists)
      .values({
        tenant_id:        tenantId,
        nome_artistico:   dto.nome_artistico,
        nome_civil:       dto.nome_civil       ?? null,
        tipo:             dto.tipo             ?? 'solo',
        status:           dto.status           ?? 'em_negociacao',
        genero_musical:   dto.genero_musical   ?? null,
        observacoes:      dto.observacoes      ?? null,
        foto_url:         dto.foto_url         ?? null,
        banner_url:       dto.banner_url       ?? null,
        spotify_artist_id:  dto.spotify_artist_id  ?? null,
        youtube_channel_id: dto.youtube_channel_id ?? null,
        especialidades:   dto.especialidades   ?? [],
        metadata:         dto.metadata         ?? {},
        created_by:       userId,
        updated_by:       userId,
      })
      .returning();

    return created;
  }

  async update(tenantId: string, userId: string, id: string, dto: UpdateArtistDto): Promise<Artist> {
    await this.findById(tenantId, id);

    const [updated] = await this.db
      .update(artists)
      .set({
        ...(dto.nome_artistico   != null && { nome_artistico:   dto.nome_artistico }),
        ...(dto.nome_civil       != null && { nome_civil:       dto.nome_civil }),
        ...(dto.tipo             != null && { tipo:             dto.tipo }),
        ...(dto.status           != null && { status:           dto.status }),
        ...(dto.genero_musical   != null && { genero_musical:   dto.genero_musical }),
        ...(dto.observacoes      != null && { observacoes:      dto.observacoes }),
        ...(dto.foto_url         != null && { foto_url:         dto.foto_url }),
        ...(dto.banner_url       != null && { banner_url:       dto.banner_url }),
        ...(dto.spotify_artist_id  != null && { spotify_artist_id:  dto.spotify_artist_id }),
        ...(dto.youtube_channel_id != null && { youtube_channel_id: dto.youtube_channel_id }),
        ...(dto.especialidades   != null && { especialidades:   dto.especialidades }),
        ...(dto.metadata         != null && { metadata:         dto.metadata }),
        updated_at: new Date(),
        updated_by: userId,
      })
      .where(and(eq(artists.tenant_id, tenantId), eq(artists.id, id), isNull(artists.deleted_at)))
      .returning();

    return updated;
  }

  async softDelete(tenantId: string, id: string): Promise<{ deleted: boolean }> {
    await this.findById(tenantId, id);

    await this.db
      .update(artists)
      .set({ deleted_at: new Date() })
      .where(and(eq(artists.tenant_id, tenantId), eq(artists.id, id)));

    return { deleted: true };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private resolveOrder(field: string): any {
    const map: Record<string, any> = {
      created_at:     artists.created_at,
      updated_at:     artists.updated_at,
      nome_artistico: artists.nome_artistico,
    };
    return map[field] ?? artists.created_at;
  }
}
