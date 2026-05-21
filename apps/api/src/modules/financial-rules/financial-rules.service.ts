import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../database/database.module';
import { FinancialRuleEntity } from '../../database/entities';
import type { CreateFinancialRuleDto, UpdateFinancialRuleDto, QueryFinancialRuleDto } from './dto/financial-rules.dto';

@Injectable()
export class FinancialRulesService {
  private readonly repo: Repository<FinancialRuleEntity>;

  constructor(@Inject(DATA_SOURCE) ds: DataSource) {
    this.repo = ds.getRepository(FinancialRuleEntity);
  }

  async list(tenantId: string, query: QueryFinancialRuleDto) {
    const qb = this.repo.createQueryBuilder('r')
      .where('r.tenant_id = :tenantId', { tenantId })
      .andWhere('r.deleted_at IS NULL');

    if (query.tipo)     qb.andWhere('r.tipo = :tipo',           { tipo: query.tipo });
    if (query.categoria) qb.andWhere('r.categoria = :categoria', { categoria: query.categoria });
    if (query.ativo !== undefined) qb.andWhere('r.ativo = :ativo', { ativo: query.ativo });
    if (query.search)   qb.andWhere('r.nome ILIKE :search',     { search: `%${query.search}%` });

    qb.orderBy('r.nome', 'ASC')
      .skip(query.offset ?? 0)
      .take(query.limit ?? 100);

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, offset: query.offset ?? 0, limit: query.limit ?? 100 } };
  }

  async findById(tenantId: string, id: string): Promise<FinancialRuleEntity> {
    const item = await this.repo.findOne({ where: { id, tenant_id: tenantId, deleted_at: null } as any });
    if (!item) throw new NotFoundException('Regra financeira não encontrada');
    return item;
  }

  async create(tenantId: string, userId: string, dto: CreateFinancialRuleDto): Promise<FinancialRuleEntity> {
    const item = this.repo.create({ tenant_id: tenantId, ...dto, created_by: userId, updated_by: userId } as any);
    return this.repo.save(item as any) as any;
  }

  async update(tenantId: string, userId: string, id: string, dto: UpdateFinancialRuleDto): Promise<FinancialRuleEntity> {
    await this.findById(tenantId, id);
    await this.repo.update({ id, tenant_id: tenantId } as any, { ...dto, updated_at: new Date(), updated_by: userId } as any);
    return this.findById(tenantId, id);
  }

  async softDelete(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    await this.repo.update({ id, tenant_id: tenantId } as any, { deleted_at: new Date() } as any);
    return { deleted: true };
  }
}
