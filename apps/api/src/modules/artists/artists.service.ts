import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../database/database.module';
import { ArtistEntity } from '../../database/entities';
import { EncryptionService } from '../../core/security/encryption.service';
import { EventsService, DOMAIN_EVENTS } from '../../core/events/events.service';
import { PlanLimitService } from '../../core/billing/plan-limit.service';
import type { CreateArtistDto } from './dto/create-artist.dto';
import type { UpdateArtistDto } from './dto/update-artist.dto';
import type { QueryArtistDto }  from './dto/query-artist.dto';
import { ArtistStatus } from '@music-os-360/types';

@Injectable()
export class ArtistsService {
  private readonly repo: Repository<ArtistEntity> | null = null;

  constructor(
    @Inject(DATA_SOURCE) ds: DataSource | null,
    private readonly encryption: EncryptionService,
    private readonly events: EventsService,
    private readonly planLimit: PlanLimitService,
  ) {
    if (ds) this.repo = ds.getRepository(ArtistEntity);
  }

  async list(tenantId: string, query: QueryArtistDto) {
    const qb = this.repo!
      .createQueryBuilder('a')
      .where('a.tenant_id = :tenantId', { tenantId })
      .andWhere('a.deleted_at IS NULL');

    if (query.status) qb.andWhere('a.status = :status', { status: query.status });
    if (query.genre)  qb.andWhere('a.genero_musical = :genre', { genre: query.genre });
    if (query.search) {
      qb.andWhere('(a.nome_artistico ILIKE :search OR a.nome_civil ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    const orderField = query.orderBy ?? 'created_at';
    qb.orderBy(`a.${orderField}`, query.ascending ? 'ASC' : 'DESC')
      .skip(query.offset ?? 0)
      .take(query.limit ?? 50);

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, offset: query.offset ?? 0, limit: query.limit ?? 50 } };
  }

  async findById(tenantId: string, id: string): Promise<ArtistEntity> {
    const result = await this.repo!
      .createQueryBuilder('a')
      .where('a.id = :id AND a.tenant_id = :tenantId AND a.deleted_at IS NULL', { id, tenantId })
      .getOne();
    if (!result) throw new NotFoundException('Artista não encontrado');
    return result;
  }

  async create(tenantId: string, userId: string, dto: CreateArtistDto, orgId?: string): Promise<ArtistEntity> {
    await this.planLimit.enforce(tenantId, orgId ?? tenantId, 'artists');
    const entity = this.repo!.create({
      tenant_id:           tenantId,
      nome_artistico:      dto.nome_artistico,
      nome_civil:          dto.nome_civil          ?? null,
      tipo:                dto.tipo                ?? 'solo',
      status:              dto.status ?? ArtistStatus.EM_NEGOCIACAO,
      genero_musical:      dto.genero_musical      ?? null,
      observacoes:         dto.observacoes         ?? null,
      foto_url:            dto.foto_url            ?? null,
      banner_url:          dto.banner_url          ?? null,
      spotify_artist_id:   dto.spotify_artist_id   ?? null,
      youtube_channel_id:  dto.youtube_channel_id  ?? null,
      especialidades:      dto.especialidades      ?? [],
      metadata:            dto.metadata            ?? {},
      email_encrypted:     this.encryption.encryptNullable((dto as any).email),
      telefone_encrypted:  this.encryption.encryptNullable((dto as any).telefone),
      cpf_cnpj_encrypted:  this.encryption.encryptNullable((dto as any).cpf_cnpj),
      created_by:          userId,
      updated_by:          userId,
    });
    const saved = await (this.repo!.save(entity as any) as any);

    this.events.emitTyped(DOMAIN_EVENTS.ARTIST_CREATED, {
      tenantId,
      userId,
      aggregateType: 'artist',
      aggregateId:   saved.id,
      payload: {
        artistId:      saved.id,
        tenantId,
        nomeArtistico: saved.nome_artistico,
        tipo:          saved.tipo,
        status:        saved.status,
        createdBy:     userId,
      },
    });

    return saved;
  }

  async update(tenantId: string, userId: string, id: string, dto: UpdateArtistDto): Promise<ArtistEntity> {
    await this.findById(tenantId, id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, unknown> = { updated_at: new Date(), updated_by: userId };
    const changedFields: string[] = [];

    if (dto.nome_artistico    != null) { updates.nome_artistico    = dto.nome_artistico;    changedFields.push('nome_artistico'); }
    if (dto.nome_civil        != null) { updates.nome_civil        = dto.nome_civil;        changedFields.push('nome_civil'); }
    if (dto.tipo              != null) { updates.tipo              = dto.tipo;              changedFields.push('tipo'); }
    if (dto.status            != null) { updates.status            = dto.status;            changedFields.push('status'); }
    if (dto.genero_musical    != null) { updates.genero_musical    = dto.genero_musical;    changedFields.push('genero_musical'); }
    if (dto.observacoes       != null) { updates.observacoes       = dto.observacoes;       changedFields.push('observacoes'); }
    if (dto.foto_url          != null) { updates.foto_url          = dto.foto_url;          changedFields.push('foto_url'); }
    if (dto.banner_url        != null) { updates.banner_url        = dto.banner_url;        changedFields.push('banner_url'); }
    if (dto.spotify_artist_id != null) { updates.spotify_artist_id = dto.spotify_artist_id; changedFields.push('spotify_artist_id'); }
    if (dto.youtube_channel_id != null) { updates.youtube_channel_id = dto.youtube_channel_id; changedFields.push('youtube_channel_id'); }
    if (dto.especialidades    != null) { updates.especialidades    = dto.especialidades;    changedFields.push('especialidades'); }
    if (dto.metadata          != null) { updates.metadata          = dto.metadata;          changedFields.push('metadata'); }
    if ((dto as any).email    !== undefined) { updates.email_encrypted    = this.encryption.encryptNullable((dto as any).email);    changedFields.push('email'); }
    if ((dto as any).telefone !== undefined) { updates.telefone_encrypted = this.encryption.encryptNullable((dto as any).telefone); changedFields.push('telefone'); }
    if ((dto as any).cpf_cnpj !== undefined) { updates.cpf_cnpj_encrypted = this.encryption.encryptNullable((dto as any).cpf_cnpj); changedFields.push('cpf_cnpj'); }

    await this.repo!.update({ id, tenant_id: tenantId } as any, updates as any);
    const result = await this.findById(tenantId, id);

    if (changedFields.length > 0) {
      this.events.emitTyped(DOMAIN_EVENTS.ARTIST_UPDATED, {
        tenantId,
        userId,
        aggregateType: 'artist',
        aggregateId:   id,
        payload: {
          artistId:      id,
          tenantId,
          nomeArtistico: result.nome_artistico,
          changedFields,
          updatedBy:     userId,
        },
      });
    }

    return result;
  }

  async softDelete(tenantId: string, id: string): Promise<{ deleted: boolean }> {
    await this.findById(tenantId, id);
    await this.repo!.update({ id, tenant_id: tenantId } as any, { deleted_at: new Date() } as any);
    return { deleted: true };
  }
}
