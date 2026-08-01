/**
 * conversations/conversations.service.ts
 *
 * Inbox operacional multi-canal.
 * Toda conversa pertence a um tenant; toda mensagem pertence a uma conversa.
 * Nota interna (note) é visível apenas para a equipe, nunca para o contact.
 */

import {
  Injectable, Inject, NotFoundException, ForbiddenException, Logger,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE }           from '../../database/database.module';
import {
  ConversationEntity,
  ConversationMessageEntity,
  ConversationNoteEntity,
} from '../../database/entities';
import { EventsService, DOMAIN_EVENTS } from '../../core/events/events.service';
import { RealtimeService }              from '../../core/realtime/realtime.service';
import type {
  CreateConversationDto,
  UpdateConversationDto,
  QueryConversationDto,
  CreateMessageDto,
  CreateNoteDto,
  CloseConversationDto,
  ReopenConversationDto,
  TransferConversationDto,
} from './dto/conversations.dto';

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  private readonly convRepo:    Repository<ConversationEntity>        | null = null;
  private readonly msgRepo:     Repository<ConversationMessageEntity>  | null = null;
  private readonly noteRepo:    Repository<ConversationNoteEntity>     | null = null;

  constructor(
    @Inject(DATA_SOURCE) ds: DataSource | null,
    private readonly events: EventsService,
    private readonly ws: RealtimeService,
  ) {
    if (ds) {
      this.convRepo  = ds.getRepository(ConversationEntity);
      this.msgRepo   = ds.getRepository(ConversationMessageEntity);
      this.noteRepo  = ds.getRepository(ConversationNoteEntity);
    }
  }

  // ── Conversations ────────────────────────────────────────────────────────────

  async listConversations(tenantId: string, query: QueryConversationDto) {
    const qb = this.convRepo!
      .createQueryBuilder('c')
      .where('c.tenant_id = :tenantId', { tenantId })
      .andWhere('c.deleted_at IS NULL');

    if (query.status)      qb.andWhere('c.status = :status',           { status:      query.status });
    if (query.channel)     qb.andWhere('c.channel = :channel',         { channel:     query.channel });
    if (query.assigned_to) qb.andWhere('c.assigned_to = :assignedTo',  { assignedTo:  query.assigned_to });
    if (query.queue_id) {
      qb.andWhere("c.metadata->>'queue_id' = :queueId", { queueId: query.queue_id });
    }
    if (query.sector_id) {
      qb.andWhere("c.metadata->>'sector_id' = :sectorId", { sectorId: query.sector_id });
    }
    if (query.service_status) {
      qb.andWhere("c.metadata->>'service_status' = :serviceStatus", { serviceStatus: query.service_status });
    }
    if (query.sla_state) {
      qb.andWhere("c.metadata->>'sla_state' = :slaState", { slaState: query.sla_state });
    }
    if (query.tag_id) {
      qb.andWhere("c.metadata->'tag_ids' ? :tagId", { tagId: query.tag_id });
    }
    if (query.search) {
      qb.andWhere('c.subject ILIKE :search', { search: `%${query.search}%` });
    }

    qb.orderBy('c.last_message_at', 'DESC', 'NULLS LAST')
      .skip(query.offset ?? 0)
      .take(query.limit  ?? 50);

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, offset: query.offset ?? 0, limit: query.limit ?? 50 } };
  }

  async findConversationById(tenantId: string, id: string): Promise<ConversationEntity> {
    const conv = await this.convRepo!
      .createQueryBuilder('c')
      .where('c.id = :id AND c.tenant_id = :tenantId AND c.deleted_at IS NULL', { id, tenantId })
      .getOne();

    if (!conv) throw new NotFoundException('Conversa não encontrada');
    return conv;
  }

  async createConversation(
    tenantId: string,
    userId:   string,
    dto:      CreateConversationDto,
  ): Promise<ConversationEntity> {
    const metadata = {
      ...(dto.metadata ?? {}),
      ...(dto.queue_id ? { queue_id: dto.queue_id } : {}),
      ...(dto.sector_id ? { sector_id: dto.sector_id } : {}),
      ...(dto.service_status ? { service_status: dto.service_status } : { service_status: 'nova' }),
      ...(dto.tags ? { tags: dto.tags } : {}),
    };

    const conv = this.convRepo!.create({
      tenant_id:   tenantId,
      contact_id:  dto.contact_id  ?? null,
      subject:     dto.subject,
      channel:     dto.channel     ?? 'internal',
      assigned_to: dto.assigned_to ?? null,
      status:      'open',
      metadata,
      created_by:  userId,
    });
    const saved = await this.convRepo!.save(conv);

    this.ws.sendToTenant(tenantId, 'conversation:created', {
      conversationId: saved.id,
      subject:        saved.subject,
      channel:        saved.channel,
    });

    this.events.emitTyped(DOMAIN_EVENTS.LEAD_UPDATED, {
      tenantId,
      userId,
      aggregateType: 'conversation',
      aggregateId:   saved.id,
      payload: { tenantId, aggregateType: 'conversation', aggregateId: saved.id, action: 'created' },
    });

    return saved;
  }

  async updateConversation(
    tenantId: string,
    id:       string,
    dto:      UpdateConversationDto,
  ): Promise<ConversationEntity> {
    const current = await this.findConversationById(tenantId, id);

    const updates: Partial<ConversationEntity> = { updated_at: new Date() } as any;
    if (dto.status      != null) (updates as any).status      = dto.status;
    if (dto.subject     != null) (updates as any).subject     = dto.subject;
    if (dto.channel     != null) (updates as any).channel     = dto.channel;
    if (dto.assigned_to != null) (updates as any).assigned_to = dto.assigned_to;
    if (
      dto.metadata != null ||
      dto.queue_id != null ||
      dto.sector_id != null ||
      dto.service_status != null ||
      dto.tags != null
    ) {
      (updates as any).metadata = {
        ...(current.metadata ?? {}),
        ...(dto.metadata ?? {}),
        ...(dto.queue_id ? { queue_id: dto.queue_id } : {}),
        ...(dto.sector_id ? { sector_id: dto.sector_id } : {}),
        ...(dto.service_status ? { service_status: dto.service_status } : {}),
        ...(dto.tags ? { tags: dto.tags } : {}),
      };
    }

    await this.convRepo!.update({ id, tenant_id: tenantId } as any, updates as any);

    const result = await this.findConversationById(tenantId, id);

    this.ws.sendToTenant(tenantId, 'conversation:updated', {
      conversationId: id,
      status:         result.status,
      assigned_to:    result.assigned_to,
    });

    return result;
  }

  async softDeleteConversation(tenantId: string, id: string): Promise<{ deleted: boolean }> {
    await this.findConversationById(tenantId, id);
    await this.convRepo!.update({ id, tenant_id: tenantId } as any, { deleted_at: new Date() } as any);
    return { deleted: true };
  }

  // ── Messages ─────────────────────────────────────────────────────────────────

  async listMessages(tenantId: string, conversationId: string, limit = 50, offset = 0) {
    await this.findConversationById(tenantId, conversationId);

    const [data, total] = await this.msgRepo!
      .createQueryBuilder('m')
      .where('m.conversation_id = :conversationId AND m.tenant_id = :tenantId', {
        conversationId, tenantId,
      })
      .orderBy('m.created_at', 'ASC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return { data, meta: { total, offset, limit } };
  }

  async addMessage(
    tenantId:       string,
    userId:         string,
    conversationId: string,
    dto:            CreateMessageDto,
    senderType:     string = 'user',
  ): Promise<ConversationMessageEntity> {
    const conv = await this.findConversationById(tenantId, conversationId);

    if (conv.status === 'closed') {
      throw new ForbiddenException('Não é possível adicionar mensagens a uma conversa fechada');
    }

    const msg = this.msgRepo!.create({
      conversation_id: conversationId,
      tenant_id:       tenantId,
      body:            dto.body,
      sender_id:       userId,
      sender_type:     senderType,
      attachments:     dto.attachments ?? [],
    });
    const saved = await this.msgRepo!.save(msg);

    // Update conversation last_message_at and re-open if pending
    const statusUpdate: Record<string, unknown> = { last_message_at: saved.created_at, updated_at: new Date() };
    if (conv.status === 'pending') statusUpdate['status'] = 'open';
    await this.convRepo!.update({ id: conversationId } as any, statusUpdate as any);

    this.ws.sendToTenant(tenantId, 'conversation:message', {
      conversationId,
      messageId:   saved.id,
      senderId:    userId,
      senderType,
      bodyPreview: dto.body.slice(0, 100),
    });

    return saved;
  }

  // ── Notes ────────────────────────────────────────────────────────────────────

  async listNotes(tenantId: string, conversationId: string) {
    await this.findConversationById(tenantId, conversationId);

    return this.noteRepo!
      .createQueryBuilder('n')
      .where('n.conversation_id = :conversationId AND n.tenant_id = :tenantId', {
        conversationId, tenantId,
      })
      .orderBy('n.created_at', 'ASC')
      .getMany();
  }

  async addNote(
    tenantId:       string,
    userId:         string,
    conversationId: string,
    dto:            CreateNoteDto,
  ): Promise<ConversationNoteEntity> {
    await this.findConversationById(tenantId, conversationId);

    const note = this.noteRepo!.create({
      conversation_id: conversationId,
      tenant_id:       tenantId,
      body:            dto.body,
      author_id:       userId,
    });
    return this.noteRepo!.save(note);
  }

  // ── Assignment ───────────────────────────────────────────────────────────────

  async assign(tenantId: string, conversationId: string, assigneeId: string | null): Promise<ConversationEntity> {
    await this.findConversationById(tenantId, conversationId);
    await this.convRepo!.update(
      { id: conversationId, tenant_id: tenantId } as any,
      { assigned_to: assigneeId, updated_at: new Date() } as any,
    );

    const result = await this.findConversationById(tenantId, conversationId);

    this.ws.sendToTenant(tenantId, 'conversation:assigned', {
      conversationId,
      assigneeId,
    });

    return result;
  }

  async transfer(
    tenantId: string,
    userId: string,
    conversationId: string,
    dto: TransferConversationDto,
  ): Promise<ConversationEntity> {
    const conv = await this.findConversationById(tenantId, conversationId);
    const transfers = Array.isArray((conv.metadata as any)?.transfers)
      ? (conv.metadata as any).transfers
      : [];
    const metadata = {
      ...(conv.metadata ?? {}),
      ...(dto.queue_id ? { queue_id: dto.queue_id } : {}),
      ...(dto.sector_id ? { sector_id: dto.sector_id } : {}),
      transfers: [
        ...transfers,
        {
          from_assignee: conv.assigned_to,
          to_assignee: dto.assignee_id ?? null,
          queue_id: dto.queue_id ?? null,
          sector_id: dto.sector_id ?? null,
          reason: dto.reason ?? null,
          transferred_by: userId,
          transferred_at: new Date().toISOString(),
        },
      ],
    };

    await this.convRepo!.update(
      { id: conversationId, tenant_id: tenantId } as any,
      {
        assigned_to: dto.assignee_id ?? conv.assigned_to,
        metadata,
        updated_at: new Date(),
      } as any,
    );

    this.ws.sendToTenant(tenantId, 'conversation:transferred', {
      conversationId,
      assigneeId: dto.assignee_id ?? conv.assigned_to,
      queueId: dto.queue_id ?? null,
      sectorId: dto.sector_id ?? null,
    });

    return this.findConversationById(tenantId, conversationId);
  }

  async close(
    tenantId: string,
    userId: string,
    conversationId: string,
    dto: CloseConversationDto,
  ): Promise<ConversationEntity> {
    const conv = await this.findConversationById(tenantId, conversationId);
    const metadata = {
      ...(conv.metadata ?? {}),
      service_status: dto.service_status ?? 'resolvida',
      closure: {
        reason: dto.reason,
        crm_actions: dto.crm_actions ?? {},
        closed_by: userId,
        closed_at: new Date().toISOString(),
      },
    };

    await this.convRepo!.update(
      { id: conversationId, tenant_id: tenantId } as any,
      { status: 'closed', metadata, updated_at: new Date() } as any,
    );

    this.ws.sendToTenant(tenantId, 'conversation:closed', {
      conversationId,
      closedBy: userId,
    });

    return this.findConversationById(tenantId, conversationId);
  }

  async reopen(
    tenantId: string,
    userId: string,
    conversationId: string,
    dto: ReopenConversationDto,
  ): Promise<ConversationEntity> {
    const conv = await this.findConversationById(tenantId, conversationId);
    const metadata = {
      ...(conv.metadata ?? {}),
      service_status: 'em_atendimento',
      reopened: {
        reason: dto.reason ?? null,
        reopened_by: userId,
        reopened_at: new Date().toISOString(),
      },
    };

    await this.convRepo!.update(
      { id: conversationId, tenant_id: tenantId } as any,
      { status: 'open', metadata, updated_at: new Date() } as any,
    );

    this.ws.sendToTenant(tenantId, 'conversation:reopened', {
      conversationId,
      reopenedBy: userId,
    });

    return this.findConversationById(tenantId, conversationId);
  }
}
