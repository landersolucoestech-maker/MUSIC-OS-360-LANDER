import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DataSource, Repository, FindOptionsWhere } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { DATA_SOURCE } from '../../database/database.module';
import { LeadEntity } from '../../database/entities';
import { EncryptionService } from '../../core/security/encryption.service';
import type { CreateLeadDto, UpdateLeadDto, QueryLeadDto } from './dto/leads.dto';
import { LeadStatus } from '@music-os-360/types';
import { WorkflowService } from '../../core/workflow/workflow.service';
import { EventsService, DOMAIN_EVENTS } from '../../core/events/events.service';

@Injectable()
export class LeadsService {
  private readonly ds:   DataSource | null = null;
  private readonly repo: Repository<LeadEntity> | null = null;

  constructor(
    @Inject(DATA_SOURCE) ds: DataSource | null,
    private readonly workflowService: WorkflowService,
    private readonly events: EventsService,
    private readonly enc: EncryptionService,
  ) {
    if (ds) {
      this.ds   = ds;
      this.repo = ds.getRepository(LeadEntity);
    }
  }

  private mapLead<T extends LeadEntity>(l: T): T & { email: string | null; phone: string | null } {
    return {
      ...l,
      email:              this.enc.decryptNullable(l.email_encrypted),
      phone:              this.enc.decryptNullable(l.telefone_encrypted),
      email_encrypted:    undefined as unknown as string,
      telefone_encrypted: undefined as unknown as string,
    };
  }

  async list(tenantId: string, query: QueryLeadDto) {
    const q = query as Record<string, unknown>;
    const qb = this.repo!
      .createQueryBuilder('l')
      .where('l.tenant_id = :tenantId', { tenantId })
      .andWhere('l.deleted_at IS NULL');

    if (q['status'])         qb.andWhere('l.status = :status',                 { status:       q['status'] });
    if (q['pipeline_stage']) qb.andWhere('l.pipeline_stage = :pipelineStage', { pipelineStage: q['pipeline_stage'] });
    if (q['search'])         qb.andWhere('(l.nome ILIKE :search OR l.empresa ILIKE :search)', { search: `%${q['search']}%` });

    qb.orderBy('l.created_at', q['ascending'] ? 'ASC' : 'DESC')
      .skip(typeof q['offset'] === 'number' ? q['offset'] : 0)
      .take(typeof q['limit']  === 'number' ? q['limit']  : 50);

    const [rows, total] = await qb.getManyAndCount();
    return {
      data: rows.map((l) => this.mapLead(l)),
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
  ): Promise<LeadEntity & { allowed_transitions: { to: string; label?: string }[] }> {
    const result = await this.repo!
      .createQueryBuilder('l')
      .where('l.id = :id AND l.tenant_id = :tenantId AND l.deleted_at IS NULL', { id, tenantId })
      .getOne();
    if (!result) throw new NotFoundException('Lead não encontrado');
    const allowed_transitions = this.workflowService.getAllowedTransitions('lead', result.status, actorRole);
    return { ...this.mapLead(result), allowed_transitions };
  }

  async create(tenantId: string, userId: string, dto: CreateLeadDto): Promise<ReturnType<typeof this.mapLead>> {
    const { status: _clientStatus, email, phone, ...rest } = dto as unknown as Record<string, unknown>;
    void _clientStatus;
    const entity = this.repo!.create({
      tenant_id:          tenantId,
      ...(rest as Record<string, unknown>),
      email_encrypted:    this.enc.encryptNullable(email as string | undefined),
      telefone_encrypted: this.enc.encryptNullable(phone as string | undefined),
      status:             LeadStatus.NOVO,
      created_by:         userId,
      updated_by:         userId,
    } as Partial<LeadEntity>);
    const saved = await this.repo!.save(entity as LeadEntity);
    return this.mapLead(saved);
  }

  async update(
    tenantId: string,
    userId: string,
    id: string,
    dto: UpdateLeadDto,
    actorRole?: string,
  ): Promise<LeadEntity & { allowed_transitions: { to: string; label?: string }[] }> {
    const current = await this.findById(tenantId, id, actorRole);
    const dtoMap  = dto as Record<string, unknown>;
    const statusChanging = dtoMap['status'] != null && dtoMap['status'] !== current.status;
    const toStatus = dtoMap['status'] as string | undefined;

    const { status: _s, email, phone, ...restFields } = dtoMap;
    void _s;

    const nonStatusUpdates: Record<string, unknown> = {
      updated_at: new Date(),
      updated_by: userId,
      ...restFields,
    };
    if (email !== undefined) nonStatusUpdates['email_encrypted']    = this.enc.encryptNullable(email as string | null);
    if (phone !== undefined) nonStatusUpdates['telefone_encrypted']  = this.enc.encryptNullable(phone as string | null);

    if (statusChanging) {
      const req = {
        entityType: 'lead' as const,
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
        await em.update(LeadEntity, { id, tenant_id: tenantId }, {
          ...nonStatusUpdates,
          status: toStatus as LeadStatus,
        });
      });

      // Emit WORKFLOW_TRANSITIONED for every lead status change
      this.events.emitTyped(DOMAIN_EVENTS.WORKFLOW_TRANSITIONED, {
        tenantId,
        userId,
        aggregateType: 'lead',
        aggregateId:   id,
        payload: {
          entityType:     'lead',
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

      // Emit LEAD_CONVERTED when lead is won/closed (FECHADO)
      if (toStatus === LeadStatus.FECHADO) {
        this.events.emitTyped(DOMAIN_EVENTS.LEAD_CONVERTED, {
          tenantId,
          userId,
          aggregateType: 'lead',
          aggregateId:   id,
          payload: {
            leadId:      id,
            tenantId,
            nome:        current.nome,
            empresa:     current.empresa ?? null,
            convertedBy: userId,
            convertedAt: new Date().toISOString(),
          },
        });
      }
    } else {
      await this.repo!.update(
        { id, tenant_id: tenantId } as FindOptionsWhere<LeadEntity>,
        nonStatusUpdates as QueryDeepPartialEntity<LeadEntity>,
      );
    }

    return this.findById(tenantId, id, actorRole);
  }

  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    await this.repo!.update(
      { id, tenant_id: tenantId } as FindOptionsWhere<LeadEntity>,
      { deleted_at: new Date() } as QueryDeepPartialEntity<LeadEntity>,
    );
    return { deleted: true };
  }
}
