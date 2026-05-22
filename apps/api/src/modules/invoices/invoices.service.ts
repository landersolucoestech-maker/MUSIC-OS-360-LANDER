import { Injectable, Inject, Optional, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../database/database.module';
import { InvoiceEntity } from '../../database/entities';
import { EncryptionService } from '../../core/security/encryption.service';
import { EventsService, DOMAIN_EVENTS } from '../../core/events/events.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import type { CreateInvoiceDto, UpdateInvoiceDto, QueryInvoiceDto } from './dto/invoices.dto';

// Both Portuguese enum values and English DTO strings are checked for interop
const CANCELLED_STATUSES = new Set(['cancelada', 'cancelado', 'cancelled']);
const ISSUED_STATUSES    = new Set(['emitida', 'issued']);
const PAID_STATUSES      = new Set(['paga', 'pago', 'paid']);
const OVERDUE_STATUSES   = new Set(['vencida', 'overdue']);

@Injectable()
export class InvoicesService {
  private readonly repo: Repository<InvoiceEntity> | null = null;

  constructor(
    @Inject(DATA_SOURCE) ds: DataSource | null,
    private readonly enc: EncryptionService,
    @Optional() private readonly events: EventsService,
    @Optional() private readonly activityLogs: ActivityLogsService,
  ) {
    if (ds) this.repo = ds.getRepository(InvoiceEntity);
  }

  private mapInvoice(i: InvoiceEntity) {
    return {
      ...i,
      recipientDoc:          this.enc.decryptNullable(i.tomador_doc_encrypted),
      tomador_doc_encrypted: undefined,
    };
  }

  async list(tenantId: string, query: QueryInvoiceDto) {
    const q = query as Record<string, unknown>;
    const qb = this.repo!
      .createQueryBuilder('i')
      .where('i.tenant_id = :tenantId', { tenantId })
      .andWhere('i.deleted_at IS NULL');

    if (q['status'])   qb.andWhere('i.status = :status', { status: q['status'] });
    if (q['type'])     qb.andWhere('i.tipo = :tipo',     { tipo:   q['type'] });
    if (q['artistId']) qb.andWhere('i.prestador_id = :prestadorId', { prestadorId: q['artistId'] });
    if (q['search'])   qb.andWhere('i.numero ILIKE :search', { search: `%${q['search']}%` });

    qb.orderBy('i.created_at', q['ascending'] ? 'ASC' : 'DESC')
      .skip(typeof q['offset'] === 'number' ? q['offset'] : 0)
      .take(typeof q['limit']  === 'number' ? q['limit']  : 50);

    const [rows, total] = await qb.getManyAndCount();
    return {
      data: rows.map((i) => this.mapInvoice(i)),
      meta: { total, offset: typeof q['offset'] === 'number' ? q['offset'] : 0, limit: typeof q['limit'] === 'number' ? q['limit'] : 50 },
    };
  }

  async findById(tenantId: string, id: string) {
    const result = await this.repo!
      .createQueryBuilder('i')
      .where('i.id = :id AND i.tenant_id = :tenantId AND i.deleted_at IS NULL', { id, tenantId })
      .getOne();
    if (!result) throw new NotFoundException('Nota fiscal não encontrada');
    return this.mapInvoice(result);
  }

  async create(tenantId: string, userId: string, dto: CreateInvoiceDto) {
    const { recipientDoc, ...rest } = dto as unknown as Record<string, unknown>;
    const entity = this.repo!.create({
      tenant_id:             tenantId,
      ...(rest as Partial<InvoiceEntity>),
      tomador_doc_encrypted: this.enc.encryptNullable(recipientDoc as string | undefined),
      created_by:            userId,
    } as Partial<InvoiceEntity>);
    const saved = await this.repo!.save(entity as InvoiceEntity);
    const mapped = this.mapInvoice(saved as InvoiceEntity);

    if (this.events) {
      this.events.emitTyped(DOMAIN_EVENTS.INVOICE_CREATED, {
        tenantId,
        userId,
        aggregateType: 'invoice',
        aggregateId:   saved.id,
        payload: {
          invoiceId:   saved.id,
          tenantId,
          tipo:        saved.tipo ?? '',
          valor:       String(saved.valor),
          numero:      saved.numero ?? null,
          prestadorId: saved.prestador_id ?? null,
          createdBy:   userId,
        },
      });
    }

    if (this.activityLogs) {
      try {
        await this.activityLogs.create(tenantId, userId, {
          entity_type:  'invoice',
          entity_id:    saved.id,
          action:       'created',
          description:  `Nota fiscal${saved.numero ? ` nº ${saved.numero}` : ''} criada — R$${saved.valor}`,
          metadata:     { tipo: saved.tipo, valor: String(saved.valor), numero: saved.numero },
        });
      } catch { /* non-critical */ }
    }

    return mapped;
  }

  async update(tenantId: string, userId: string, id: string, dto: UpdateInvoiceDto) {
    const current = await this.findById(tenantId, id);

    if (CANCELLED_STATUSES.has(current.status as string)) {
      throw new ForbiddenException('Nota fiscal cancelada não pode ser editada');
    }

    const { recipientDoc, ...rest } = dto as Record<string, unknown>;
    const updates: Record<string, unknown> = { ...rest, updated_at: new Date() };
    if (recipientDoc !== undefined) {
      updates['tomador_doc_encrypted'] = this.enc.encryptNullable(recipientDoc as string | null);
    }

    await this.repo!.update({ id, tenant_id: tenantId } as any, updates as any);
    const updated = await this.findById(tenantId, id);

    const newStatus = (dto as Record<string, unknown>).status as string | undefined;
    if (newStatus && newStatus !== current.status) {
      await this.emitStatusEvents(tenantId, userId, current, updated, newStatus);
    }

    return updated;
  }

  async remove(tenantId: string, userId: string, id: string) {
    const current = await this.findById(tenantId, id);
    await this.repo!.update({ id, tenant_id: tenantId } as any, { deleted_at: new Date(), updated_by: userId } as any);

    if (this.activityLogs) {
      try {
        await this.activityLogs.create(tenantId, userId, {
          entity_type:  'invoice',
          entity_id:    id,
          action:       'cancelled',
          description:  `Nota fiscal${current.numero ? ` nº ${current.numero}` : ''} cancelada`,
          metadata:     { numero: current.numero, valor: String(current.valor) },
        });
      } catch { /* non-critical */ }
    }

    return { deleted: true };
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private async emitStatusEvents(
    tenantId: string,
    userId: string,
    before: ReturnType<typeof this.mapInvoice>,
    after: ReturnType<typeof this.mapInvoice>,
    newStatus: string,
  ): Promise<void> {
    const nowIso = new Date().toISOString();

    if (this.events) {
      this.events.emitTyped(DOMAIN_EVENTS.INVOICE_STATUS_CHANGED, {
        tenantId,
        userId,
        aggregateType: 'invoice',
        aggregateId:   after.id,
        payload: {
          invoiceId:      after.id,
          tenantId,
          numero:         after.numero ?? null,
          previousStatus: before.status as string,
          newStatus,
          changedBy:      userId,
        },
      });

      if (ISSUED_STATUSES.has(newStatus)) {
        this.events.emitTyped(DOMAIN_EVENTS.INVOICE_ISSUED, {
          tenantId,
          userId,
          aggregateType: 'invoice',
          aggregateId:   after.id,
          payload: {
            invoiceId: after.id,
            tenantId,
            tipo:      after.tipo ?? '',
            valor:     String(after.valor),
            numero:    after.numero ?? null,
            issuedBy:  userId,
            issuedAt:  nowIso,
          },
        });
      }

      if (OVERDUE_STATUSES.has(newStatus)) {
        this.events.emitTyped(DOMAIN_EVENTS.INVOICE_OVERDUE, {
          tenantId,
          userId:        'system',
          aggregateType: 'invoice',
          aggregateId:   after.id,
          payload: {
            invoiceId:      after.id,
            tenantId,
            numero:         after.numero ?? null,
            valor:          String(after.valor),
            dataVencimento: after.data_vencimento ? new Date(after.data_vencimento as any).toISOString() : nowIso,
          },
        });
      }
    }

    if (this.activityLogs) {
      try {
        await this.activityLogs.create(tenantId, userId, {
          entity_type:  'invoice',
          entity_id:    after.id,
          action:       'status_changed',
          description:  `Nota fiscal ${before.status} → ${newStatus}`,
          metadata:     { previousStatus: before.status, newStatus, numero: after.numero },
        });
      } catch { /* non-critical */ }
    }
  }
}
