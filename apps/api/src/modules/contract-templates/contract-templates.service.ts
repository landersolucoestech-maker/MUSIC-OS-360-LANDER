import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../database/database.module';
import { ContractTemplateEntity } from '../../database/entities';
import type { CreateContractTemplateDto } from './dto/create-contract-template.dto';
import type { UpdateContractTemplateDto } from './dto/update-contract-template.dto';

@Injectable()
export class ContractTemplatesService {
  private readonly repo: Repository<ContractTemplateEntity> | null = null;

  constructor(@Inject(DATA_SOURCE) ds: DataSource | null) {
    if (ds) this.repo = ds.getRepository(ContractTemplateEntity);
  }

  async list(tenantId: string, query: any) {
    const qb = this.repo!
      .createQueryBuilder('t')
      .where('t.tenant_id = :tenantId', { tenantId })
      .andWhere('t.deleted_at IS NULL');

    if (query.tipo)   qb.andWhere('t.tipo = :tipo',         { tipo:   query.tipo });
    if (query.ativo !== undefined) qb.andWhere('t.ativo = :ativo', { ativo: query.ativo });
    if (query.search) qb.andWhere('t.titulo ILIKE :search', { search: `%${query.search}%` });

    qb.orderBy('t.created_at', query.ascending ? 'ASC' : 'DESC')
      .skip(query.offset ?? 0)
      .take(query.limit ?? 50);

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, offset: query.offset ?? 0, limit: query.limit ?? 50 } };
  }

  async findById(tenantId: string, id: string): Promise<ContractTemplateEntity> {
    const result = await this.repo!
      .createQueryBuilder('t')
      .where('t.id = :id AND t.tenant_id = :tenantId AND t.deleted_at IS NULL', { id, tenantId })
      .getOne();
    if (!result) throw new NotFoundException('Template não encontrado');
    return result;
  }

  async create(tenantId: string, userId: string, dto: CreateContractTemplateDto): Promise<ContractTemplateEntity> {
    const entity = this.repo!.create({ tenant_id: tenantId, ...(dto as any), created_by: userId });
    return this.repo!.save(entity);
  }

  async update(tenantId: string, id: string, dto: UpdateContractTemplateDto): Promise<ContractTemplateEntity> {
    await this.findById(tenantId, id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.repo!.update({ id, tenant_id: tenantId } as any, { ...(dto as any), updated_at: new Date() } as any);
    return this.findById(tenantId, id);
  }

  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.repo!.update({ id, tenant_id: tenantId } as any, { deleted_at: new Date() } as any);
    return { deleted: true };
  }
}
