import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../database/database.module';
import { LeadEntity } from '../../database/entities';
import type { CreateLeadDto, UpdateLeadDto, QueryLeadDto } from './dto/leads.dto';

@Injectable()
export class LeadsService {
  private readonly repo: Repository<LeadEntity> | null = null;

  constructor(@Inject(DATA_SOURCE) ds: DataSource | null) {
    if (ds) this.repo = ds.getRepository(LeadEntity);
  }

  async list(tenantId: string, query: QueryLeadDto) {
    const qb = this.repo!
      .createQueryBuilder('l')
      .where('l.tenant_id = :tenantId', { tenantId })
      .andWhere('l.deleted_at IS NULL');

    if ((query as any).status)         qb.andWhere('l.status = :status',                 { status:   (query as any).status });
    if ((query as any).pipeline_stage) qb.andWhere('l.pipeline_stage = :pipelineStage', { pipelineStage: (query as any).pipeline_stage });
    if ((query as any).search)         qb.andWhere('(l.nome ILIKE :search OR l.empresa ILIKE :search)', { search: `%${(query as any).search}%` });

    qb.orderBy('l.created_at', (query as any).ascending ? 'ASC' : 'DESC')
      .skip((query as any).offset ?? 0)
      .take((query as any).limit ?? 50);

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, offset: (query as any).offset ?? 0, limit: (query as any).limit ?? 50 } };
  }

  async findById(tenantId: string, id: string): Promise<LeadEntity> {
    const result = await this.repo!
      .createQueryBuilder('l')
      .where('l.id = :id AND l.tenant_id = :tenantId AND l.deleted_at IS NULL', { id, tenantId })
      .getOne();
    if (!result) throw new NotFoundException('Lead não encontrado');
    return result;
  }

  async create(tenantId: string, userId: string, dto: CreateLeadDto): Promise<LeadEntity> {
    const entity = this.repo!.create({ tenant_id: tenantId, ...(dto as any), created_by: userId, updated_by: userId });
    return this.repo!.save(entity as any) as any;
  }

  async update(tenantId: string, userId: string, id: string, dto: UpdateLeadDto): Promise<LeadEntity> {
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
