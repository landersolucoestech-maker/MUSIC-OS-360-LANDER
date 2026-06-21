import { Injectable, Inject, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../database/database.module';
import { LicenseEntity } from '../../database/entities';
import type { CreateLicenseDto, UpdateLicenseDto, QueryLicenseDto } from './dto/licensing.dto';

@Injectable()
export class LicensingService {
  private readonly repo: Repository<LicenseEntity> | null;

  constructor(@Inject(DATA_SOURCE) ds: DataSource | null) {
    this.repo = ds?.getRepository(LicenseEntity) ?? null;
  }

  private get repository(): Repository<LicenseEntity> {
    if (!this.repo) {
      throw new ServiceUnavailableException('Database unavailable for licensing');
    }
    return this.repo;
  }

  async list(tenantId: string, query: QueryLicenseDto) {
    const qb = this.repository.createQueryBuilder('l')
      .where('l.tenant_id = :tenantId', { tenantId })
      .andWhere('l.deleted_at IS NULL');

    if (query.status)    qb.andWhere('l.status = :status',       { status: query.status });
    if (query.tipo)      qb.andWhere('l.tipo = :tipo',           { tipo: query.tipo });
    if (query.obra_id)   qb.andWhere('l.obra_id = :obraId',      { obraId: query.obra_id });
    if (query.cliente_id) qb.andWhere('l.cliente_id = :clienteId', { clienteId: query.cliente_id });
    if (query.search)    qb.andWhere('l.titulo ILIKE :search',   { search: `%${query.search}%` });

    qb.orderBy('l.created_at', 'DESC')
      .skip(query.offset ?? 0)
      .take(query.limit ?? 50);

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, offset: query.offset ?? 0, limit: query.limit ?? 50 } };
  }

  async findById(tenantId: string, id: string): Promise<LicenseEntity> {
    const item = await this.repository.findOne({ where: { id, tenant_id: tenantId, deleted_at: null } as any });
    if (!item) throw new NotFoundException('Licença não encontrada');
    return item;
  }

  async create(tenantId: string, userId: string, dto: CreateLicenseDto): Promise<LicenseEntity> {
    const item = this.repository.create({ tenant_id: tenantId, ...dto, created_by: userId, updated_by: userId } as any);
    return this.repository.save(item as any) as any;
  }

  async update(tenantId: string, userId: string, id: string, dto: UpdateLicenseDto): Promise<LicenseEntity> {
    await this.findById(tenantId, id);
    await this.repository.update({ id, tenant_id: tenantId } as any, { ...dto, updated_at: new Date(), updated_by: userId } as any);
    return this.findById(tenantId, id);
  }

  async softDelete(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    await this.repository.update({ id, tenant_id: tenantId } as any, { deleted_at: new Date() } as any);
    return { deleted: true };
  }
}
