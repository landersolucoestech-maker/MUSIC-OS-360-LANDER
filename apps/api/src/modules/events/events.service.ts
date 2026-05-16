import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../database/database.module';
import { EventEntity } from '../../database/entities';
import type { CreateEventDto, UpdateEventDto, QueryEventDto } from './dto/events.dto';

@Injectable()
export class EventsService {
  private readonly repo: Repository<EventEntity> | null = null;

  constructor(@Inject(DATA_SOURCE) ds: DataSource | null) {
    if (ds) this.repo = ds.getRepository(EventEntity);
  }

  async list(tenantId: string, query: QueryEventDto) {
    const qb = this.repo!
      .createQueryBuilder('e')
      .where('e.tenant_id = :tenantId', { tenantId })
      .andWhere('e.deleted_at IS NULL');

    if ((query as any).status)     qb.andWhere('e.status = :status',       { status:     (query as any).status });
    if ((query as any).tipo)       qb.andWhere('e.tipo = :tipo',           { tipo:       (query as any).tipo });
    if ((query as any).artista_id) qb.andWhere('e.artista_id = :artistaId', { artistaId: (query as any).artista_id });
    if ((query as any).dateFrom)   qb.andWhere('e.data >= :dateFrom',      { dateFrom:   (query as any).dateFrom });
    if ((query as any).dateTo)     qb.andWhere('e.data <= :dateTo',        { dateTo:     (query as any).dateTo });
    if ((query as any).search)     qb.andWhere('e.titulo ILIKE :search',   { search: `%${(query as any).search}%` });

    qb.orderBy('e.data', (query as any).ascending ? 'ASC' : 'DESC')
      .skip((query as any).offset ?? 0)
      .take((query as any).limit ?? 50);

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, offset: (query as any).offset ?? 0, limit: (query as any).limit ?? 50 } };
  }

  async findById(tenantId: string, id: string): Promise<EventEntity> {
    const result = await this.repo!
      .createQueryBuilder('e')
      .where('e.id = :id AND e.tenant_id = :tenantId AND e.deleted_at IS NULL', { id, tenantId })
      .getOne();
    if (!result) throw new NotFoundException('Evento não encontrado');
    return result;
  }

  async create(tenantId: string, userId: string, dto: CreateEventDto): Promise<EventEntity> {
    const entity = this.repo!.create({ tenant_id: tenantId, ...(dto as any), created_by: userId, updated_by: userId });
    return this.repo!.save(entity as any) as any;
  }

  async update(tenantId: string, userId: string, id: string, dto: UpdateEventDto): Promise<EventEntity> {
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
