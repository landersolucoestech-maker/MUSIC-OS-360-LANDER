import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DataSource, Repository, FindOptionsWhere } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { DATA_SOURCE } from '../../database/database.module';
import { ReleaseEntity } from '../../database/entities';
import type { CreateReleaseDto, UpdateReleaseDto, QueryReleaseDto } from './dto/releases.dto';
import { ReleaseStatus } from '@music-os-360/types';
import { WorkflowService } from '../../core/workflow/workflow.service';

@Injectable()
export class ReleasesService {
  private readonly ds:   DataSource | null = null;
  private readonly repo: Repository<ReleaseEntity> | null = null;

  constructor(
    @Inject(DATA_SOURCE) ds: DataSource | null,
    private readonly workflowService: WorkflowService,
  ) {
    if (ds) {
      this.ds   = ds;
      this.repo = ds.getRepository(ReleaseEntity);
    }
  }

  async list(tenantId: string, q: QueryReleaseDto) {
    const qb = this.repo!
      .createQueryBuilder('r')
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
      status:          ReleaseStatus.PLANEJAMENTO,
      metadata:        dto.metadata    ?? {},
      created_by:      userId,
      updated_by:      userId,
    });
    return this.repo!.save(entity);
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
}
