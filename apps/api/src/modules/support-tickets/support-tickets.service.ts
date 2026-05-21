import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DataSource, Repository, FindOptionsWhere } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { DATA_SOURCE } from '../../database/database.module';
import { SupportTicketEntity } from '../../database/entities';
import { SupportTicketStatus } from '@music-os-360/types';
import { WorkflowService } from '../../core/workflow/workflow.service';
import { EventsService, DOMAIN_EVENTS } from '../../core/events/events.service';
import type { CreateSupportTicketDto, UpdateSupportTicketDto, QuerySupportTicketDto } from './dto/support-tickets.dto';

@Injectable()
export class SupportTicketsService {
  private readonly ds:   DataSource | null = null;
  private readonly repo: Repository<SupportTicketEntity> | null = null;

  constructor(
    @Inject(DATA_SOURCE) ds: DataSource | null,
    private readonly workflowService: WorkflowService,
    private readonly events: EventsService,
  ) {
    if (ds) {
      this.ds   = ds;
      this.repo = ds.getRepository(SupportTicketEntity);
    }
  }

  async list(tenantId: string, query: QuerySupportTicketDto) {
    const q = query as Record<string, unknown>;
    const qb = this.repo!
      .createQueryBuilder('t')
      .where('t.tenant_id = :tenantId', { tenantId })
      .andWhere('t.deleted_at IS NULL');

    if (q['status'])   qb.andWhere('t.status = :status',     { status:   q['status'] });
    if (q['priority']) qb.andWhere('t.priority = :priority', { priority: q['priority'] });
    if (q['search'])   qb.andWhere(
      '(t.subject ILIKE :search OR t.ticket_number ILIKE :search)',
      { search: `%${q['search']}%` },
    );

    qb.orderBy('t.created_at', q['ascending'] ? 'ASC' : 'DESC')
      .skip(typeof q['offset'] === 'number' ? q['offset'] : 0)
      .take(typeof q['limit']  === 'number' ? q['limit']  : 50);

    const [data, total] = await qb.getManyAndCount();
    return {
      data,
      meta: {
        total,
        offset: typeof q['offset'] === 'number' ? q['offset'] : 0,
        limit:  typeof q['limit']  === 'number' ? q['limit']  : 50,
      },
    };
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
    const entity = this.repo!.create({
      tenant_id:     tenantId,
      ...(dto as unknown as Record<string, unknown>),
      ticket_number: ticketNumber,
      created_by:    userId,
    } as Partial<SupportTicketEntity>);
    return this.repo!.save(entity as SupportTicketEntity);
  }

  async update(
    tenantId: string,
    userId: string,
    id: string,
    dto: UpdateSupportTicketDto,
    actorRole?: string,
  ): Promise<SupportTicketEntity & { allowed_transitions: { to: string; label?: string }[] }> {
    const current = await this.findById(tenantId, id, actorRole);
    const dtoMap  = dto as Record<string, unknown>;
    const statusChanging = dtoMap['status'] != null && dtoMap['status'] !== current.status;
    const toStatus = dtoMap['status'] as string | undefined;

    const { status: _s, ...restFields } = dtoMap;
    void _s;

    const nonStatusUpdates: Record<string, unknown> = {
      updated_at: new Date(),
      ...restFields,
    };

    if (statusChanging) {
      const req = {
        entityType: 'ticket' as const,
        entityId:   id,
        tenantId,
        actorId:    userId,
        actorRole,
        fromStatus: current.status,
        toStatus:   toStatus as string,
        entity:     current as unknown as Record<string, unknown>,
      };
      await this.ds!.transaction(async (em) => {
        await this.workflowService.transitionInTx(req, em);
        await em.update(SupportTicketEntity, { id, tenant_id: tenantId }, {
          ...nonStatusUpdates,
          status: toStatus as SupportTicketStatus,
        });
      });

      // Emit WORKFLOW_TRANSITIONED for every ticket status change
      this.events.emitTyped(DOMAIN_EVENTS.WORKFLOW_TRANSITIONED, {
        tenantId,
        userId,
        aggregateType: 'support_ticket',
        aggregateId:   id,
        payload: {
          entityType:     'support_ticket',
          entityId:       id,
          tenantId,
          fromStatus:     current.status,
          toStatus:       toStatus as string,
          actorId:        userId,
          actorRole,
          reason:         null,
          transitionedAt: new Date().toISOString(),
        },
      });

      // Emit TICKET_RESOLVED when ticket is resolved
      if (toStatus === SupportTicketStatus.RESOLVED) {
        this.events.emitTyped(DOMAIN_EVENTS.TICKET_RESOLVED, {
          tenantId,
          userId,
          aggregateType: 'support_ticket',
          aggregateId:   id,
          payload: {
            ticketId:   id,
            tenantId,
            titulo:     current.subject,
            resolvedBy: userId,
            resolvedAt: new Date().toISOString(),
          },
        });
      }
    } else {
      await this.repo!.update(
        { id, tenant_id: tenantId } as FindOptionsWhere<SupportTicketEntity>,
        nonStatusUpdates as QueryDeepPartialEntity<SupportTicketEntity>,
      );
    }

    return this.findById(tenantId, id, actorRole);
  }

  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    await this.repo!.update(
      { id, tenant_id: tenantId } as FindOptionsWhere<SupportTicketEntity>,
      { deleted_at: new Date() } as QueryDeepPartialEntity<SupportTicketEntity>,
    );
    return { deleted: true };
  }
}
