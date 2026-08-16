import { Injectable, Inject, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../database/database.module';
import { FinanceCategoryKeywordRuleEntity } from '../../database/entities';
import { casUpdate } from '../../common/persistence/optimistic-update.util';
import type {
  CreateFinanceCategoryRuleDto,
  UpdateFinanceCategoryRuleDto,
  QueryFinanceCategoryRuleDto,
} from './dto/finance-category-rules.dto';

@Injectable()
export class FinanceCategoryRulesService {
  private readonly repo: Repository<FinanceCategoryKeywordRuleEntity> | null;

  constructor(@Inject(DATA_SOURCE) ds: DataSource | null) {
    this.repo = ds?.getRepository(FinanceCategoryKeywordRuleEntity) ?? null;
  }

  private get repository(): Repository<FinanceCategoryKeywordRuleEntity> {
    if (!this.repo) {
      throw new ServiceUnavailableException('Database unavailable for finance category rules');
    }
    return this.repo;
  }

  async list(tenantId: string, query: QueryFinanceCategoryRuleDto) {
    const qb = this.repository.createQueryBuilder('r')
      .where('r.tenant_id = :tenantId', { tenantId })
      .andWhere('r.deleted_at IS NULL');

    if (query.transaction_type) qb.andWhere('r.transaction_type = :tt', { tt: query.transaction_type });
    if (query.category_id)      qb.andWhere('r.category_id = :cid',    { cid: query.category_id });
    if (query.active !== undefined) qb.andWhere('r.active = :active', { active: query.active });
    if (query.search)           qb.andWhere('r.keywords::text ILIKE :search', { search: `%${query.search}%` });

    qb.orderBy('r.priority', 'ASC')
      .addOrderBy('r.created_at', 'ASC')
      .skip(query.offset ?? 0)
      .take(query.limit ?? 100);

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, offset: query.offset ?? 0, limit: query.limit ?? 100 } };
  }

  async findById(tenantId: string, id: string): Promise<FinanceCategoryKeywordRuleEntity> {
    const item = await this.repository.findOne({ where: { id, tenant_id: tenantId, deleted_at: null } as any });
    if (!item) throw new NotFoundException('Regra de categorização não encontrada');
    return item;
  }

  async create(tenantId: string, userId: string, dto: CreateFinanceCategoryRuleDto): Promise<FinanceCategoryKeywordRuleEntity> {
    const item = this.repository.create({ tenant_id: tenantId, ...dto, created_by: userId, updated_by: userId } as any);
    return this.repository.save(item as any) as any;
  }

  async update(tenantId: string, userId: string, id: string, dto: UpdateFinanceCategoryRuleDto): Promise<FinanceCategoryKeywordRuleEntity> {
    await this.findById(tenantId, id);
    const updates: Record<string, unknown> = { ...dto, updated_at: new Date(), updated_by: userId };
    const expectedUpdatedAt = updates['expectedUpdatedAt'] as string | undefined;
    delete updates['expectedUpdatedAt'];
    await casUpdate(
      this.repository,
      { id, tenant_id: tenantId } as any,
      updates as any,
      expectedUpdatedAt,
      'Esta regra de categorização foi alterada por outro usuário desde que você a carregou. Recarregue e tente novamente.',
    );
    return this.findById(tenantId, id);
  }

  async softDelete(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    await this.repository.update({ id, tenant_id: tenantId } as any, { deleted_at: new Date() } as any);
    return { deleted: true };
  }
}
