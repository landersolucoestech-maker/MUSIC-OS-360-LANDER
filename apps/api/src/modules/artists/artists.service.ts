import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
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

// Fields the entity has as real columns (excluding encrypted fields handled separately)
const ENTITY_COLUMNS = new Set([
  'nome_artistico', 'nome_civil', 'tipo', 'status', 'genero_musical', 'observacoes',
  'foto_url', 'banner_url', 'galeria_urls', 'video_apresentacao_url', 'documentos',
  'manager_nome', 'produtor_executivo', 'agencia_booking', 'label_parceira',
  'especialidades', 'spotify_artist_id', 'youtube_channel_id',
  'deezer_url', 'apple_music_url', 'soundcloud_url', 'contrato_id',
]);

// Fields handled via encryption
const ENCRYPTED_FIELDS = new Set(['email', 'telefone', 'cpf_cnpj', 'manager_contato']);

// Fields that go into metadata JSONB (no dedicated entity column)
const METADATA_FIELDS = new Set([
  'data_nascimento', 'rg', 'endereco',
  'banco', 'agencia', 'conta', 'chave_pix', 'titular_conta',
  'instagram', 'tiktok', 'facebook', 'twitter', 'website',
  'spotify_ouvintes', 'youtube_inscritos', 'deezer_fas',
  'apple_music_albuns', 'soundcloud_seguidores', 'instagram_seguidores', 'tiktok_seguidores',
  'tipo_perfil', 'empresario_id', 'empresario_nome', 'empresario_telefone', 'empresario_email',
  'gravadora_id', 'gravadora_nome', 'gravadora_telefone', 'gravadora_email',
  'gravadora_responsavel_id', 'gravadora_responsavel_nome', 'gravadora_responsavel_telefone', 'gravadora_responsavel_email',
  'relacionamentos',
  'distribuidoras_selecionadas', 'distribuidoras_emails',
  'distribuidoras_empresa_selecionadas', 'distribuidoras_empresa_emails', 'distribuidoras_gerais',
  'documentos_pessoais_url', 'presskit_url',
  'notas_internas', 'slug_artistico', 'tags_musicais', 'fase_carreira',
  'contatos_vinculados', 'contatos_equipe', 'genero',
]);

/** Spreads metadata fields back onto the entity so the frontend can read them as top-level fields. */
function toResponse(entity: ArtistEntity): ArtistEntity & Record<string, unknown> {
  const meta = (entity.metadata ?? {}) as Record<string, unknown>;
  return { ...entity, ...meta };
}

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
    return {
      data: data.map(toResponse),
      meta: { total, offset: query.offset ?? 0, limit: query.limit ?? 50 },
    };
  }

  async findById(tenantId: string, id: string): Promise<ArtistEntity> {
    const result = await this.repo!
      .createQueryBuilder('a')
      .where('a.id = :id AND a.tenant_id = :tenantId AND a.deleted_at IS NULL', { id, tenantId })
      .getOne();
    if (!result) throw new NotFoundException('Artista não encontrado');
    return result;
  }

  async findByIdForResponse(tenantId: string, id: string) {
    return toResponse(await this.findById(tenantId, id));
  }

  async create(tenantId: string, userId: string, dto: CreateArtistDto, orgId?: string): Promise<ArtistEntity> {
    await this.planLimit.enforce(tenantId, orgId ?? tenantId, 'artists');

    // Collect metadata extras from dto
    const metadataExtras: Record<string, unknown> = {};
    for (const field of METADATA_FIELDS) {
      if ((dto as any)[field] !== undefined) metadataExtras[field] = (dto as any)[field];
    }

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
      galeria_urls:        (dto.galeria_urls        ?? []) as any,
      video_apresentacao_url: dto.video_apresentacao_url ?? null,
      documentos:          (dto.documentos          ?? []) as any,
      manager_nome:        dto.manager_nome        ?? null,
      manager_contato_encrypted: this.encryption.encryptNullable(dto.manager_contato),
      produtor_executivo:  dto.produtor_executivo  ?? null,
      agencia_booking:     dto.agencia_booking     ?? null,
      label_parceira:      dto.label_parceira      ?? null,
      spotify_artist_id:   dto.spotify_artist_id   ?? null,
      youtube_channel_id:  dto.youtube_channel_id  ?? null,
      deezer_url:          dto.deezer_url          ?? null,
      apple_music_url:     dto.apple_music_url     ?? null,
      soundcloud_url:      dto.soundcloud_url      ?? null,
      contrato_id:         dto.contrato_id         ?? null,
      especialidades:      (dto.especialidades     ?? []) as any,
      metadata:            { ...(dto.metadata ?? {}), ...metadataExtras },
      email_encrypted:     this.encryption.encryptNullable(dto.email),
      telefone_encrypted:  this.encryption.encryptNullable(dto.telefone),
      cpf_cnpj_encrypted:  this.encryption.encryptNullable(dto.cpf_cnpj),
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

    return toResponse(saved);
  }

  async update(tenantId: string, userId: string, id: string, dto: UpdateArtistDto): Promise<ArtistEntity> {
    const existing = await this.findById(tenantId, id);

    // ── Status transition validation ───────────────────────────────────────────
    const statusChanging = dto.status != null && dto.status !== existing.status;
    if (statusChanging) {
      this.validateStatusTransition(existing, dto);
    }

    const updates: Record<string, unknown> = { updated_at: new Date(), updated_by: userId };
    const changedFields: string[] = [];

    // Map direct entity columns
    if (dto.nome_artistico    != null) { updates.nome_artistico    = dto.nome_artistico;    changedFields.push('nome_artistico'); }
    if (dto.nome_civil        != null) { updates.nome_civil        = dto.nome_civil;        changedFields.push('nome_civil'); }
    if (dto.tipo              != null) { updates.tipo              = dto.tipo;              changedFields.push('tipo'); }
    if (dto.status            != null) { updates.status            = dto.status;            changedFields.push('status'); }
    if (dto.genero_musical    != null) { updates.genero_musical    = dto.genero_musical;    changedFields.push('genero_musical'); }
    if (dto.observacoes       != null) { updates.observacoes       = dto.observacoes;       changedFields.push('observacoes'); }
    if (dto.foto_url          != null) { updates.foto_url          = dto.foto_url;          changedFields.push('foto_url'); }
    if (dto.banner_url        != null) { updates.banner_url        = dto.banner_url;        changedFields.push('banner_url'); }
    if (dto.galeria_urls      != null) { updates.galeria_urls      = dto.galeria_urls;      changedFields.push('galeria_urls'); }
    if (dto.video_apresentacao_url != null) { updates.video_apresentacao_url = dto.video_apresentacao_url; changedFields.push('video_apresentacao_url'); }
    if (dto.documentos        != null) { updates.documentos        = dto.documentos;        changedFields.push('documentos'); }
    if (dto.manager_nome      != null) { updates.manager_nome      = dto.manager_nome;      changedFields.push('manager_nome'); }
    if (dto.produtor_executivo != null) { updates.produtor_executivo = dto.produtor_executivo; changedFields.push('produtor_executivo'); }
    if (dto.agencia_booking   != null) { updates.agencia_booking   = dto.agencia_booking;   changedFields.push('agencia_booking'); }
    if (dto.label_parceira    != null) { updates.label_parceira    = dto.label_parceira;    changedFields.push('label_parceira'); }
    if (dto.spotify_artist_id != null) { updates.spotify_artist_id = dto.spotify_artist_id; changedFields.push('spotify_artist_id'); }
    if (dto.youtube_channel_id != null) { updates.youtube_channel_id = dto.youtube_channel_id; changedFields.push('youtube_channel_id'); }
    if (dto.deezer_url        != null) { updates.deezer_url        = dto.deezer_url;        changedFields.push('deezer_url'); }
    if (dto.apple_music_url   != null) { updates.apple_music_url   = dto.apple_music_url;   changedFields.push('apple_music_url'); }
    if (dto.soundcloud_url    != null) { updates.soundcloud_url    = dto.soundcloud_url;    changedFields.push('soundcloud_url'); }
    if (dto.contrato_id       != null) { updates.contrato_id       = dto.contrato_id;       changedFields.push('contrato_id'); }
    if (dto.especialidades    != null) { updates.especialidades    = dto.especialidades;    changedFields.push('especialidades'); }

    // Encrypted fields
    if ((dto as any).email           !== undefined) { updates.email_encrypted           = this.encryption.encryptNullable((dto as any).email);           changedFields.push('email'); }
    if ((dto as any).telefone        !== undefined) { updates.telefone_encrypted        = this.encryption.encryptNullable((dto as any).telefone);        changedFields.push('telefone'); }
    if ((dto as any).cpf_cnpj        !== undefined) { updates.cpf_cnpj_encrypted        = this.encryption.encryptNullable((dto as any).cpf_cnpj);        changedFields.push('cpf_cnpj'); }
    if ((dto as any).manager_contato !== undefined) { updates.manager_contato_encrypted = this.encryption.encryptNullable((dto as any).manager_contato); changedFields.push('manager_contato'); }

    // Collect metadata-only fields
    const metadataExtras: Record<string, unknown> = {};
    for (const field of METADATA_FIELDS) {
      if ((dto as any)[field] !== undefined) {
        metadataExtras[field] = (dto as any)[field];
        changedFields.push(field);
      }
    }
    if (Object.keys(metadataExtras).length > 0 || dto.metadata != null) {
      updates.metadata = {
        ...(existing.metadata ?? {}),
        ...(dto.metadata ?? {}),
        ...metadataExtras,
      };
    }

    await this.repo!.update({ id, tenant_id: tenantId } as any, updates as any);
    const result = await this.findById(tenantId, id);

    // ── Domain events ──────────────────────────────────────────────────────────
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

    // Status change gets its own dedicated event for fine-grained handlers
    if (statusChanging) {
      this.events.emitTyped(DOMAIN_EVENTS.ARTIST_STATUS_CHANGED, {
        tenantId,
        userId,
        aggregateType: 'artist',
        aggregateId:   id,
        payload: {
          artistId:       id,
          tenantId,
          nomeArtistico:  result.nome_artistico,
          previousStatus: existing.status,
          newStatus:      dto.status!,
          changedBy:      userId,
        },
      });
    }

    return toResponse(result);
  }

  async softDelete(tenantId: string, userId: string, id: string): Promise<{ deleted: boolean }> {
    const existing = await this.findById(tenantId, id);
    await this.repo!.update(
      { id, tenant_id: tenantId } as any,
      { deleted_at: new Date(), updated_by: userId } as any,
    );

    this.events.emitTyped(DOMAIN_EVENTS.ARTIST_DELETED, {
      tenantId,
      userId,
      aggregateType: 'artist',
      aggregateId:   id,
      payload: {
        artistId:      id,
        tenantId,
        nomeArtistico: existing.nome_artistico,
        deletedBy:     userId,
      },
    });

    return { deleted: true };
  }

  // ── Lifecycle validation ─────────────────────────────────────────────────────

  private validateStatusTransition(existing: ArtistEntity, dto: UpdateArtistDto): void {
    const newStatus = dto.status!;

    if (newStatus === ArtistStatus.ATIVO) {
      const genero      = dto.genero_musical ?? existing.genero_musical;
      const hasEmail    = (dto as any).email    != null || existing.email_encrypted    != null;
      const hasTelefone = (dto as any).telefone != null || existing.telefone_encrypted != null;

      const errors: string[] = [];
      if (!genero)                  errors.push('genero_musical obrigatório para ativar artista');
      if (!hasEmail && !hasTelefone) errors.push('email ou telefone obrigatório para ativar artista');

      if (errors.length > 0) throw new BadRequestException(errors.join('; '));
    }

    // contratado: contrato_id deve ser fornecido no update ou já existir
    if (newStatus === ArtistStatus.CONTRATADO) {
      const contratoId = dto.contrato_id ?? existing.contrato_id;
      if (!contratoId) {
        throw new BadRequestException(
          'contrato_id obrigatório ao mover artista para status "contratado"',
        );
      }
    }
  }
}
