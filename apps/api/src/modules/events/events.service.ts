import { Injectable, Inject, NotFoundException, Optional } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../database/database.module';
import { EventEntity } from '../../database/entities';
import type { CreateEventDto, UpdateEventDto, QueryEventDto } from './dto/events.dto';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';

@Injectable()
export class EventsService {
  private readonly repo: Repository<EventEntity> | null = null;

  constructor(
    @Inject(DATA_SOURCE) ds: DataSource | null,
    @Optional() private readonly activityLogs?: ActivityLogsService,
  ) {
    if (ds) this.repo = ds.getRepository(EventEntity);
  }

  async list(tenantId: string, query: QueryEventDto) {
    const qb = this.repo!
      .createQueryBuilder('e')
      .where('e.tenant_id = :tenantId', { tenantId })
      .andWhere('e.deleted_at IS NULL');

    if ((query as any).status)     qb.andWhere('e.status = :status',       { status:     (query as any).status });
    if ((query as any).tipo)       qb.andWhere('e.tipo = :tipo',           { tipo:       (query as any).tipo });
    if ((query as any).artista_id) qb.andWhere('e.artista_id = :artistaId', { artistaId: (query as any).artista_id });
    if ((query as any).dateFrom)   qb.andWhere('e.data >= :dateFrom',      { dateFrom:   (query as any).dateFrom });
    if ((query as any).dateTo)     qb.andWhere('e.data <= :dateTo',        { dateTo:     (query as any).dateTo });
    if ((query as any).search)     qb.andWhere('e.titulo ILIKE :search',   { search: `%${(query as any).search}%` });

    qb.orderBy('e.data', (query as any).ascending ? 'ASC' : 'DESC')
      .skip((query as any).offset ?? 0)
      .take((query as any).limit ?? 50);

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, offset: (query as any).offset ?? 0, limit: (query as any).limit ?? 50 } };
  }

  async findById(tenantId: string, id: string): Promise<EventEntity> {
    const result = await this.repo!
      .createQueryBuilder('e')
      .where('e.id = :id AND e.tenant_id = :tenantId AND e.deleted_at IS NULL', { id, tenantId })
      .getOne();
    if (!result) throw new NotFoundException('Evento não encontrado');
    return result;
  }

  /**
   * Maps CreateEventDto / UpdateEventDto (camelCase EN) → EventEntity columns (snake_case PT).
   * Backend DTO usa title/type/startsAt/venue/artistId; tabela usa titulo/tipo/data/local/artista_id.
   */
  private dtoToEntity(dto: Partial<CreateEventDto & UpdateEventDto>): Partial<EventEntity> {
    const d = dto as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    if (d['title']     != null) out['titulo']     = d['title'];
    if (d['type']      != null) out['tipo']       = d['type'];
    if (d['artistId']  != null) out['artista_id'] = d['artistId'];
    if (d['venue']     != null) out['local']      = d['venue'];
    if (d['startsAt']  != null) {
      // C3/E2 — dual-write: o MESMO objeto Date alimenta a coluna legada `data`
      // e a canônica futura `starts_at` (zero janela de divergência; leitura
      // canônica só na fase E4, remoção de `data` só na E6).
      const startValue = new Date(d['startsAt'] as string | Date);
      out['data']      = startValue;
      out['starts_at'] = startValue;
    }
    if (d['endsAt']    != null) out['data_fim']   = new Date(d['endsAt'] as string | Date);
    if (d['status']    != null) out['status']     = d['status'];
    if (d['metadata']  != null) out['metadata']   = d['metadata'];
    // Campos do formulário (regra 2026-07-12: coluna própria, sem metadata)
    if (d['endereco']         != null) out['endereco']         = d['endereco'];
    if (d['contato_local']    != null) out['contato_local']    = d['contato_local'];
    if (d['valor_cache']      != null) out['valor_cache']      = String(d['valor_cache']);
    if (d['publico_esperado'] != null) out['publico_esperado'] = d['publico_esperado'];
    if (d['descricao']        != null) out['descricao']        = d['descricao'];
    if (d['participantes']    != null) out['participantes']    = d['participantes'];
    return out as Partial<EventEntity>;
  }

  async create(tenantId: string, userId: string, dto: CreateEventDto): Promise<EventEntity> {
    const mapped = this.dtoToEntity(dto);
    if (!mapped.data) {
      // Coluna NOT NULL — usa "agora" como fallback seguro se startsAt não veio.
      // C3/E2 — dual-write: o mesmo instante alimenta `data` e `starts_at`
      // (uma única chamada a new Date(); duas chamadas poderiam divergir em ms).
      const fallbackValue = new Date();
      mapped.data = fallbackValue;
      mapped.starts_at = fallbackValue;
    }
    const entity = this.repo!.create({
      tenant_id:  tenantId,
      ...mapped,
      created_by: userId,
      updated_by: userId,
    } as Partial<EventEntity>);
    const saved = await this.repo!.save(entity as EventEntity);
    await this.recordActivity(tenantId, userId, saved.id, 'created', `Evento "${saved.titulo}" criado`, {
      titulo: saved.titulo,
      tipo: saved.tipo,
      artistaId: saved.artista_id,
      data: saved.data,
    });
    return saved;
  }

  async update(tenantId: string, userId: string, id: string, dto: UpdateEventDto): Promise<EventEntity> {
    await this.findById(tenantId, id);
    const mapped = this.dtoToEntity(dto);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.repo!.update({ id, tenant_id: tenantId } as any, { ...mapped, updated_at: new Date(), updated_by: userId } as any);
    return this.findById(tenantId, id);
  }

  async softDelete(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.repo!.update({ id, tenant_id: tenantId } as any, { deleted_at: new Date() } as any);
    return { deleted: true };
  }

  private async recordActivity(
    tenantId: string,
    userId: string,
    entityId: string,
    action: string,
    description: string,
    metadata: Record<string, unknown>,
  ) {
    if (!this.activityLogs) return;
    try {
      await this.activityLogs.create(tenantId, userId || 'system', {
        entity_type: 'event',
        entity_id:   entityId,
        action,
        description,
        metadata,
      });
    } catch {
      // Activity feed failures are detected by runtime validation but must not corrupt CRUD persistence.
    }
  }
}
