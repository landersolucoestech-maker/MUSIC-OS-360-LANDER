import { Injectable, Inject, NotFoundException, Optional } from '@nestjs/common';
import { DataSource, Repository, FindOptionsWhere } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { DATA_SOURCE } from '../../database/database.module';
import { ReleaseEntity, ArtistEntity } from '../../database/entities';
import type { CreateReleaseDto, UpdateReleaseDto, QueryReleaseDto } from './dto/releases.dto';
import { ReleaseStatus } from '@music-os-360/types';
import { WorkflowService } from '../../core/workflow/workflow.service';
import { EventsService, DOMAIN_EVENTS } from '../../core/events/events.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';

@Injectable()
export class ReleasesService {
  private readonly ds:   DataSource | null = null;
  private readonly repo: Repository<ReleaseEntity> | null = null;

  constructor(
    @Inject(DATA_SOURCE) ds: DataSource | null,
    private readonly workflowService: WorkflowService,
    private readonly events: EventsService,
    @Optional() private readonly activityLogs?: ActivityLogsService,
  ) {
    if (ds) {
      this.ds   = ds;
      this.repo = ds.getRepository(ReleaseEntity);
    }
  }

  async list(tenantId: string, q: QueryReleaseDto) {
    const qb = this.repo!
      .createQueryBuilder('r')
      .leftJoinAndMapOne(
        'r.artistas',
        ArtistEntity,
        'artistas',
        'artistas.id = r.artista_id AND artistas.tenant_id = r.tenant_id AND artistas.deleted_at IS NULL',
      )
      .where('r.tenant_id = :tenantId', { tenantId })
      .andWhere('r.deleted_at IS NULL');

    if (q.status)      qb.andWhere('r.status = :status',               { status:      q.status });
    if (q.type)        qb.andWhere('r.tipo = :tipo',                   { tipo:        q.type });
    if (q.artistId)    qb.andWhere('r.artista_id = :artistaId',        { artistaId:   q.artistId });
    if (q.distributor) qb.andWhere('r.distribuidora = :distribuidora', { distribuidora: q.distributor });
    if (q.search)      qb.andWhere('r.titulo ILIKE :search',           { search:      `%${q.search}%` });

    qb.orderBy('r.created_at', q.ascending ? 'ASC' : 'DESC')
      .skip(q.offset ?? 0)
      .take(q.limit ?? 50);

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, offset: q.offset ?? 0, limit: q.limit ?? 50 } };
  }

  async findById(
    tenantId: string,
    id: string,
    actorRole?: string,
  ): Promise<ReleaseEntity & { allowed_transitions: { to: string; label?: string }[] }> {
    const result = await this.repo!
      .createQueryBuilder('r')
      .leftJoinAndMapOne(
        'r.artistas',
        ArtistEntity,
        'artistas',
        'artistas.id = r.artista_id AND artistas.tenant_id = r.tenant_id AND artistas.deleted_at IS NULL',
      )
      .where('r.id = :id AND r.tenant_id = :tenantId AND r.deleted_at IS NULL', { id, tenantId })
      .getOne();
    if (!result) throw new NotFoundException('Lançamento não encontrado');
    const allowed_transitions = this.workflowService.getAllowedTransitions('release', result.status, actorRole);
    return { ...result, allowed_transitions };
  }

  async create(tenantId: string, userId: string, dto: CreateReleaseDto): Promise<ReleaseEntity> {
    const entity = this.repo!.create({
      tenant_id:       tenantId,
      titulo:          dto.title,
      tipo:            dto.type,
      artista_id:      dto.artistId    ?? null,
      upc:             dto.upc         ?? null,
      distribuidora:   dto.distributor ?? null,
      data_lancamento: dto.releasedAt  ? new Date(dto.releasedAt) : null,
      plataformas:     dto.platforms   ?? [],
      capa_url:        dto.coverUrl    ?? null,
      status:          ReleaseStatus.DRAFT,
      metadata:        dto.metadata    ?? {},
      isrc_global:     dto.isrc_global    ?? null,
      notas_internas:  dto.notas_internas ?? null,
      observacoes:     dto.observacoes    ?? null,
      gravadora:       dto.gravadora      ?? null,
      copyright:       dto.copyright      ?? null,
      genero:          dto.genero         ?? null,
      idioma:          dto.idioma         ?? null,
      assets:          dto.assets         ?? null,
      cronograma:      dto.cronograma     ?? null,
      created_by:      userId,
      updated_by:      userId,
    });
    const saved = await this.repo!.save(entity);
    await this.recordActivity(tenantId, userId, saved.id, 'created', `Lancamento "${saved.titulo}" criado`, {
      titulo: saved.titulo,
      tipo: saved.tipo,
      artistId: saved.artista_id,
    });

    // Dispara automações nativas internas (ex.: release-checklist). Os handlers são
    // assíncronos e à prova de falha — nunca revertem a criação do lançamento.
    this.events.emitTyped(DOMAIN_EVENTS.RELEASE_CREATED, {
      tenantId,
      userId,
      aggregateType: 'release',
      aggregateId:   saved.id,
      payload: {
        releaseId: saved.id,
        tenantId,
        titulo:    saved.titulo,
        tipo:      saved.tipo,
        artistId:  saved.artista_id,
        createdBy: userId,
        createdAt: (saved.created_at ?? new Date()).toISOString(),
      },
    });

    return saved;
  }

  async update(
    tenantId: string,
    userId: string,
    id: string,
    dto: UpdateReleaseDto,
    actorRole?: string,
  ): Promise<ReleaseEntity & { allowed_transitions: { to: string; label?: string }[] }> {
    const current = await this.findById(tenantId, id, actorRole);
    const statusChanging = dto.status != null && dto.status !== current.status;

    const nonStatusUpdates: Record<string, unknown> = { updated_at: new Date(), updated_by: userId };
    if (dto.title       != null) nonStatusUpdates.titulo          = dto.title;
    if (dto.type        != null) nonStatusUpdates.tipo            = dto.type;
    if (dto.artistId    != null) nonStatusUpdates.artista_id      = dto.artistId;
    if (dto.upc         != null) nonStatusUpdates.upc             = dto.upc;
    if (dto.distributor != null) nonStatusUpdates.distribuidora   = dto.distributor;
    if (dto.releasedAt  != null) nonStatusUpdates.data_lancamento = new Date(dto.releasedAt);
    if (dto.platforms   != null) nonStatusUpdates.plataformas     = dto.platforms;
    if (dto.coverUrl    != null) nonStatusUpdates.capa_url        = dto.coverUrl;
    if (dto.metadata    != null) nonStatusUpdates.metadata        = dto.metadata;
    if (dto.isrc_global    != null) nonStatusUpdates.isrc_global    = dto.isrc_global;
    if (dto.notas_internas != null) nonStatusUpdates.notas_internas = dto.notas_internas;
    if (dto.observacoes    != null) nonStatusUpdates.observacoes    = dto.observacoes;
    if (dto.gravadora      != null) nonStatusUpdates.gravadora      = dto.gravadora;
    if (dto.copyright      != null) nonStatusUpdates.copyright      = dto.copyright;
    if (dto.genero         != null) nonStatusUpdates.genero         = dto.genero;
    if (dto.idioma         != null) nonStatusUpdates.idioma         = dto.idioma;
    if (dto.assets         != null) nonStatusUpdates.assets         = dto.assets;
    if (dto.cronograma     != null) nonStatusUpdates.cronograma     = dto.cronograma;

    if (statusChanging) {
      const req = {
        entityType: 'release' as const,
        entityId:   id,
        tenantId,
        actorId:    userId,
        actorRole,
        fromStatus: current.status,
        toStatus:   dto.status as string,
        entity:     current as unknown as Record<string, unknown>,
      };
      await this.ds!.transaction(async (em) => {
        await this.workflowService.transitionInTx(req, em);
        await em.update(ReleaseEntity, { id, tenant_id: tenantId }, {
          ...nonStatusUpdates,
          status: dto.status,
        });
      });

      // Emit WORKFLOW_TRANSITIONED for all status changes
      this.events.emitTyped(DOMAIN_EVENTS.WORKFLOW_TRANSITIONED, {
        tenantId,
        userId,
        aggregateType: 'release',
        aggregateId:   id,
        payload: {
          entityType:     'release',
          entityId:       id,
          tenantId,
          fromStatus:     current.status,
          toStatus:       dto.status as string,
          actorId:        userId,
          actorRole,
          reason:         null,
          transitionedAt: new Date().toISOString(),
        },
      });

      // Emit specialised events per target status
      const nowIso = new Date().toISOString();
      if (dto.status === ReleaseStatus.APPROVED) {
        this.events.emitTyped(DOMAIN_EVENTS.RELEASE_APPROVED, {
          tenantId,
          userId,
          aggregateType: 'release',
          aggregateId:   id,
          payload: {
            releaseId:  id,
            tenantId,
            titulo:     current.titulo,
            artistId:   current.artista_id,
            approvedBy: userId,
            approvedAt: nowIso,
          },
        });
      } else if (dto.status === ReleaseStatus.DISTRIBUTED) {
        this.events.emitTyped(DOMAIN_EVENTS.RELEASE_DISTRIBUTED, {
          tenantId,
          userId,
          aggregateType: 'release',
          aggregateId:   id,
          payload: {
            releaseId:     id,
            tenantId,
            titulo:        current.titulo,
            artistId:      current.artista_id,
            distribuidora: current.distribuidora,
            plataformas:   current.plataformas as unknown[],
            distributedAt: nowIso,
          },
        });
      } else if (dto.status === ReleaseStatus.RELEASED) {
        this.events.emitTyped(DOMAIN_EVENTS.RELEASE_PUBLISHED, {
          tenantId,
          userId,
          aggregateType: 'release',
          aggregateId:   id,
          payload: {
            releaseId:   id,
            tenantId,
            titulo:      current.titulo,
            artistId:    current.artista_id,
            publishedAt: nowIso,
          },
        });
      }
    } else {
      await this.repo!.update(
        { id, tenant_id: tenantId } as FindOptionsWhere<ReleaseEntity>,
        nonStatusUpdates as QueryDeepPartialEntity<ReleaseEntity>,
      );
    }

    return this.findById(tenantId, id, actorRole);
  }

  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    await this.repo!.update(
      { id, tenant_id: tenantId } as FindOptionsWhere<ReleaseEntity>,
      { deleted_at: new Date() } as QueryDeepPartialEntity<ReleaseEntity>,
    );
    return { deleted: true };
  }

  private async recordActivity(
    tenantId: string,
    userId: string,
    entityId: string,
    action: string,
    description: string,
    metadata: Record<string, unknown>,
  ) {
    if (!this.activityLogs) return;
    try {
      await this.activityLogs.create(tenantId, userId || 'system', {
        entity_type: 'release',
        entity_id:   entityId,
        action,
        description,
        metadata,
      });
    } catch {
      // Activity feed must not break the CRUD response; failures still surface via audit/runtime checks.
    }
  }
}
