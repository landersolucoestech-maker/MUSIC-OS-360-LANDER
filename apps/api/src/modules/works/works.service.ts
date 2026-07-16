import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../database/database.module';
import { WorkEntity } from '../../database/entities';
import { EventsService, DOMAIN_EVENTS } from '../../core/events/events.service';
import type { CreateWorkDto }  from './dto/create-work.dto';
import type { UpdateWorkDto }  from './dto/update-work.dto';
import type { QueryWorkDto }   from './dto/query-work.dto';

@Injectable()
export class WorksService {
  private readonly repo: Repository<WorkEntity> | null = null;

  constructor(
    @Inject(DATA_SOURCE) ds: DataSource | null,
    private readonly events: EventsService,
  ) {
    if (ds) this.repo = ds.getRepository(WorkEntity);
  }

  async list(tenantId: string, query: QueryWorkDto) {
    const qb = this.repo!
      .createQueryBuilder('w')
      .where('w.tenant_id = :tenantId', { tenantId })
      .andWhere('w.deleted_at IS NULL');

    if ((query as any).status) qb.andWhere('w.status = :status', { status: (query as any).status });
    if ((query as any).tipo)   qb.andWhere('w.tipo = :tipo',     { tipo:   (query as any).tipo });
    if ((query as any).search) qb.andWhere('w.titulo ILIKE :search', { search: `%${(query as any).search}%` });

    qb.orderBy('w.created_at', (query as any).ascending ? 'ASC' : 'DESC')
      .skip((query as any).offset ?? 0)
      .take((query as any).limit ?? 50);

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, offset: (query as any).offset ?? 0, limit: (query as any).limit ?? 50 } };
  }

  async findById(tenantId: string, id: string): Promise<WorkEntity> {
    const result = await this.repo!
      .createQueryBuilder('w')
      .where('w.id = :id AND w.tenant_id = :tenantId AND w.deleted_at IS NULL', { id, tenantId })
      .getOne();
    if (!result) throw new NotFoundException('Obra não encontrada');
    return result;
  }

  async create(tenantId: string, userId: string, dto: CreateWorkDto): Promise<WorkEntity> {
    // works.tipo é NOT NULL; o formulário envia tipo_obra (campo próprio).
    const tipo = dto.tipo ?? dto.tipo_obra ?? 'composicao';
    const entity = this.repo!.create({ tenant_id: tenantId, ...(dto as any), tipo, created_by: userId, updated_by: userId });
    const saved = (await this.repo!.save(entity as any)) as WorkEntity;

    // Dispara automações nativas internas (ex.: catalog-metadata-validator). Os
    // handlers são assíncronos e à prova de falha — nunca revertem a criação da obra.
    this.events.emitTyped(DOMAIN_EVENTS.CATALOG_WORK_CREATED, {
      tenantId,
      userId,
      aggregateType: 'work',
      aggregateId:   saved.id,
      payload: { tenantId, workId: saved.id, createdBy: userId },
    });

    return saved;
  }

  async update(tenantId: string, userId: string, id: string, dto: UpdateWorkDto): Promise<WorkEntity> {
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
