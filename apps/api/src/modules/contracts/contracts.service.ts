import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../database/database.module';
import { ContractEntity } from '../../database/entities';
import type { CreateContractDto } from './dto/create-contract.dto';
import type { UpdateContractDto } from './dto/update-contract.dto';
import type { QueryContractDto }  from './dto/query-contract.dto';
import { ContractStatus } from '@music-os-360/types';
import { WorkflowService } from '../../core/workflow/workflow.service';

@Injectable()
export class ContractsService {
  private readonly repo: Repository<ContractEntity> | null = null;

  constructor(
    @Inject(DATA_SOURCE) ds: DataSource | null,
    private readonly workflowService: WorkflowService,
  ) {
    if (ds) this.repo = ds.getRepository(ContractEntity);
  }

  async list(tenantId: string, query: QueryContractDto) {
    const qb = this.repo!
      .createQueryBuilder('c')
      .where('c.tenant_id = :tenantId', { tenantId })
      .andWhere('c.deleted_at IS NULL');

    if ((query as any).status)     qb.andWhere('c.status = :status',        { status:    (query as any).status });
    if ((query as any).tipo)       qb.andWhere('c.tipo = :tipo',            { tipo:      (query as any).tipo });
    if ((query as any).artista_id) qb.andWhere('c.artista_id = :artistaId', { artistaId: (query as any).artista_id });
    if ((query as any).search)     qb.andWhere('c.titulo ILIKE :search',    { search: `%${(query as any).search}%` });

    qb.orderBy('c.created_at', (query as any).ascending ? 'ASC' : 'DESC')
      .skip((query as any).offset ?? 0)
      .take((query as any).limit ?? 50);

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, offset: (query as any).offset ?? 0, limit: (query as any).limit ?? 50 } };
  }

  async findById(tenantId: string, id: string, actorRole?: string): Promise<ContractEntity & { allowed_transitions: { to: string; label?: string }[] }> {
    const result = await this.repo!
      .createQueryBuilder('c')
      .where('c.id = :id AND c.tenant_id = :tenantId AND c.deleted_at IS NULL', { id, tenantId })
      .getOne();
    if (!result) throw new NotFoundException('Contrato não encontrado');
    const allowed_transitions = this.workflowService.getAllowedTransitions('contract', result.status, actorRole);
    return { ...result, allowed_transitions };
  }

  async create(tenantId: string, userId: string, dto: CreateContractDto): Promise<ContractEntity> {
    const entity = this.repo!.create({
      tenant_id:  tenantId,
      status:     ContractStatus.RASCUNHO,
      ...(dto as any),
      created_by: userId,
      updated_by: userId,
    });
    return this.repo!.save(entity as any) as any;
  }

  async update(tenantId: string, userId: string, id: string, dto: UpdateContractDto, actorRole?: string): Promise<ContractEntity & { allowed_transitions: { to: string; label?: string }[] }> {
    const current = await this.findById(tenantId, id, actorRole);

    const updates: Record<string, unknown> = { updated_at: new Date(), updated_by: userId };

    const dtoAny = dto as any;

    if (dtoAny.status != null && dtoAny.status !== current.status) {
      await this.workflowService.transition({
        entityType: 'contract',
        entityId:   id,
        tenantId,
        actorId:    userId,
        actorRole,
        fromStatus: current.status,
        toStatus:   dtoAny.status,
        entity:     current as unknown as Record<string, unknown>,
      });
      updates.status = dtoAny.status;
    }

    const { status: _s, ...rest } = dtoAny;
    Object.assign(updates, rest);

    await this.repo!.update({ id, tenant_id: tenantId } as any, updates as any);
    return this.findById(tenantId, id, actorRole);
  }

  async softDelete(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    await this.repo!.update({ id, tenant_id: tenantId } as any, { deleted_at: new Date() } as any);
    return { deleted: true };
  }
}
