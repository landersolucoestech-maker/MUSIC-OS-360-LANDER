import { Injectable, Inject, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
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

// ── Fonte única do mapeamento DTO ↔ colunas da entity ─────────────────────────
// Colunas NOT NULL: null no PATCH é ignorado (nunca sobrescreve com null).
const REQUIRED_COLUMNS = ['nome_artistico', 'tipo', 'status'] as const;

// Colunas anuláveis: `undefined` = não tocar; `null`/valor = persistir exatamente.
const NULLABLE_COLUMNS = [
  'nome_civil', 'genero_musical', 'observacoes', 'foto_url',
  'manager_nome', 'produtor_executivo',
  'agencia_booking', 'label_parceira', 'spotify_url', 'youtube_url',
  'deezer_url', 'apple_music_url', 'soundcloud_url', 'contrato_id',
] as const;

// Colunas jsonb NOT NULL DEFAULT []: null vira lista vazia.
const JSONB_LIST_COLUMNS = ['galeria_urls', 'documentos', 'especialidades'] as const;

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

/** Shape de resposta: entity sem ciphertext + metadata achatada + PII decifrada. */
export type ArtistResponse =
  Omit<ArtistEntity, 'email_encrypted' | 'telefone_encrypted' | 'cpf_cnpj_encrypted' | 'manager_contato_encrypted'>
  & Record<string, unknown>;

@Injectable()
export class ArtistsService {
  private readonly repo: Repository<ArtistEntity> | null = null;
  private readonly logger = new Logger(ArtistsService.name);

  constructor(
    @Inject(DATA_SOURCE) ds: DataSource | null,
    private readonly encryption: EncryptionService,
    private readonly events: EventsService,
    private readonly planLimit: PlanLimitService,
  ) {
    if (ds) this.repo = ds.getRepository(ArtistEntity);
  }

  /**
   * Resposta ao frontend: espalha os campos de metadata como top-level e
   * DECIFRA os campos PII de volta para os nomes usados pelo formulário
   * (email/telefone/cpf_cnpj/manager_contato). O ciphertext nunca sai da API.
   * Sem isto, tudo que é salvo cifrado "some" ao recarregar.
   */
  private toResponse(entity: ArtistEntity): ArtistResponse {
    const meta = (entity.metadata ?? {}) as Record<string, unknown>;
    const {
      email_encrypted, telefone_encrypted, cpf_cnpj_encrypted, manager_contato_encrypted,
      ...rest
    } = entity;
    return {
      ...rest,
      ...meta,
      email:           this.safeDecrypt(email_encrypted, 'email'),
      telefone:        this.safeDecrypt(telefone_encrypted, 'telefone'),
      cpf_cnpj:        this.safeDecrypt(cpf_cnpj_encrypted, 'cpf_cnpj'),
      manager_contato: this.safeDecrypt(manager_contato_encrypted, 'manager_contato'),
    };
  }

  /** Ciphertext ilegível (chave trocada/valor legado) nunca derruba a leitura. */
  private safeDecrypt(value: string | null, field: string): string | null {
    try {
      return this.encryption.decryptNullable(value);
    } catch {
      this.logger.warn(`Falha ao decifrar campo "${field}" — retornando null`);
      return null;
    }
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
      data: data.map((e) => this.toResponse(e)),
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
    return this.toResponse(await this.findById(tenantId, id));
  }

  async create(tenantId: string, userId: string, dto: CreateArtistDto, orgId?: string): Promise<ArtistResponse> {
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
      galeria_urls:        (dto.galeria_urls        ?? []) as any,
      documentos:          (dto.documentos          ?? []) as any,
      manager_nome:        dto.manager_nome        ?? null,
      manager_contato_encrypted: this.encryption.encryptNullable(dto.manager_contato),
      produtor_executivo:  dto.produtor_executivo  ?? null,
      agencia_booking:     dto.agencia_booking     ?? null,
      label_parceira:      dto.label_parceira      ?? null,
      spotify_url:         dto.spotify_url         ?? null,
      youtube_url:         dto.youtube_url         ?? null,
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

    return this.toResponse(saved);
  }

  async update(tenantId: string, userId: string, id: string, dto: UpdateArtistDto): Promise<ArtistResponse> {
    const existing = await this.findById(tenantId, id);

    // ── Status transition validation ───────────────────────────────────────────
    const statusChanging = dto.status != null && dto.status !== existing.status;
    if (statusChanging) {
      this.validateStatusTransition(existing, dto);
    }

    const updates: Record<string, unknown> = { updated_at: new Date(), updated_by: userId };
    const changedFields: string[] = [];

    // Colunas diretas, dirigidas pelas listas canônicas (fonte única):
    // NOT NULL ignoram null; anuláveis persistem exatamente o que veio (null limpa);
    // listas jsonb NOT NULL normalizam null → [].
    const dtoRec = dto as Record<string, unknown>;
    for (const col of REQUIRED_COLUMNS) {
      if (dtoRec[col] != null) { updates[col] = dtoRec[col]; changedFields.push(col); }
    }
    for (const col of NULLABLE_COLUMNS) {
      if (dtoRec[col] !== undefined) { updates[col] = dtoRec[col] ?? null; changedFields.push(col); }
    }
    for (const col of JSONB_LIST_COLUMNS) {
      if (dtoRec[col] !== undefined) { updates[col] = dtoRec[col] ?? []; changedFields.push(col); }
    }

    // Encrypted fields (nome do campo + sufixo _encrypted, uniforme para os 4)
    for (const field of ENCRYPTED_FIELDS) {
      if (dtoRec[field] !== undefined) {
        updates[`${field}_encrypted`] = this.encryption.encryptNullable(dtoRec[field] as string | null);
        changedFields.push(field);
      }
    }

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

    return this.toResponse(result);
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
