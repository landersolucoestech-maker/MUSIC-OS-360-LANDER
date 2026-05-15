import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../database/database.module';
import { SupportTicketEntity } from '../../database/entities';
import type { CreateSupportTicketDto, UpdateSupportTicketDto, QuerySupportTicketDto } from './dto/support-tickets.dto';

@Injectable()
export class SupportTicketsService {
  private readonly repo: Repository<SupportTicketEntity> | null = null;

  constructor(@Inject(DATA_SOURCE) ds: DataSource | null) {
    if (ds) this.repo = ds.getRepository(SupportTicketEntity);
  }

  async list(tenantId: string, query: QuerySupportTicketDto) {
    const qb = this.repo!
      .createQueryBuilder('t')
      .where('t.tenant_id = :tenantId', { tenantId })
      .andWhere('t.deleted_at IS NULL');

    if ((query as any).status)   qb.andWhere('t.status = :status',     { status:   (query as any).status });
    if ((query as any).priority) qb.andWhere('t.priority = :priority', { priority: (query as any).priority });
    if ((query as any).search)   qb.andWhere('(t.subject ILIKE :search OR t.ticket_number ILIKE :search)', { search: `%${(query as any).search}%` });

    qb.orderBy('t.created_at', (query as any).ascending ? 'ASC' : 'DESC')
      .skip((query as any).offset ?? 0)
      .take((query as any).limit ?? 50);

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, offset: (query as any).offset ?? 0, limit: (query as any).limit ?? 50 } };
  }

  async findById(tenantId: string, id: string): Promise<SupportTicketEntity> {
    const result = await this.repo!
      .createQueryBuilder('t')
      .where('t.id = :id AND t.tenant_id = :tenantId AND t.deleted_at IS NULL', { id, tenantId })
      .getOne();
    if (!result) throw new NotFoundException('Ticket não encontrado');
    return result;
  }

  async create(tenantId: string, userId: string, dto: CreateSupportTicketDto): Promise<SupportTicketEntity> {
    const ticketNumber = `TKT-${Date.now().toString(36).toUpperCase()}`;
    const entity = this.repo!.create({ tenant_id: tenantId, ...(dto as any), ticket_number: ticketNumber, created_by: userId });
    return this.repo!.save(entity);
  }

  async update(tenantId: string, id: string, dto: UpdateSupportTicketDto): Promise<SupportTicketEntity> {
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
