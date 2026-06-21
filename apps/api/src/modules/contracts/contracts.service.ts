import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DataSource, Repository, FindOptionsWhere } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { DATA_SOURCE } from '../../database/database.module';
import { ContractEntity, ArtistEntity, ClientEntity } from '../../database/entities';
import type { CreateContractDto } from './dto/create-contract.dto';
import type { UpdateContractDto } from './dto/update-contract.dto';
import type { QueryContractDto }  from './dto/query-contract.dto';
import { ContractStatus } from '@music-os-360/types';
import { WorkflowService } from '../../core/workflow/workflow.service';
import { EventsService, DOMAIN_EVENTS } from '../../core/events/events.service';
import { PlanLimitService } from '../../core/billing/plan-limit.service';


@Injectable()
export class ContractsService {
  private readonly ds:   DataSource | null = null;
  private readonly repo: Repository<ContractEntity> | null = null;

  constructor(
    @Inject(DATA_SOURCE) ds: DataSource | null,
    private readonly workflowService: WorkflowService,
    private readonly events: EventsService,
    private readonly planLimit: PlanLimitService,
  ) {
    if (ds) {
      this.ds   = ds;
      this.repo = ds.getRepository(ContractEntity);
    }
  }

  async list(tenantId: string, query: QueryContractDto) {
    const q = query as Record<string, unknown>;
    const qb = this.repo!
      .createQueryBuilder('c')
      .leftJoinAndMapOne(
        'c.artistas',
        ArtistEntity,
        'artistas',
        'artistas.id = c.artista_id AND artistas.tenant_id = c.tenant_id AND artistas.deleted_at IS NULL',
      )
      .leftJoinAndMapOne(
        'c.clientes',
        ClientEntity,
        'clientes',
        'clientes.id = c.cliente_id AND clientes.tenant_id = c.tenant_id AND clientes.deleted_at IS NULL',
      )
      .where('c.tenant_id = :tenantId', { tenantId })
      .andWhere('c.deleted_at IS NULL');

    if (q['status'])     qb.andWhere('c.status = :status',        { status:    q['status'] });
    if (q['tipo'])       qb.andWhere('c.tipo = :tipo',            { tipo:      q['tipo'] });
    if (q['artista_id']) qb.andWhere('c.artista_id = :artistaId', { artistaId: q['artista_id'] });
    if (q['search'])     qb.andWhere('c.titulo ILIKE :search',    { search: `%${q['search']}%` });

    qb.orderBy('c.created_at', q['ascending'] ? 'ASC' : 'DESC')
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
  ): Promise<ContractEntity & { allowed_transitions: { to: string; label?: string }[] }> {
    const result = await this.repo!
      .createQueryBuilder('c')
      .leftJoinAndMapOne(
        'c.artistas',
        ArtistEntity,
        'artistas',
        'artistas.id = c.artista_id AND artistas.tenant_id = c.tenant_id AND artistas.deleted_at IS NULL',
      )
      .leftJoinAndMapOne(
        'c.clientes',
        ClientEntity,
        'clientes',
        'clientes.id = c.cliente_id AND clientes.tenant_id = c.tenant_id AND clientes.deleted_at IS NULL',
      )
      .where('c.id = :id AND c.tenant_id = :tenantId AND c.deleted_at IS NULL', { id, tenantId })
      .getOne();
    if (!result) throw new NotFoundException('Contrato não encontrado');
    const allowed_transitions = this.workflowService.getAllowedTransitions('contract', result.status, actorRole);
    return { ...result, allowed_transitions };
  }

  /**
   * Normaliza DTO: aceita tanto camelCase EN quanto snake_case pt-BR.
   * Mapeia tudo para o formato pt-BR esperado pela ContractEntity.
   * Strip de campos auxiliares do frontend que não pertencem à entity
   * (ex: `signers` vai para metadata).
   */
  private normalizeContractDto(dto: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};

    // pt-BR vence sobre EN se ambos estiverem presentes
    out.titulo        = dto['titulo']        ?? dto['title']      ?? null;
    out.tipo          = dto['tipo']          ?? dto['type']       ?? null;
    out.artista_id    = dto['artista_id']    ?? dto['artistId']   ?? null;
    out.cliente_id    = dto['cliente_id']    ?? null;
    out.lancamento_id = dto['lancamento_id'] ?? null;
    out.data_inicio   = dto['data_inicio']   ?? dto['startsAt']   ?? null;
    out.data_fim      = dto['data_fim']      ?? dto['expiresAt']  ?? null;
    out.exclusivo     = dto['exclusivo']     ?? false;
    out.observacoes   = dto['observacoes']   ?? null;
    out.arquivo_url   = dto['arquivo_url']   ?? dto['fileUrl']    ?? null;
    out.autentique_doc_id = dto['autentique_doc_id'] ?? null;
    out.signing_platform  = dto['signing_platform']  ?? null;
    out.versoes       = (dto['versoes'] as unknown[] | undefined) ?? [];

    // valor: aceita number ou IsNumberString
    const valorRaw = dto['valor'] ?? dto['value'];
    if (valorRaw != null) {
      const n = typeof valorRaw === 'number' ? valorRaw : Number(valorRaw);
      out.valor = Number.isFinite(n) ? String(n) : null;
    }

    // signers + parties + extras → metadata
    const metaIn = (dto['metadata'] as Record<string, unknown> | undefined) ?? {};
    const meta: Record<string, unknown> = { ...metaIn };
    if (Array.isArray(dto['signers']))  meta['signers']  = dto['signers'];
    if (Array.isArray(dto['parties']))  meta['parties']  = dto['parties'];
    if (dto['currency'])                meta['currency'] = dto['currency'];
    if (dto['signedAt'])                meta['signed_at'] = dto['signedAt'];
    if (Object.keys(meta).length > 0)   out.metadata = meta;

    // Remove nulls/empties para não sobrescrever defaults da entity sem necessidade
    return Object.fromEntries(Object.entries(out).filter(([, v]) => v !== null && v !== undefined));
  }

  async create(tenantId: string, userId: string, dto: CreateContractDto, orgId?: string): Promise<ContractEntity> {
    await this.planLimit.enforce(tenantId, orgId ?? tenantId, 'contracts');
    const { status: _ignoredStatus, ...rest } = dto as unknown as Record<string, unknown>;
    void _ignoredStatus;
    const normalized = this.normalizeContractDto(rest);
    const entity = this.repo!.create({
      tenant_id:  tenantId,
      ...normalized,
      status:     ContractStatus.RASCUNHO,
      created_by: userId,
      updated_by: userId,
    } as Partial<ContractEntity>);
    const saved = await this.repo!.save(entity as ContractEntity);

    this.events.emitTyped(DOMAIN_EVENTS.CONTRACT_CREATED, {
      tenantId,
      userId,
      aggregateType: 'contract',
      aggregateId:   saved.id,
      payload: {
        contractId: saved.id,
        tenantId,
        titulo:     saved.titulo ?? (normalized['titulo'] as string) ?? '',
        tipo:       saved.tipo   ?? (normalized['tipo']   as string) ?? '',
        artistId:   saved.artista_id ?? null,
        createdBy:  userId,
      },
    });

    return saved;
  }

  async update(
    tenantId: string,
    userId: string,
    id: string,
    dto: UpdateContractDto,
    actorRole?: string,
  ): Promise<ContractEntity & { allowed_transitions: { to: string; label?: string }[] }> {
    const current = await this.findById(tenantId, id, actorRole);
    const dtoMap  = dto as Record<string, unknown>;
    const statusChanging = dtoMap['status'] != null && dtoMap['status'] !== current.status;

    const { status: _s, ...restFields } = dtoMap;
    void _s;
    const normalized = this.normalizeContractDto(restFields);

    const nonStatusUpdates: Record<string, unknown> = {
      updated_at: new Date(),
      updated_by: userId,
      ...normalized,
    };

    if (statusChanging) {
      const req = {
        entityType: 'contract' as const,
        entityId:   id,
        tenantId,
        actorId:    userId,
        actorRole,
        fromStatus: current.status,
        toStatus:   dtoMap['status'] as string,
        entity:     current as unknown as Record<string, unknown>,
      };
      await this.ds!.transaction(async (em) => {
        await this.workflowService.transitionInTx(req, em);
        await em.update(ContractEntity, { id, tenant_id: tenantId }, {
          ...nonStatusUpdates,
          status: dtoMap['status'] as ContractStatus,
        });
      });

      const nowIso = new Date().toISOString();

      // WORKFLOW_TRANSITIONED for all contract status changes
      this.events.emitTyped(DOMAIN_EVENTS.WORKFLOW_TRANSITIONED, {
        tenantId,
        userId,
        aggregateType: 'contract',
        aggregateId:   id,
        payload: {
          entityType:     'contract',
          entityId:       id,
          tenantId,
          fromStatus:     current.status,
          toStatus:       dtoMap['status'] as string,
          actorId:        userId,
          actorRole,
          reason:         null,
          transitionedAt: nowIso,
        },
      });

      // CONTRACT_SIGNED when transitioning to assinado
      if (dtoMap['status'] === ContractStatus.ASSINADO) {
        this.events.emitTyped(DOMAIN_EVENTS.CONTRACT_SIGNED, {
          tenantId,
          userId,
          aggregateType: 'contract',
          aggregateId:   id,
          payload: {
            contractId: id,
            tenantId,
            titulo:     current.titulo,
            artistId:   current.artista_id,
            signedBy:   userId,
            signedAt:   nowIso,
          },
        });
      }

      // CONTRACT_EXPIRED when transitioning to vencido
      if (dtoMap['status'] === ContractStatus.VENCIDO) {
        this.events.emitTyped(DOMAIN_EVENTS.CONTRACT_EXPIRED, {
          tenantId,
          userId,
          aggregateType: 'contract',
          aggregateId:   id,
          payload: {
            contractId: id,
            tenantId,
            titulo:     current.titulo,
            artistId:   current.artista_id,
            expiredAt:  nowIso,
          },
        });
      }

      // CONTRACT_CANCELLED when transitioning to cancelado
      if (dtoMap['status'] === ContractStatus.CANCELADO) {
        this.events.emitTyped(DOMAIN_EVENTS.CONTRACT_CANCELLED, {
          tenantId,
          userId,
          aggregateType: 'contract',
          aggregateId:   id,
          payload: {
            contractId:  id,
            tenantId,
            titulo:      current.titulo,
            artistId:    current.artista_id,
            cancelledBy: userId,
            cancelledAt: nowIso,
          },
        });
      }

      // Generic CONTRACT_STATUS_CHANGED for all transitions (activity log, analytics)
      this.events.emitTyped(DOMAIN_EVENTS.CONTRACT_STATUS_CHANGED, {
        tenantId,
        userId,
        aggregateType: 'contract',
        aggregateId:   id,
        payload: {
          contractId:     id,
          tenantId,
          titulo:         current.titulo,
          previousStatus: current.status,
          newStatus:      dtoMap['status'] as string,
          changedBy:      userId,
        },
      });
    } else {
      await this.repo!.update(
        { id, tenant_id: tenantId } as FindOptionsWhere<ContractEntity>,
        nonStatusUpdates as QueryDeepPartialEntity<ContractEntity>,
      );
    }

    return this.findById(tenantId, id, actorRole);
  }

  async softDelete(tenantId: string, userId: string, id: string) {
    const existing = await this.findById(tenantId, id);
    await this.repo!.update(
      { id, tenant_id: tenantId } as FindOptionsWhere<ContractEntity>,
      { deleted_at: new Date(), updated_by: userId } as QueryDeepPartialEntity<ContractEntity>,
    );

    this.events.emitTyped(DOMAIN_EVENTS.CONTRACT_CANCELLED, {
      tenantId,
      userId,
      aggregateType: 'contract',
      aggregateId:   id,
      payload: {
        contractId:  id,
        tenantId,
        titulo:      existing.titulo,
        artistId:    existing.artista_id,
        cancelledBy: userId,
        cancelledAt: new Date().toISOString(),
      },
    });

    return { deleted: true };
  }
}
