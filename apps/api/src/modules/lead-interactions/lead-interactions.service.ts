import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../database/database.module';
import { LeadInteractionEntity } from '../../database/entities';
import type { CreateLeadInteractionDto, QueryLeadInteractionDto } from './dto/lead-interactions.dto';

@Injectable()
export class LeadInteractionsService {
  private readonly repo: Repository<LeadInteractionEntity> | null = null;

  constructor(@Inject(DATA_SOURCE) ds: DataSource | null) {
    if (ds) this.repo = ds.getRepository(LeadInteractionEntity);
  }

  async list(tenantId: string, leadId: string, query: QueryLeadInteractionDto) {
    const qb = this.repo!
      .createQueryBuilder('i')
      .where('i.tenant_id = :tenantId AND i.lead_id = :leadId', { tenantId, leadId });

    qb.orderBy('i.created_at', (query as any).ascending ? 'ASC' : 'DESC')
      .skip((query as any).offset ?? 0)
      .take((query as any).limit ?? 50);

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, offset: (query as any).offset ?? 0, limit: (query as any).limit ?? 50 } };
  }

  async create(tenantId: string, leadId: string, userId: string, dto: CreateLeadInteractionDto): Promise<LeadInteractionEntity> {
    const entity = this.repo!.create({
      tenant_id:  tenantId,
      lead_id:    leadId,
      ...(dto as any),
      created_by: userId,
    });
    return this.repo!.save(entity);
  }

  async remove(tenantId: string, id: string): Promise<{ deleted: boolean }> {
    const existing = await this.repo!
      .createQueryBuilder('i')
      .where('i.id = :id AND i.tenant_id = :tenantId', { id, tenantId })
      .getOne();
    if (!existing) throw new NotFoundException('Interação não encontrada');
    await this.repo!.delete({ id, tenant_id: tenantId } as any);
    return { deleted: true };
  }
}
