import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../database/database.module';
import { PhonogramEntity } from '../../database/entities';
import type { CreatePhonogramDto } from './dto/create-phonogram.dto';
import type { UpdatePhonogramDto } from './dto/update-phonogram.dto';
import type { QueryPhonogramDto }  from './dto/query-phonogram.dto';

@Injectable()
export class PhonogramsService {
  private readonly repo: Repository<PhonogramEntity> | null = null;

  constructor(@Inject(DATA_SOURCE) ds: DataSource | null) {
    if (ds) this.repo = ds.getRepository(PhonogramEntity);
  }

  async list(tenantId: string, query: QueryPhonogramDto) {
    const qb = this.repo!
      .createQueryBuilder('p')
      .where('p.tenant_id = :tenantId', { tenantId })
      .andWhere('p.deleted_at IS NULL');

    if ((query as any).status)    qb.andWhere('p.status = :status',       { status:    (query as any).status });
    if ((query as any).tipo)      qb.andWhere('p.tipo = :tipo',           { tipo:      (query as any).tipo });
    if ((query as any).artista_id) qb.andWhere('p.artista_id = :artistaId', { artistaId: (query as any).artista_id });
    if ((query as any).obra_id)   qb.andWhere('p.obra_id = :obraId',      { obraId:    (query as any).obra_id });
    if ((query as any).search)    qb.andWhere('p.titulo ILIKE :search',   { search: `%${(query as any).search}%` });

    qb.orderBy('p.created_at', (query as any).ascending ? 'ASC' : 'DESC')
      .skip((query as any).offset ?? 0)
      .take((query as any).limit ?? 50);

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, offset: (query as any).offset ?? 0, limit: (query as any).limit ?? 50 } };
  }

  async findById(tenantId: string, id: string): Promise<PhonogramEntity> {
    const result = await this.repo!
      .createQueryBuilder('p')
      .where('p.id = :id AND p.tenant_id = :tenantId AND p.deleted_at IS NULL', { id, tenantId })
      .getOne();
    if (!result) throw new NotFoundException('Fonograma não encontrado');
    return result;
  }

  async create(tenantId: string, userId: string, dto: CreatePhonogramDto): Promise<PhonogramEntity> {
    const entity = this.repo!.create({ tenant_id: tenantId, ...(dto as any), created_by: userId, updated_by: userId });
    return this.repo!.save(entity);
  }

  async update(tenantId: string, userId: string, id: string, dto: UpdatePhonogramDto): Promise<PhonogramEntity> {
    await this.findById(tenantId, id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.repo!.update({ id, tenant_id: tenantId } as any, { ...(dto as any), updated_at: new Date(), updated_by: userId } as any);
    return this.findById(tenantId, id);
  }

  async softDelete(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.repo!.update({ id, tenant_id: tenantId } as any, { deleted_at: new Date() } as any);
    return { deleted: true };
  }
}
