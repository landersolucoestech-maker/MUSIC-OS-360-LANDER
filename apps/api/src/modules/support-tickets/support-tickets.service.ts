import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../database/database.module';
import { SupportTicketEntity } from '../../database/entities';
import { WorkflowService } from '../../core/workflow/workflow.service';
import type { CreateSupportTicketDto, UpdateSupportTicketDto, QuerySupportTicketDto } from './dto/support-tickets.dto';

@Injectable()
export class SupportTicketsService {
  private readonly repo: Repository<SupportTicketEntity> | null = null;

  constructor(
    @Inject(DATA_SOURCE) ds: DataSource | null,
    private readonly workflowService: WorkflowService,
  ) {
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

  async findById(
    tenantId: string,
    id: string,
    actorRole?: string,
  ): Promise<SupportTicketEntity & { allowed_transitions: { to: string; label?: string }[] }> {
    const result = await this.repo!
      .createQueryBuilder('t')
      .where('t.id = :id AND t.tenant_id = :tenantId AND t.deleted_at IS NULL', { id, tenantId })
      .getOne();
    if (!result) throw new NotFoundException('Ticket não encontrado');
    const allowed_transitions = this.workflowService.getAllowedTransitions('ticket', result.status, actorRole);
    return { ...result, allowed_transitions };
  }

  async create(tenantId: string, userId: string, dto: CreateSupportTicketDto): Promise<SupportTicketEntity> {
    const ticketNumber = `TKT-${Date.now().toString(36).toUpperCase()}`;
    const entity = this.repo!.create({ tenant_id: tenantId, ...(dto as any), ticket_number: ticketNumber, created_by: userId });
    return this.repo!.save(entity as any) as any;
  }

  async update(
    tenantId: string,
    userId: string,
    id: string,
    dto: UpdateSupportTicketDto,
    actorRole?: string,
  ): Promise<SupportTicketEntity & { allowed_transitions: { to: string; label?: string }[] }> {
    const current = await this.findById(tenantId, id, actorRole);
    const dtoAny = dto as any;
    const updates: Record<string, unknown> = { updated_at: new Date() };

    if (dtoAny.status != null && dtoAny.status !== current.status) {
      await this.workflowService.transition({
        entityType: 'ticket',
        entityId:   id,
        tenantId,
        fromStatus: current.status,
        toStatus:   dtoAny.status,
        actorId:    userId,
        actorRole,
        entity:     current as unknown as Record<string, unknown>,
      });
      updates.status = dtoAny.status;
    }

    const { status: _s, ...rest } = dtoAny;
    void _s;
    Object.assign(updates, rest);

    await this.repo!.update({ id, tenant_id: tenantId } as any, updates as any);
    return this.findById(tenantId, id, actorRole);
  }

  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    await this.repo!.update({ id, tenant_id: tenantId } as any, { deleted_at: new Date() } as any);
    return { deleted: true };
  }
}
