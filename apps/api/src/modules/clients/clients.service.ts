import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../database/database.module';
import { ClientEntity } from '../../database/entities';
import type { CreateClientDto, UpdateClientDto, QueryClientDto } from './dto/clients.dto';

@Injectable()
export class ClientsService {
  private readonly repo: Repository<ClientEntity> | null = null;

  constructor(@Inject(DATA_SOURCE) ds: DataSource | null) {
    if (ds) this.repo = ds.getRepository(ClientEntity);
  }

  async list(tenantId: string, query: QueryClientDto) {
    const qb = this.repo!
      .createQueryBuilder('c')
      .where('c.tenant_id = :tenantId', { tenantId })
      .andWhere('c.deleted_at IS NULL');

    if ((query as any).status)   qb.andWhere('c.status = :status',   { status:   (query as any).status });
    if ((query as any).segmento) qb.andWhere('c.segmento = :segmento', { segmento: (query as any).segmento });
    if ((query as any).search)   qb.andWhere('(c.nome ILIKE :search OR c.responsavel ILIKE :search)', { search: `%${(query as any).search}%` });

    qb.orderBy('c.created_at', (query as any).ascending ? 'ASC' : 'DESC')
      .skip((query as any).offset ?? 0)
      .take((query as any).limit ?? 50);

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, offset: (query as any).offset ?? 0, limit: (query as any).limit ?? 50 } };
  }

  async findById(tenantId: string, id: string): Promise<ClientEntity> {
    const result = await this.repo!
      .createQueryBuilder('c')
      .where('c.id = :id AND c.tenant_id = :tenantId AND c.deleted_at IS NULL', { id, tenantId })
      .getOne();
    if (!result) throw new NotFoundException('Cliente não encontrado');
    return result;
  }

  async create(tenantId: string, userId: string, dto: CreateClientDto): Promise<ClientEntity> {
    const entity = this.repo!.create({ tenant_id: tenantId, ...(dto as any), created_by: userId, updated_by: userId });
    return this.repo!.save(entity);
  }

  async update(tenantId: string, userId: string, id: string, dto: UpdateClientDto): Promise<ClientEntity> {
    await this.findById(tenantId, id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.repo!.update({ id, tenant_id: tenantId } as any, { ...(dto as any), updated_at: new Date(), updated_by: userId } as any);
    return this.findById(tenantId, id);
  }

  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.repo!.update({ id, tenant_id: tenantId } as any, { deleted_at: new Date() } as any);
    return { deleted: true };
  }
}
