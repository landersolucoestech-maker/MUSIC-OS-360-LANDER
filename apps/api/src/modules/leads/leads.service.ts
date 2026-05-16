import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DataSource, Repository, FindOptionsWhere } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { DATA_SOURCE } from '../../database/database.module';
import { LeadEntity } from '../../database/entities';
import type { CreateLeadDto, UpdateLeadDto, QueryLeadDto } from './dto/leads.dto';
import { LeadStatus } from '@music-os-360/types';
import { WorkflowService } from '../../core/workflow/workflow.service';

@Injectable()
export class LeadsService {
  private readonly ds:   DataSource | null = null;
  private readonly repo: Repository<LeadEntity> | null = null;

  constructor(
    @Inject(DATA_SOURCE) ds: DataSource | null,
    private readonly workflowService: WorkflowService,
  ) {
    if (ds) {
      this.ds   = ds;
      this.repo = ds.getRepository(LeadEntity);
    }
  }

  async list(tenantId: string, query: QueryLeadDto) {
    const q = query as Record<string, unknown>;
    const qb = this.repo!
      .createQueryBuilder('l')
      .where('l.tenant_id = :tenantId', { tenantId })
      .andWhere('l.deleted_at IS NULL');

    if (q['status'])         qb.andWhere('l.status = :status',                 { status:       q['status'] });
    if (q['pipeline_stage']) qb.andWhere('l.pipeline_stage = :pipelineStage', { pipelineStage: q['pipeline_stage'] });
    if (q['search'])         qb.andWhere('(l.nome ILIKE :search OR l.empresa ILIKE :search)', { search: `%${q['search']}%` });

    qb.orderBy('l.created_at', q['ascending'] ? 'ASC' : 'DESC')
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
  ): Promise<LeadEntity & { allowed_transitions: { to: string; label?: string }[] }> {
    const result = await this.repo!
      .createQueryBuilder('l')
      .where('l.id = :id AND l.tenant_id = :tenantId AND l.deleted_at IS NULL', { id, tenantId })
      .getOne();
    if (!result) throw new NotFoundException('Lead não encontrado');
    const allowed_transitions = this.workflowService.getAllowedTransitions('lead', result.status, actorRole);
    return { ...result, allowed_transitions };
  }

  async create(tenantId: string, userId: string, dto: CreateLeadDto): Promise<LeadEntity> {
    const { status: _clientStatus, ...rest } = dto as unknown as Record<string, unknown>;
    void _clientStatus;
    const entity = this.repo!.create({
      tenant_id:  tenantId,
      ...(rest as Record<string, unknown>),
      status:     LeadStatus.NOVO,
      created_by: userId,
      updated_by: userId,
    } as Partial<LeadEntity>);
    return this.repo!.save(entity as LeadEntity);
  }

  async update(
    tenantId: string,
    userId: string,
    id: string,
    dto: UpdateLeadDto,
    actorRole?: string,
  ): Promise<LeadEntity & { allowed_transitions: { to: string; label?: string }[] }> {
    const current = await this.findById(tenantId, id, actorRole);
    const dtoMap  = dto as Record<string, unknown>;
    const statusChanging = dtoMap['status'] != null && dtoMap['status'] !== current.status;

    const { status: _s, ...restFields } = dtoMap;
    void _s;

    const nonStatusUpdates: Record<string, unknown> = {
      updated_at: new Date(),
      updated_by: userId,
      ...restFields,
    };

    if (statusChanging) {
      const req = {
        entityType: 'lead' as const,
        entityId:   id,
        tenantId,
        actorId:    userId,
        actorRole,
        fromStatus: current.status,
        toStatus:   dtoMap['status'] as string,
        entity:     current as unknown as Record<string, unknown>,
      };
      await this.ds!.transaction(async (em) => {
        await this.workflowService.transitionInTx(req, em);
        await em.update(LeadEntity, { id, tenant_id: tenantId }, {
          ...nonStatusUpdates,
          status: dtoMap['status'] as LeadStatus,
        });
      });
    } else {
      await this.repo!.update(
        { id, tenant_id: tenantId } as FindOptionsWhere<LeadEntity>,
        nonStatusUpdates as QueryDeepPartialEntity<LeadEntity>,
      );
    }

    return this.findById(tenantId, id, actorRole);
  }

  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    await this.repo!.update(
      { id, tenant_id: tenantId } as FindOptionsWhere<LeadEntity>,
      { deleted_at: new Date() } as QueryDeepPartialEntity<LeadEntity>,
    );
    return { deleted: true };
  }
}
