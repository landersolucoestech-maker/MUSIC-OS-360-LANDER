import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../database/database.module';
import { ContentDetectionEntity } from '../../database/entities';
import type { CreateContentDetectionDto } from './dto/create-content-detection.dto';

@Injectable()
export class ContentDetectionsService {
  private readonly repo: Repository<ContentDetectionEntity> | null = null;

  constructor(@Inject(DATA_SOURCE) ds: DataSource | null) {
    if (ds) this.repo = ds.getRepository(ContentDetectionEntity);
  }

  async list(tenantId: string, query: any) {
    const qb = this.repo!
      .createQueryBuilder('c')
      .where('c.tenant_id = :tenantId', { tenantId })
      .andWhere('c.deleted_at IS NULL');

    if (query.status)     qb.andWhere('c.status = :status',       { status:     query.status });
    if (query.plataforma) qb.andWhere('c.plataforma = :plataforma', { plataforma: query.plataforma });
    if (query.artista_id) qb.andWhere('c.artista_id = :artistaId', { artistaId: query.artista_id });
    if (query.obra_id)    qb.andWhere('c.obra_id = :obraId',      { obraId:     query.obra_id });

    qb.orderBy('c.detectado_em', query.ascending ? 'ASC' : 'DESC')
      .skip(query.offset ?? 0)
      .take(query.limit ?? 50);

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, offset: query.offset ?? 0, limit: query.limit ?? 50 } };
  }

  async findById(tenantId: string, id: string): Promise<ContentDetectionEntity> {
    const result = await this.repo!
      .createQueryBuilder('c')
      .where('c.id = :id AND c.tenant_id = :tenantId AND c.deleted_at IS NULL', { id, tenantId })
      .getOne();
    if (!result) throw new NotFoundException('Detecção não encontrada');
    return result;
  }

  async create(tenantId: string, dto: CreateContentDetectionDto): Promise<ContentDetectionEntity> {
    const entity = this.repo!.create({ tenant_id: tenantId, ...(dto as any) });
    return this.repo!.save(entity);
  }

  async updateStatus(tenantId: string, id: string, status: string): Promise<ContentDetectionEntity> {
    await this.findById(tenantId, id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.repo!.update({ id, tenant_id: tenantId } as any, { status, updated_at: new Date() } as any);
    return this.findById(tenantId, id);
  }

  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.repo!.update({ id, tenant_id: tenantId } as any, { deleted_at: new Date() } as any);
    return { deleted: true };
  }
}
