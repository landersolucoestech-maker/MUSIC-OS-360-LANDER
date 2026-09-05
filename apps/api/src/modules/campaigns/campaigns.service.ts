import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DataSource, Repository, FindOptionsWhere } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { DATA_SOURCE } from '../../database/database.module';
import { CampaignEntity } from '../../database/entities';
import type { CreateCampaignDto, UpdateCampaignDto, QueryCampaignDto } from './dto/campaigns.dto';
import { CampaignStatus } from '@music-os-360/types';
import { WorkflowService } from '../../core/workflow/workflow.service';
import { EventsService, DOMAIN_EVENTS } from '../../core/events/events.service';

@Injectable()
export class CampaignsService {
  private readonly ds:   DataSource | null = null;
  private readonly repo: Repository<CampaignEntity> | null = null;

  constructor(
    @Inject(DATA_SOURCE) ds: DataSource | null,
    private readonly workflowService: WorkflowService,
    private readonly events: EventsService,
  ) {
    if (ds) {
      this.ds   = ds;
      this.repo = ds.getRepository(CampaignEntity);
    }
  }

  async list(tenantId: string, query: QueryCampaignDto) {
    const q = query as Record<string, unknown>;
    const qb = this.repo!
      .createQueryBuilder('c')
      .where('c.tenant_id = :tenantId', { tenantId })
      .andWhere('c.deleted_at IS NULL');

    if (q['status'])     qb.andWhere('c.status = :status',         { status:     q['status'] });
    if (q['tipo'])       qb.andWhere('c.tipo = :tipo',             { tipo:       q['tipo'] });
    if (q['artist_id']) qb.andWhere('c.artist_id = :artistId',  { artistId:  q['artist_id'] });
    if (q['search'])     qb.andWhere('c.nome ILIKE :search',       { search: `%${q['search']}%` });

    qb.orderBy('c.created_at', q['ascending'] ? 'ASC' : 'DESC')
      .skip(typeof q['offset'] === 'number' ? q['offset'] : 0)
      .take(typeof q['limit']  === 'number' ? q['limit']  : 50);

    const [data, total] = await qb.getManyAndCount();
    return {
      data,
      meta: {
        total,
        offset: typeof q['offset'] === 'number' ? q['offset'] : 0,
        limit:  typeof q['limit']  === 'number' ? q['limit']  : 50,
      },
    };
  }

  async findById(
    tenantId: string,
    id: string,
    actorRole?: string,
  ): Promise<CampaignEntity & { allowed_transitions: { to: string; label?: string }[] }> {
    const result = await this.repo!
      .createQueryBuilder('c')
      .where('c.id = :id AND c.tenant_id = :tenantId AND c.deleted_at IS NULL', { id, tenantId })
      .getOne();
    if (!result) throw new NotFoundException('Campanha não encontrada');
    const allowed_transitions = this.workflowService.getAllowedTransitions('campaign', result.status, actorRole);
    return { ...result, allowed_transitions };
  }

  async create(tenantId: string, userId: string, dto: CreateCampaignDto): Promise<CampaignEntity> {
    const { status: _clientStatus, ...rest } = dto as unknown as Record<string, unknown>;
    void _clientStatus;
    const entity = this.repo!.create({
      tenant_id:  tenantId,
      ...(rest as Record<string, unknown>),
      status:     CampaignStatus.RASCUNHO,
      created_by: userId,
      updated_by: userId,
    } as Partial<CampaignEntity>);
    return this.repo!.save(entity as CampaignEntity);
  }

  async update(
    tenantId: string,
    userId: string,
    id: string,
    dto: UpdateCampaignDto,
    actorRole?: string,
  ): Promise<CampaignEntity & { allowed_transitions: { to: string; label?: string }[] }> {
    const current = await this.findById(tenantId, id, actorRole);
    const dtoMap  = dto as Record<string, unknown>;
    const statusChanging = dtoMap['status'] != null && dtoMap['status'] !== current.status;
    const toStatus = dtoMap['status'] as string | undefined;

    const { status: _s, ...restFields } = dtoMap;
    void _s;

    const nonStatusUpdates: Record<string, unknown> = {
      updated_at: new Date(),
      updated_by: userId,
      ...restFields,
    };

    if (statusChanging) {
      const req = {
        entityType: 'campaign' as const,
        entityId:   id,
        tenantId,
        actorId:    userId,
        actorRole,
        fromStatus: current.status,
        toStatus:   toStatus as string,
        entity:     current as unknown as Record<string, unknown>,
      };
      await this.ds!.transaction(async (em) => {
        await this.workflowService.transitionInTx(req, em);
        await em.update(CampaignEntity, { id, tenant_id: tenantId }, {
          ...nonStatusUpdates,
          status: toStatus as CampaignStatus,
        });
      });

      // Emit WORKFLOW_TRANSITIONED for every campaign status change
      const now = new Date().toISOString();
      this.events.emitTyped(DOMAIN_EVENTS.WORKFLOW_TRANSITIONED, {
        tenantId,
        userId,
        aggregateType: 'campaign',
        aggregateId:   id,
        payload: {
          entityType:     'campaign',
          entityId:       id,
          tenantId,
          fromStatus:     current.status,
          toStatus:       toStatus as string,
          actorId:        userId,
          actorRole,
          reason:         null,
          transitionedAt: now,
        },
      });

      // Emit domain events on status transitions
      if (toStatus === CampaignStatus.ATIVA) {
        this.events.emitTyped(DOMAIN_EVENTS.CAMPAIGN_STARTED, {
          tenantId,
          userId,
          aggregateType: 'campaign',
          aggregateId:   id,
          payload: {
            campaignId: id,
            tenantId,
            titulo:     current.nome,
            startedBy:  userId,
            startedAt:  now,
          },
        });
      } else if (
        toStatus === CampaignStatus.CONCLUIDA ||
        toStatus === CampaignStatus.CANCELADA
      ) {
        this.events.emitTyped(DOMAIN_EVENTS.CAMPAIGN_ENDED, {
          tenantId,
          userId,
          aggregateType: 'campaign',
          aggregateId:   id,
          payload: {
            campaignId: id,
            tenantId,
            titulo:     current.nome,
            endedAt:    now,
          },
        });
      }
    } else {
      await this.repo!.update(
        { id, tenant_id: tenantId } as FindOptionsWhere<CampaignEntity>,
        nonStatusUpdates as QueryDeepPartialEntity<CampaignEntity>,
      );
    }

    return this.findById(tenantId, id, actorRole);
  }

  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    await this.repo!.update(
      { id, tenant_id: tenantId } as FindOptionsWhere<CampaignEntity>,
      { deleted_at: new Date() } as QueryDeepPartialEntity<CampaignEntity>,
    );
    return { deleted: true };
  }
}
