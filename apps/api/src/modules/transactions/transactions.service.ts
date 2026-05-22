import { Injectable, Inject, Optional, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../database/database.module';
import { TransactionEntity } from '../../database/entities';
import { EventsService, DOMAIN_EVENTS } from '../../core/events/events.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import type { QueryTransactionDto } from './dto/query-transaction.dto';
import type { TransactionDetailsDTO } from './dto/transaction-details.dto';
import type {
  CreateTransacaoDto,
  UpdateTransacaoDto,
  PatchTransacaoDto,
} from './validators/transacao.validator';

type AnyRecord = Record<string, unknown>;

const PAID_STATUSES      = new Set(['pago', 'confirmado', 'concluido']);
const CANCELLED_STATUSES = new Set(['cancelado', 'cancelled']);

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function buildPersistencePayload(
  tenantId: string,
  userId: string,
  dto: Partial<CreateTransacaoDto | UpdateTransacaoDto | PatchTransacaoDto>,
  existing?: TransactionEntity,
): AnyRecord {
  const currentMetadata = (existing?.metadata ?? {}) as AnyRecord;
  const metadataKeys = [
    'tipoCliente', 'subcategoria', 'formaPagamento', 'tipoPagamento',
    'quantidadeParcelas', 'intervaloParcelas', 'dataPrimeiraParcela',
    'artistaVinculado', 'projetoVinculado', 'contratoVinculado',
    'eventoVinculado', 'fornecedorCliente', 'orgaoArrecadador',
    'itemInvestimento', 'motivoViagem', 'nomePublicidade', 'observacao',
    'anexoUrl', 'anexoNome',
  ];
  const metadata = { ...currentMetadata };
  for (const key of metadataKeys) {
    if ((dto as AnyRecord)[key] !== undefined) metadata[key] = (dto as AnyRecord)[key];
  }

  const payload: AnyRecord = { metadata, updated_by: userId };
  if (!existing) {
    payload.tenant_id = tenantId;
    payload.created_by = userId;
  }
  if (dto.tipoTransacao !== undefined) payload.tipo = dto.tipoTransacao;
  if (dto.categoria !== undefined) payload.categoria = dto.categoria || 'outros';
  if (dto.descricao !== undefined) payload.descricao = dto.descricao;
  if (dto.valor !== undefined) payload.valor = String(dto.valor);
  if (dto.dataTransacao !== undefined) payload.data = dto.dataTransacao;
  if (dto.status !== undefined) payload.status = dto.status;
  if ((dto as AnyRecord).artistaVinculado !== undefined) payload.artista_id = (dto as AnyRecord).artistaVinculado || null;
  if ((dto as AnyRecord).contratoVinculado !== undefined) payload.contrato_id = (dto as AnyRecord).contratoVinculado || null;
  if ((dto as AnyRecord).projetoVinculado !== undefined) payload.projeto_id = (dto as AnyRecord).projetoVinculado || null;
  if ((dto as AnyRecord).anexoUrl !== undefined) payload.comprovante_url = (dto as AnyRecord).anexoUrl || null;
  if ((dto as AnyRecord).observacao !== undefined) payload.referencia = (dto as AnyRecord).observacao || null;
  return payload;
}

function toTransactionDetails(entity: TransactionEntity): TransactionDetailsDTO {
  const metadata = (entity.metadata ?? {}) as AnyRecord;
  const amount = toNumber(entity.valor);
  const attachments = Array.isArray(metadata.attachments)
    ? metadata.attachments as Array<Record<string, unknown>>
    : entity.comprovante_url
      ? [{
          name: metadata.anexoNome ?? 'Comprovante',
          url: entity.comprovante_url,
          type: metadata.attachmentType ?? null,
          size: metadata.attachmentSize ?? null,
        }]
      : [];

  return {
    id: entity.id,
    type: entity.tipo,
    tipo: entity.tipo,
    tipoTransacao: entity.tipo,
    status: entity.status,
    description: entity.descricao,
    descricao: entity.descricao,
    observations: (metadata.observacao as string | undefined) ?? entity.referencia,
    observacao: (metadata.observacao as string | undefined) ?? entity.referencia,
    observacoes: (metadata.observacao as string | undefined) ?? entity.referencia,
    amount,
    valor: amount,
    grossAmount: toNumber(metadata.grossAmount ?? metadata.valorBruto ?? amount),
    netAmount: metadata.netAmount === undefined && metadata.valorLiquido === undefined ? amount : toNumber(metadata.netAmount ?? metadata.valorLiquido),
    fees: metadata.fees === undefined && metadata.taxas === undefined ? null : toNumber(metadata.fees ?? metadata.taxas),
    discount: metadata.discount === undefined && metadata.desconto === undefined ? null : toNumber(metadata.discount ?? metadata.desconto),
    taxes: metadata.taxes === undefined && metadata.impostos === undefined ? null : toNumber(metadata.taxes ?? metadata.impostos),
    interest: metadata.interest === undefined && metadata.juros === undefined ? null : toNumber(metadata.interest ?? metadata.juros),
    fine: metadata.fine === undefined && metadata.multa === undefined ? null : toNumber(metadata.fine ?? metadata.multa),
    currency: (metadata.currency as string | undefined) ?? 'BRL',
    transactionDate: toIso(entity.data),
    dataTransacao: toIso(entity.data),
    data_transacao: toIso(entity.data),
    data: toIso(entity.data),
    competence: metadata.competence as string | null | undefined,
    dueDate: metadata.dueDate as string | null | undefined,
    paidAt: metadata.paidAt as string | null | undefined,
    recurrence: metadata.recurrence as string | null | undefined,
    paymentMethod: metadata.formaPagamento as string | null | undefined,
    formaPagamento: metadata.formaPagamento as string | null | undefined,
    paymentType: metadata.tipoPagamento as string | null | undefined,
    tipoPagamento: metadata.tipoPagamento as string | null | undefined,
    installments: metadata.quantidadeParcelas == null ? null : toNumber(metadata.quantidadeParcelas),
    quantidadeParcelas: metadata.quantidadeParcelas as number | string | null | undefined,
    installmentCurrent: metadata.installmentCurrent == null ? null : toNumber(metadata.installmentCurrent),
    bankAccount: metadata.bankAccount as Record<string, unknown> | string | null | undefined,
    category: entity.categoria,
    categoria: entity.categoria,
    subcategory: metadata.subcategoria as string | null | undefined,
    subcategoria: metadata.subcategoria as string | null | undefined,
    costCenter: metadata.costCenter as Record<string, unknown> | string | null | undefined,
    tags: Array.isArray(metadata.tags) ? metadata.tags as string[] : [],
    labels: Array.isArray(metadata.labels) ? metadata.labels as string[] : [],
    attachments,
    artist: metadata.artist as Record<string, unknown> | null | undefined,
    artista_id: entity.artista_id,
    artistaVinculado: entity.artista_id,
    project: metadata.project as Record<string, unknown> | null | undefined,
    projeto_id: entity.projeto_id,
    projetoVinculado: entity.projeto_id,
    campaign: metadata.campaign as Record<string, unknown> | null | undefined,
    contract: metadata.contract as Record<string, unknown> | null | undefined,
    contrato_id: entity.contrato_id,
    contratoVinculado: entity.contrato_id,
    release: metadata.release as Record<string, unknown> | null | undefined,
    event: metadata.event as Record<string, unknown> | null | undefined,
    evento_id: metadata.eventoVinculado as string | null | undefined,
    eventoVinculado: metadata.eventoVinculado as string | null | undefined,
    client: metadata.fornecedorCliente as string | null | undefined,
    fornecedorCliente: metadata.fornecedorCliente as string | null | undefined,
    supplier: metadata.supplier as Record<string, unknown> | string | null | undefined,
    metadata,
    createdBy: entity.created_by,
    updatedBy: entity.updated_by,
    createdAt: toIso(entity.created_at) ?? '',
    created_at: toIso(entity.created_at) ?? '',
    updatedAt: toIso(entity.updated_at) ?? '',
    updated_at: toIso(entity.updated_at) ?? '',
  };
}

@Injectable()
export class TransactionsService {
  private readonly repo: Repository<TransactionEntity> | null = null;

  constructor(
    @Inject(DATA_SOURCE) ds: DataSource | null,
    @Optional() private readonly events: EventsService,
    @Optional() private readonly activityLogs: ActivityLogsService,
  ) {
    if (ds) this.repo = ds.getRepository(TransactionEntity);
  }

  async list(tenantId: string, query: QueryTransactionDto) {
    const qb = this.repo!
      .createQueryBuilder('t')
      .where('t.tenant_id = :tenantId', { tenantId })
      .andWhere('t.deleted_at IS NULL');

    if ((query as AnyRecord).status) qb.andWhere('t.status = :status', { status: (query as AnyRecord).status });
    if ((query as AnyRecord).tipo) qb.andWhere('t.tipo = :tipo', { tipo: (query as AnyRecord).tipo });
    if ((query as AnyRecord).categoria) qb.andWhere('t.categoria = :categoria', { categoria: (query as AnyRecord).categoria });
    if ((query as AnyRecord).artista_id) qb.andWhere('t.artista_id = :artistaId', { artistaId: (query as AnyRecord).artista_id });
    if ((query as AnyRecord).dateFrom) qb.andWhere('t.data >= :dateFrom', { dateFrom: (query as AnyRecord).dateFrom });
    if ((query as AnyRecord).dateTo) qb.andWhere('t.data <= :dateTo', { dateTo: (query as AnyRecord).dateTo });

    qb.orderBy('t.data', (query as AnyRecord).ascending ? 'ASC' : 'DESC')
      .skip((query as AnyRecord).offset as number ?? 0)
      .take((query as AnyRecord).limit as number ?? 50);

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, offset: (query as AnyRecord).offset ?? 0, limit: (query as AnyRecord).limit ?? 50 } };
  }

  private async findEntityById(tenantId: string, id: string): Promise<TransactionEntity> {
    const result = await this.repo!
      .createQueryBuilder('t')
      .where('t.id = :id AND t.tenant_id = :tenantId AND t.deleted_at IS NULL', { id, tenantId })
      .getOne();
    if (!result) throw new NotFoundException('Transacao nao encontrada');
    return result;
  }

  async findById(tenantId: string, id: string): Promise<TransactionDetailsDTO> {
    return toTransactionDetails(await this.findEntityById(tenantId, id));
  }

  async create(tenantId: string, userId: string, dto: CreateTransacaoDto): Promise<TransactionEntity> {
    const entity = this.repo!.create(buildPersistencePayload(tenantId, userId, dto) as Parameters<Repository<TransactionEntity>['create']>[0]);
    const saved = await this.repo!.save(entity as TransactionEntity);

    const valor = String((dto as AnyRecord).valor ?? '0');

    if (this.events) {
      this.events.emitTyped(DOMAIN_EVENTS.TRANSACTION_CREATED, {
        tenantId,
        userId,
        aggregateType: 'transaction',
        aggregateId:   saved.id,
        payload: {
          transactionId: saved.id,
          tenantId,
          tipo:          saved.tipo ?? (dto as AnyRecord).tipoTransacao as string ?? '',
          categoria:     saved.categoria ?? (dto as AnyRecord).categoria as string ?? '',
          valor,
          contratoId:    saved.contrato_id ?? null,
          artistaId:     saved.artista_id ?? null,
          createdBy:     userId,
        },
      });
    }

    if (this.activityLogs) {
      try {
        await this.activityLogs.create(tenantId, userId, {
          entity_type:  'transaction',
          entity_id:    saved.id,
          action:       'created',
          description:  `Transacção ${saved.tipo} R$${valor} criada`,
          metadata:     { tipo: saved.tipo, categoria: saved.categoria, valor },
        });
      } catch { /* non-critical */ }
    }

    return saved;
  }

  async update(tenantId: string, userId: string, id: string, dto: UpdateTransacaoDto): Promise<TransactionEntity> {
    const existing = await this.findEntityById(tenantId, id);
    this.assertEditable(existing);

    const newStatus = (dto as AnyRecord).status as string | undefined;
    await this.repo!.update(
      { id, tenant_id: tenantId } as AnyRecord,
      { ...buildPersistencePayload(tenantId, userId, dto, existing), updated_at: new Date() } as AnyRecord,
    );
    const updated = await this.findEntityById(tenantId, id);
    await this.emitStatusEvents(tenantId, userId, existing, updated, newStatus);
    return updated;
  }

  async patch(tenantId: string, userId: string, id: string, dto: PatchTransacaoDto): Promise<TransactionEntity> {
    const existing = await this.findEntityById(tenantId, id);
    this.assertEditable(existing);

    const newStatus = (dto as AnyRecord).status as string | undefined;
    await this.repo!.update(
      { id, tenant_id: tenantId } as AnyRecord,
      { ...buildPersistencePayload(tenantId, userId, dto, existing), updated_at: new Date() } as AnyRecord,
    );
    const updated = await this.findEntityById(tenantId, id);
    await this.emitStatusEvents(tenantId, userId, existing, updated, newStatus);
    return updated;
  }

  async softDelete(tenantId: string, userId: string, id: string) {
    const existing = await this.findEntityById(tenantId, id);

    if (CANCELLED_STATUSES.has(existing.status as string)) {
      throw new BadRequestException('Transacção já cancelada');
    }

    const cancelledAt = new Date().toISOString();
    await this.repo!.update(
      { id, tenant_id: tenantId } as AnyRecord,
      { deleted_at: new Date(), updated_by: userId } as AnyRecord,
    );

    if (this.events) {
      this.events.emitTyped(DOMAIN_EVENTS.TRANSACTION_CANCELLED, {
        tenantId,
        userId,
        aggregateType: 'transaction',
        aggregateId:   id,
        payload: {
          transactionId: id,
          tenantId,
          tipo:          existing.tipo as string,
          valor:         String(existing.valor),
          cancelledBy:   userId,
          cancelledAt,
        },
      });
    }

    if (this.activityLogs) {
      try {
        await this.activityLogs.create(tenantId, userId, {
          entity_type:  'transaction',
          entity_id:    id,
          action:       'cancelled',
          description:  `Transacção R$${existing.valor} cancelada`,
          metadata:     { tipo: existing.tipo, valor: String(existing.valor), cancelledAt },
        });
      } catch { /* non-critical */ }
    }

    return { deleted: true };
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private assertEditable(entity: TransactionEntity): void {
    if (CANCELLED_STATUSES.has(entity.status as string)) {
      throw new ForbiddenException('Transacção cancelada não pode ser editada');
    }
  }

  private async emitStatusEvents(
    tenantId: string,
    userId: string,
    before: TransactionEntity,
    after: TransactionEntity,
    requestedStatus: string | undefined,
  ): Promise<void> {
    if (!requestedStatus || requestedStatus === before.status) return;

    const nowIso = new Date().toISOString();
    const valor  = String(after.valor);

    if (this.events) {
      this.events.emitTyped(DOMAIN_EVENTS.TRANSACTION_STATUS_CHANGED, {
        tenantId,
        userId,
        aggregateType: 'transaction',
        aggregateId:   after.id,
        payload: {
          transactionId:  after.id,
          tenantId,
          tipo:           after.tipo as string,
          valor,
          previousStatus: before.status as string,
          newStatus:      requestedStatus,
          changedBy:      userId,
        },
      });

      if (PAID_STATUSES.has(requestedStatus)) {
        this.events.emitTyped(DOMAIN_EVENTS.TRANSACTION_PAID, {
          tenantId,
          userId,
          aggregateType: 'transaction',
          aggregateId:   after.id,
          payload: {
            transactionId: after.id,
            tenantId,
            tipo:          after.tipo as string,
            valor,
            contratoId:    after.contrato_id ?? null,
            artistaId:     after.artista_id  ?? null,
            paidBy:        userId,
            paidAt:        nowIso,
          },
        });
      }

      if (CANCELLED_STATUSES.has(requestedStatus)) {
        this.events.emitTyped(DOMAIN_EVENTS.TRANSACTION_CANCELLED, {
          tenantId,
          userId,
          aggregateType: 'transaction',
          aggregateId:   after.id,
          payload: {
            transactionId: after.id,
            tenantId,
            tipo:          after.tipo as string,
            valor,
            cancelledBy:   userId,
            cancelledAt:   nowIso,
          },
        });
      }
    }

    if (this.activityLogs) {
      try {
        await this.activityLogs.create(tenantId, userId, {
          entity_type:  'transaction',
          entity_id:    after.id,
          action:       'status_changed',
          description:  `Transacção ${before.status} → ${requestedStatus}`,
          metadata:     { previousStatus: before.status, newStatus: requestedStatus, valor },
        });
      } catch { /* non-critical */ }
    }
  }
}
