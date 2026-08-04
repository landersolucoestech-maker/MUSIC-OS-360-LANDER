import { Injectable, Inject, Optional, NotFoundException, ForbiddenException, ServiceUnavailableException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../database/database.module';
import { InvoiceEntity } from '../../database/entities';
import { EncryptionService } from '../../core/security/encryption.service';
import { EventsService, DOMAIN_EVENTS } from '../../core/events/events.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import type { CreateInvoiceDto, UpdateInvoiceDto, QueryInvoiceDto } from './dto/invoices.dto';

const CANCELLED_STATUSES = new Set(['cancelada', 'cancelado', 'cancelled']);
const ISSUED_STATUSES = new Set(['emitida', 'issued']);
const OVERDUE_STATUSES = new Set(['vencida', 'overdue']);

@Injectable()
export class InvoicesService {
  private readonly repo: Repository<InvoiceEntity> | null;

  constructor(
    @Inject(DATA_SOURCE) ds: DataSource | null,
    private readonly enc: EncryptionService,
    @Optional() private readonly events?: EventsService,
    @Optional() private readonly activityLogs?: ActivityLogsService,
  ) {
    this.repo = ds?.getRepository(InvoiceEntity) ?? null;
  }

  private get repository(): Repository<InvoiceEntity> {
    if (!this.repo) throw new ServiceUnavailableException('Database unavailable for invoices');
    return this.repo;
  }

  /**
   * Mantém compatibilidade de leitura com registros antigos, sem expor a coluna
   * cifrada. O formulário canônico usa `tomador_cnpj`; quando só existir o
   * legado cifrado, o valor é recuperado para o mesmo campo lógico.
   */
  private mapInvoice(entity: InvoiceEntity): Record<string, unknown> {
    const raw = entity as unknown as Record<string, unknown>;
    const encrypted = raw['tomador_doc_encrypted'];
    const decrypted = typeof encrypted === 'string' && encrypted.length > 0
      ? this.enc.decryptNullable(encrypted)
      : null;

    const mapped: Record<string, unknown> = { ...raw };
    mapped['tomador_cnpj'] = raw['tomador_cnpj'] ?? decrypted ?? null;
    delete mapped['tomador_doc_encrypted'];
    return mapped;
  }

  /**
   * O formulário usa nomes pt-BR. Algumas rotinas/eventos antigos ainda leem
   * `tipo`, `valor` e `data_vencimento`; estes campos são espelhados aqui de
   * forma explícita, sem substituir as colunas canônicas do formulário.
   */
  private normalizePayload(dto: CreateInvoiceDto | UpdateInvoiceDto): Record<string, unknown> {
    const input = dto as unknown as Record<string, unknown>;
    const payload: Record<string, unknown> = { ...input };

    if (input['tipo_nota'] !== undefined) payload['tipo'] = input['tipo_nota'];
    if (input['valor_servicos'] !== undefined) payload['valor'] = input['valor_servicos'];
    if (input['vencimento'] !== undefined) payload['data_vencimento'] = input['vencimento'];

    const cnpj = input['tomador_cnpj'];
    if (cnpj !== undefined) {
      payload['tomador_doc_encrypted'] = this.enc.encryptNullable(
        typeof cnpj === 'string' ? cnpj : null,
      );
    }

    return payload;
  }

  async list(tenantId: string, query: QueryInvoiceDto) {
    const qb = this.repository
      .createQueryBuilder('i')
      .where('i.tenant_id = :tenantId', { tenantId })
      .andWhere('i.deleted_at IS NULL');

    if (query.status) qb.andWhere('i.status = :status', { status: query.status });

    const tipoNota = query.tipo_nota ?? query.type;
    if (tipoNota) {
      qb.andWhere('(i.tipo_nota = :tipoNota OR i.tipo = :tipoNota)', { tipoNota });
    }
    if (query.cliente_id) qb.andWhere('i.cliente_id = :clienteId', { clienteId: query.cliente_id });
    if (query.artistId) qb.andWhere('i.prestador_id = :prestadorId', { prestadorId: query.artistId });
    if (query.search) {
      qb.andWhere(
        '(i.numero ILIKE :search OR i.tomador_razao_social ILIKE :search OR i.descricao_servicos ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    qb.orderBy('i.created_at', query.ascending ? 'ASC' : 'DESC')
      .skip(query.offset ?? 0)
      .take(query.limit ?? 50);

    const [rows, total] = await qb.getManyAndCount();
    return {
      data: rows.map((row) => this.mapInvoice(row)),
      meta: { total, offset: query.offset ?? 0, limit: query.limit ?? 50 },
    };
  }

  async findById(tenantId: string, id: string): Promise<Record<string, unknown>> {
    const result = await this.repository
      .createQueryBuilder('i')
      .where('i.id = :id AND i.tenant_id = :tenantId AND i.deleted_at IS NULL', { id, tenantId })
      .getOne();
    if (!result) throw new NotFoundException('Nota fiscal não encontrada');
    return this.mapInvoice(result);
  }

  async create(tenantId: string, userId: string, dto: CreateInvoiceDto) {
    const payload = this.normalizePayload(dto);
    const entity = this.repository.create({
      tenant_id: tenantId,
      ...payload,
      created_by: userId,
      updated_by: userId,
    } as Partial<InvoiceEntity>);
    const saved = await this.repository.save(entity as InvoiceEntity);
    const mapped = this.mapInvoice(saved);

    this.events?.emitTyped(DOMAIN_EVENTS.INVOICE_CREATED, {
      tenantId,
      userId,
      aggregateType: 'invoice',
      aggregateId: saved.id,
      payload: {
        invoiceId: saved.id,
        tenantId,
        tipo: String((saved as unknown as Record<string, unknown>)['tipo_nota'] ?? saved.tipo ?? ''),
        valor: String((saved as unknown as Record<string, unknown>)['valor_servicos'] ?? saved.valor ?? 0),
        numero: saved.numero ?? null,
        prestadorId: saved.prestador_id ?? null,
        createdBy: userId,
      },
    });

    if (this.activityLogs) {
      try {
        await this.activityLogs.create(tenantId, userId, {
          entity_type: 'invoice',
          entity_id: saved.id,
          action: 'created',
          description: `Nota fiscal${saved.numero ? ` nº ${saved.numero}` : ''} criada — R$${String((mapped['valor_servicos'] ?? mapped['valor']) ?? 0)}`,
          metadata: {
            tipo: mapped['tipo_nota'] ?? mapped['tipo'],
            valor: String((mapped['valor_servicos'] ?? mapped['valor']) ?? 0),
            numero: saved.numero,
          },
        });
      } catch { /* auditoria não bloqueia a operação principal */ }
    }

    return mapped;
  }

  async update(tenantId: string, userId: string, id: string, dto: UpdateInvoiceDto) {
    const current = await this.findById(tenantId, id);
    if (CANCELLED_STATUSES.has(String(current['status'] ?? ''))) {
      throw new ForbiddenException('Nota fiscal cancelada não pode ser editada');
    }

    const updates = {
      ...this.normalizePayload(dto),
      updated_at: new Date(),
      updated_by: userId,
    };
    await this.repository.update({ id, tenant_id: tenantId } as never, updates as never);
    const updated = await this.findById(tenantId, id);

    const newStatus = dto.status;
    if (newStatus && newStatus !== current['status']) {
      await this.emitStatusEvents(tenantId, userId, current, updated, newStatus);
    }
    return updated;
  }

  async remove(tenantId: string, userId: string, id: string) {
    const current = await this.findById(tenantId, id);
    await this.repository.update(
      { id, tenant_id: tenantId } as never,
      { deleted_at: new Date(), updated_at: new Date(), updated_by: userId } as never,
    );

    if (this.activityLogs) {
      try {
        await this.activityLogs.create(tenantId, userId, {
          entity_type: 'invoice',
          entity_id: id,
          action: 'cancelled',
          description: `Nota fiscal${current['numero'] ? ` nº ${String(current['numero'])}` : ''} cancelada`,
          metadata: { numero: current['numero'], valor: String((current['valor_servicos'] ?? current['valor']) ?? 0) },
        });
      } catch { /* auditoria não bloqueia a operação principal */ }
    }
    return { deleted: true };
  }

  private async emitStatusEvents(
    tenantId: string,
    userId: string,
    before: Record<string, unknown>,
    after: Record<string, unknown>,
    newStatus: string,
  ): Promise<void> {
    const nowIso = new Date().toISOString();
    const invoiceId = String(after['id']);
    const numero = after['numero'] == null ? null : String(after['numero']);
    const valor = String((after['valor_servicos'] ?? after['valor']) ?? 0);

    this.events?.emitTyped(DOMAIN_EVENTS.INVOICE_STATUS_CHANGED, {
      tenantId,
      userId,
      aggregateType: 'invoice',
      aggregateId: invoiceId,
      payload: {
        invoiceId,
        tenantId,
        numero,
        previousStatus: String(before['status'] ?? ''),
        newStatus,
        changedBy: userId,
      },
    });

    if (ISSUED_STATUSES.has(newStatus)) {
      this.events?.emitTyped(DOMAIN_EVENTS.INVOICE_ISSUED, {
        tenantId,
        userId,
        aggregateType: 'invoice',
        aggregateId: invoiceId,
        payload: {
          invoiceId,
          tenantId,
          tipo: String(after['tipo_nota'] ?? after['tipo'] ?? ''),
          valor,
          numero,
          issuedBy: userId,
          issuedAt: nowIso,
        },
      });
    }

    if (OVERDUE_STATUSES.has(newStatus)) {
      this.events?.emitTyped(DOMAIN_EVENTS.INVOICE_OVERDUE, {
        tenantId,
        userId: 'system',
        aggregateType: 'invoice',
        aggregateId: invoiceId,
        payload: {
          invoiceId,
          tenantId,
          numero,
          valor,
          dataVencimento: after['vencimento'] ?? after['data_vencimento'] ?? nowIso,
        },
      });
    }

    if (this.activityLogs) {
      try {
        await this.activityLogs.create(tenantId, userId, {
          entity_type: 'invoice',
          entity_id: invoiceId,
          action: 'status_changed',
          description: `Nota fiscal ${String(before['status'] ?? '')} → ${newStatus}`,
          metadata: { previousStatus: before['status'], newStatus, numero },
        });
      } catch { /* auditoria não bloqueia a operação principal */ }
    }
  }
}
