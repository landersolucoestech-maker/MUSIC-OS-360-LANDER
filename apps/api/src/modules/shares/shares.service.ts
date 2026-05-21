import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../database/database.module';
import { ShareEntity } from '../../database/entities';
import type { CreateShareDto, UpdateShareDto, QueryShareDto } from './dto/shares.dto';

@Injectable()
export class SharesService {
  private readonly repo: Repository<ShareEntity> | null = null;

  constructor(@Inject(DATA_SOURCE) ds: DataSource | null) {
    if (ds) this.repo = ds.getRepository(ShareEntity);
  }

  async list(tenantId: string, query: QueryShareDto) {
    const qb = this.repo!
      .createQueryBuilder('s')
      .where('s.tenant_id = :tenantId', { tenantId })
      .andWhere('s.deleted_at IS NULL');

    if ((query as any).obra_id)      qb.andWhere('s.obra_id = :obraId',           { obraId:      (query as any).obra_id });
    if ((query as any).fonograma_id) qb.andWhere('s.fonograma_id = :fonogramaId', { fonogramaId: (query as any).fonograma_id });
    if ((query as any).papel)        qb.andWhere('s.papel = :papel',              { papel:       (query as any).papel });

    qb.orderBy('s.created_at', (query as any).ascending ? 'ASC' : 'DESC')
      .skip((query as any).offset ?? 0)
      .take((query as any).limit ?? 50);

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, offset: (query as any).offset ?? 0, limit: (query as any).limit ?? 50 } };
  }

  async findById(tenantId: string, id: string): Promise<ShareEntity> {
    const result = await this.repo!
      .createQueryBuilder('s')
      .where('s.id = :id AND s.tenant_id = :tenantId AND s.deleted_at IS NULL', { id, tenantId })
      .getOne();
    if (!result) throw new NotFoundException('Participação não encontrada');
    return result;
  }

  async create(tenantId: string, dto: CreateShareDto): Promise<ShareEntity> {
    const entity = this.repo!.create({ tenant_id: tenantId, ...(dto as any) });
    return this.repo!.save(entity as any) as any;
  }

  async update(tenantId: string, id: string, dto: UpdateShareDto): Promise<ShareEntity> {
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
