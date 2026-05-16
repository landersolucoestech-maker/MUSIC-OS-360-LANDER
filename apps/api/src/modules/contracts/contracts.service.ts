import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DataSource, Repository, FindOptionsWhere } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { DATA_SOURCE } from '../../database/database.module';
import { ContractEntity } from '../../database/entities';
import type { CreateContractDto } from './dto/create-contract.dto';
import type { UpdateContractDto } from './dto/update-contract.dto';
import type { QueryContractDto }  from './dto/query-contract.dto';
import { ContractStatus } from '@music-os-360/types';
import { WorkflowService } from '../../core/workflow/workflow.service';


@Injectable()
export class ContractsService {
  private readonly ds:   DataSource | null = null;
  private readonly repo: Repository<ContractEntity> | null = null;

  constructor(
    @Inject(DATA_SOURCE) ds: DataSource | null,
    private readonly workflowService: WorkflowService,
  ) {
    if (ds) {
      this.ds   = ds;
      this.repo = ds.getRepository(ContractEntity);
    }
  }

  async list(tenantId: string, query: QueryContractDto) {
    const q = query as Record<string, unknown>;
    const qb = this.repo!
      .createQueryBuilder('c')
      .where('c.tenant_id = :tenantId', { tenantId })
      .andWhere('c.deleted_at IS NULL');

    if (q['status'])     qb.andWhere('c.status = :status',        { status:    q['status'] });
    if (q['tipo'])       qb.andWhere('c.tipo = :tipo',            { tipo:      q['tipo'] });
    if (q['artista_id']) qb.andWhere('c.artista_id = :artistaId', { artistaId: q['artista_id'] });
    if (q['search'])     qb.andWhere('c.titulo ILIKE :search',    { search: `%${q['search']}%` });

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
  ): Promise<ContractEntity & { allowed_transitions: { to: string; label?: string }[] }> {
    const result = await this.repo!
      .createQueryBuilder('c')
      .where('c.id = :id AND c.tenant_id = :tenantId AND c.deleted_at IS NULL', { id, tenantId })
      .getOne();
    if (!result) throw new NotFoundException('Contrato não encontrado');
    const allowed_transitions = this.workflowService.getAllowedTransitions('contract', result.status, actorRole);
    return { ...result, allowed_transitions };
  }

  async create(tenantId: string, userId: string, dto: CreateContractDto): Promise<ContractEntity> {
    const { status: _ignoredStatus, ...dtoRest } = dto as unknown as Record<string, unknown>;
    void _ignoredStatus;
    const entity = this.repo!.create({
      tenant_id:  tenantId,
      ...dtoRest,
      status:     ContractStatus.RASCUNHO,
      created_by: userId,
      updated_by: userId,
    } as Partial<ContractEntity>);
    return this.repo!.save(entity as ContractEntity);
  }

  async update(
    tenantId: string,
    userId: string,
    id: string,
    dto: UpdateContractDto,
    actorRole?: string,
  ): Promise<ContractEntity & { allowed_transitions: { to: string; label?: string }[] }> {
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
        entityType: 'contract' as const,
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
        await em.update(ContractEntity, { id, tenant_id: tenantId }, {
          ...nonStatusUpdates,
          status: dtoMap['status'] as ContractStatus,
        });
      });
    } else {
      await this.repo!.update(
        { id, tenant_id: tenantId } as FindOptionsWhere<ContractEntity>,
        nonStatusUpdates as QueryDeepPartialEntity<ContractEntity>,
      );
    }

    return this.findById(tenantId, id, actorRole);
  }

  async softDelete(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    await this.repo!.update(
      { id, tenant_id: tenantId } as FindOptionsWhere<ContractEntity>,
      { deleted_at: new Date() } as QueryDeepPartialEntity<ContractEntity>,
    );
    return { deleted: true };
  }
}
