import { Injectable, Inject, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../database/database.module';
import { PhonogramEntity } from '../../database/entities';
import { EventsService, DOMAIN_EVENTS } from '../../core/events/events.service';
import type { CreatePhonogramDto } from './dto/create-phonogram.dto';
import type { UpdatePhonogramDto } from './dto/update-phonogram.dto';
import type { QueryPhonogramDto }  from './dto/query-phonogram.dto';
import {
  resolvePhonogramAliases,
  resolvePhonogramQueryAliases,
  type ResolvedPhonogramWriteFields,
} from './phonogram-legacy-alias.util';

@Injectable()
export class PhonogramsService {
  private readonly logger = new Logger(PhonogramsService.name);
  private readonly repo: Repository<PhonogramEntity> | null = null;

  constructor(
    @Inject(DATA_SOURCE) ds: DataSource | null,
    private readonly events: EventsService,
  ) {
    if (ds) this.repo = ds.getRepository(PhonogramEntity);
  }

  /** Um warning por alias legado efetivamente recebido nesta requisição. Nunca loga valores. */
  private logLegacyAliasUsage(
    aliases: string[],
    operation: 'create' | 'update' | 'list',
    tenantId: string,
    phonogramId?: string,
  ): void {
    for (const alias of aliases) {
      const suffix = phonogramId ? ` phonogramId=${phonogramId}` : '';
      this.logger.warn(`Phonogram legacy alias used: alias=${alias} operation=${operation} tenantId=${tenantId}${suffix}`);
    }
  }

  async list(tenantId: string, query: QueryPhonogramDto) {
    const q = query as Record<string, unknown>;
    const { normalized: resolvedQuery, legacyAliasesUsed } = resolvePhonogramQueryAliases(q);
    this.logLegacyAliasUsage(legacyAliasesUsed, 'list', tenantId);

    const qb = this.repo!
      .createQueryBuilder('p')
      .where('p.tenant_id = :tenantId', { tenantId })
      .andWhere('p.deleted_at IS NULL');

    if (q['status'])    qb.andWhere('p.status = :status',       { status:    q['status'] });
    if (q['tipo'])      qb.andWhere('p.tipo = :tipo',           { tipo:      q['tipo'] });
    if (resolvedQuery.artista_id) qb.andWhere('p.artista_id = :artistaId', { artistaId: resolvedQuery.artista_id });
    if (resolvedQuery.obra_id)    qb.andWhere('p.obra_id = :obraId',      { obraId:    resolvedQuery.obra_id });
    if (q['genero_musical'] || q['genre']) {
      qb.andWhere('p.genero_musical = :genre', { genre: q['genero_musical'] ?? q['genre'] });
    }
    if (q['search'])    qb.andWhere('p.titulo ILIKE :search',   { search: `%${q['search']}%` });

    qb.orderBy('p.created_at', q['ascending'] ? 'ASC' : 'DESC')
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

  async findById(tenantId: string, id: string): Promise<PhonogramEntity> {
    const result = await this.repo!
      .createQueryBuilder('p')
      .where('p.id = :id AND p.tenant_id = :tenantId AND p.deleted_at IS NULL', { id, tenantId })
      .getOne();
    if (!result) throw new NotFoundException('Fonograma não encontrado');
    return result;
  }

  /**
   * Monta o payload final para persistência a partir dos campos canônicos já
   * resolvidos (titulo/obra_id/artista_id — ver resolvePhonogramAliases()) e
   * dos demais campos não relacionados a aliases (21 campos físicos do
   * formulário, duration/duracao, metadata, status, ISRC etc.), que
   * continuam passando direto para a entity, inalterados.
   */
  private buildEntityPayload(
    input: Record<string, unknown>,
    resolved: ResolvedPhonogramWriteFields,
  ): Record<string, unknown> {
    const out: Record<string, unknown> = { ...input, ...resolved };

    // duration/duracao: fora do escopo do C2 (C2.2) — comportamento inalterado.
    out['duration_seconds'] = input['duration_seconds'] ?? input['duration'];
    // tipo: default apenas quando explicitamente ausente no CREATE (ver create());
    // num PATCH sem tipo, não sobrescrever o valor persistido.
    if (input['tipo'] !== undefined) out['tipo'] = input['tipo'];

    delete out['title'];
    delete out['workId'];
    delete out['artistId'];
    delete out['duration'];
    delete out['fileUrl'];

    // Remove null/undefined — preserva a semântica atual de PATCH (null não
    // limpa coluna nesta fase; ver dívida C2.4).
    Object.keys(out).forEach((key) => (out[key] === undefined || out[key] === null) && delete out[key]);
    return out;
  }

  async create(tenantId: string, userId: string, dto: CreatePhonogramDto): Promise<PhonogramEntity> {
    const input = dto as unknown as Record<string, unknown>;
    const { normalized: resolved, legacyAliasesUsed } = resolvePhonogramAliases(input);

    if (resolved.titulo === undefined) {
      throw new BadRequestException({
        code: 'PHONOGRAM_TITLE_REQUIRED',
        message: 'titulo é obrigatório.',
        fields: [{ canonical: 'titulo', legacy: 'title' }],
      });
    }
    this.logLegacyAliasUsage(legacyAliasesUsed, 'create', tenantId);

    const normalized = this.buildEntityPayload(input, resolved);
    const entity = this.repo!.create({
      tenant_id: tenantId,
      tipo: 'master',
      ...normalized,
      created_by: userId,
      updated_by: userId,
    } as Partial<PhonogramEntity>);
    const saved = (await this.repo!.save(entity as PhonogramEntity)) as PhonogramEntity;

    // Dispara automações nativas internas (ex.: catalog-metadata-validator). Os
    // handlers são assíncronos e à prova de falha — nunca revertem a criação do fonograma.
    this.events.emitTyped(DOMAIN_EVENTS.CATALOG_RECORDING_CREATED, {
      tenantId,
      userId,
      aggregateType: 'recording',
      aggregateId:   saved.id,
      payload: { tenantId, recordingId: saved.id, createdBy: userId },
    });

    return saved;
  }

  async update(tenantId: string, userId: string, id: string, dto: UpdatePhonogramDto): Promise<PhonogramEntity> {
    await this.findById(tenantId, id);
    const input = dto as unknown as Record<string, unknown>;
    const { normalized: resolved, legacyAliasesUsed } = resolvePhonogramAliases(input);
    // update: ausência de título é válida (PATCH parcial); se enviado, o
    // próprio resolvePhonogramAliases() já garantiu conteúdo/conflito válidos.
    this.logLegacyAliasUsage(legacyAliasesUsed, 'update', tenantId, id);

    const normalized = this.buildEntityPayload(input, resolved);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.repo!.update({ id, tenant_id: tenantId } as any, { ...normalized, updated_at: new Date(), updated_by: userId } as any);
    return this.findById(tenantId, id);
  }

  async softDelete(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.repo!.update({ id, tenant_id: tenantId } as any, { deleted_at: new Date() } as any);
    return { deleted: true };
  }
}
