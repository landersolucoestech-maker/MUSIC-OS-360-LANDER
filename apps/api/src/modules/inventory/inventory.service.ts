import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../database/database.module';
import { InventoryItemEntity } from '../../database/entities';
import type { CreateInventoryItemDto, UpdateInventoryItemDto, QueryInventoryDto } from './dto/inventory.dto';

@Injectable()
export class InventoryService {
  private readonly repo: Repository<InventoryItemEntity>;

  constructor(@Inject(DATA_SOURCE) ds: DataSource) {
    this.repo = ds.getRepository(InventoryItemEntity);
  }

  async list(tenantId: string, query: QueryInventoryDto) {
    const qb = this.repo.createQueryBuilder('i')
      .where('i.tenant_id = :tenantId', { tenantId })
      .andWhere('i.deleted_at IS NULL');

    if (query.status)   qb.andWhere('i.status = :status',       { status: query.status });
    if (query.categoria) qb.andWhere('i.categoria = :categoria', { categoria: query.categoria });
    if (query.search)   qb.andWhere('i.nome ILIKE :search',     { search: `%${query.search}%` });

    qb.orderBy('i.created_at', 'DESC')
      .skip(query.offset ?? 0)
      .take(query.limit ?? 50);

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, offset: query.offset ?? 0, limit: query.limit ?? 50 } };
  }

  async findById(tenantId: string, id: string): Promise<InventoryItemEntity> {
    const item = await this.repo.findOne({ where: { id, tenant_id: tenantId, deleted_at: null } as any });
    if (!item) throw new NotFoundException('Item de inventário não encontrado');
    return item;
  }

  async create(tenantId: string, userId: string, dto: CreateInventoryItemDto): Promise<InventoryItemEntity> {
    const item = this.repo.create({ tenant_id: tenantId, ...dto, created_by: userId, updated_by: userId } as any);
    return this.repo.save(item as any) as any;
  }

  async update(tenantId: string, userId: string, id: string, dto: UpdateInventoryItemDto): Promise<InventoryItemEntity> {
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
