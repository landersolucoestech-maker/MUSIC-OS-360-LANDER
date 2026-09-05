import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../database/database.module';
import { ShareEntity } from '../../database/entities';
import { casUpdate } from '../../common/persistence/optimistic-update.util';
import { assertSameTenantFk } from '../../common/persistence/assert-same-tenant-fk.util';
import { assertSplitBudgetNotExceeded } from './share-split-invariant.util';
import type { CreateShareDto, UpdateShareDto, QueryShareDto } from './dto/shares.dto';

@Injectable()
export class SharesService {
  private readonly repo: Repository<ShareEntity> | null = null;
  private readonly ds: DataSource | null;

  constructor(@Inject(DATA_SOURCE) ds: DataSource | null) {
    if (ds) this.repo = ds.getRepository(ShareEntity);
    this.ds = ds;
  }

  private baseQb(tenantId: string, query: QueryShareDto) {
    const q = query as Record<string, unknown>;
    const qb = this.repo!
      .createQueryBuilder('s')
      .where('s.tenant_id = :tenantId', { tenantId })
      .andWhere('s.deleted_at IS NULL');

    if (q['work_id'])      qb.andWhere('s.work_id = :workId',           { workId:      q['work_id'] });
    if (q['fonograma_id']) qb.andWhere('s.fonograma_id = :fonogramaId', { fonogramaId: q['fonograma_id'] });
    if (q['papel'])        qb.andWhere('s.papel = :papel',              { papel:       q['papel'] });
    if (q['direcao'])      qb.andWhere('s.direcao = :direcao',          { direcao:     q['direcao'] });
    if (q['status'])       qb.andWhere('s.status = :status',            { status:      q['status'] });
    if (q['tipo'])         qb.andWhere('s.tipo = :tipo',                { tipo:        q['tipo'] });
    if (q['share_type'])   qb.andWhere('s.share_type = :shareType',     { shareType:   q['share_type'] });
    if (q['search']) {
      qb.andWhere('(s.nome_musica ILIKE :search OR s.detentor ILIKE :search)', { search: `%${q['search']}%` });
    }

    return qb;
  }

  async list(tenantId: string, query: QueryShareDto) {
    const q = query as Record<string, unknown>;
    const qb = this.baseQb(tenantId, query);

    qb.orderBy('s.created_at', q['ascending'] ? 'ASC' : 'DESC')
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

  /** Distribuição exata direção×status (tenant inteiro) — os 4 baldes de KPI vêm daqui. */
  async stats(tenantId: string, query: QueryShareDto): Promise<Array<{ direcao: string | null; status: string; cnt: number }>> {
    const qb = this.baseQb(tenantId, query);
    qb.select('s.direcao', 'direcao')
      .addSelect('s.status', 'status')
      .addSelect('COUNT(*)::int', 'cnt')
      .groupBy('s.direcao')
      .addGroupBy('s.status');
    const rows = await qb.getRawMany<{ direcao: string | null; status: string; cnt: string }>();
    return rows.map((r) => ({ direcao: r.direcao, status: r.status, cnt: parseInt(r.cnt, 10) || 0 }));
  }

  async findById(tenantId: string, id: string): Promise<ShareEntity> {
    const result = await this.repo!
      .createQueryBuilder('s')
      .where('s.id = :id AND s.tenant_id = :tenantId AND s.deleted_at IS NULL', { id, tenantId })
      .getOne();
    if (!result) throw new NotFoundException('Participação não encontrada');
    return result;
  }

  /**
   * Chaves do formulário persistem 1:1 nas suas colunas (regra 2026-07-12).
   * Aliases EN legados (holderName/role/percentage/workId/trackId/holderDoc)
   * são mapeados para as colunas físicas legadas; as NOT NULL (titular_nome,
   * percentual) são espelhadas a partir dos campos do formulário.
   */
  private toColumns(dto: CreateShareDto | UpdateShareDto): Record<string, unknown> {
    const d = dto as Record<string, unknown>;
    const out: Record<string, unknown> = { ...d };
    // Aliases EN → colunas legadas (nunca sobrescrevem campos do form)
    if (d['holderName'] !== undefined) out['titular_nome'] = d['holderName'];
    if (d['holderDoc']  !== undefined) out['titular_doc']  = d['holderDoc'];
    if (d['role']       !== undefined) out['papel']        = d['role'];
    if (d['percentage'] !== undefined) out['percentual']   = d['percentage'];
    if (d['workId']     !== undefined) out['work_id']      = d['workId'];
    if (d['trackId']    !== undefined) out['fonograma_id'] = d['trackId'];
    for (const k of ['holderName', 'holderDoc', 'role', 'percentage', 'workId', 'trackId', 'expectedUpdatedAt']) delete out[k];
    Object.keys(out).forEach((k) => out[k] === undefined && delete out[k]);
    return out;
  }

  /**
   * Sum of registry-eligible (share_type IS NULL, non-deleted) shares'
   * percentual for the same work/phonogram — same eligibility predicate
   * WorkRegistryValidationService uses (REGISTRY_ELIGIBLE_SHARE_SQL), so
   * this never diverges from what the final "must equal 100%"
   * registry-submission check considers.
   */
  private async sumEligiblePercentual(
    tenantId: string, workId: string | null, fonogramaId: string | null, excludeId?: string,
  ): Promise<number> {
    if (!workId && !fonogramaId) return 0;
    const qb = this.repo!
      .createQueryBuilder('s')
      .select('COALESCE(SUM(s.percentual), 0)', 'sum')
      .where('s.tenant_id = :tenantId', { tenantId })
      .andWhere('s.deleted_at IS NULL')
      .andWhere('s.share_type IS NULL');
    if (workId)      qb.andWhere('s.work_id = :workId', { workId });
    if (fonogramaId) qb.andWhere('s.fonograma_id = :fonogramaId', { fonogramaId });
    if (excludeId)   qb.andWhere('s.id != :excludeId', { excludeId });
    const row = await qb.getRawOne<{ sum: string }>();
    return Number(row?.sum ?? 0);
  }

  /**
   * Only registry-eligible shares (share_type IS NULL) are gated — financial/
   * pending shares (share_type set) are a distinct concept (Fase 5 / C6) and
   * were never part of the "splits must not exceed 100%" invariant.
   */
  private async assertSplitBudget(
    tenantId: string, cols: Record<string, unknown>, excludeId?: string,
  ): Promise<void> {
    const isEligible = cols['share_type'] === undefined || cols['share_type'] === null;
    if (!isEligible || cols['percentual'] == null) return;

    const workId      = (cols['work_id'] as string | undefined) ?? null;
    const fonogramaId = (cols['fonograma_id'] as string | undefined) ?? null;
    if (!workId && !fonogramaId) return;

    const percentual = Number(cols['percentual']);
    const existingSum = await this.sumEligiblePercentual(tenantId, workId, fonogramaId, excludeId);
    assertSplitBudgetNotExceeded(existingSum, percentual, workId ? `obra ${workId}` : `fonograma ${fonogramaId}`);
  }

  async create(tenantId: string, dto: CreateShareDto): Promise<ShareEntity> {
    // titular_nome/percentual (campos de titularidade — usados na submissão
    // ABRAMUS/ECAD) só recebem valor quando o chamador envia holderName/
    // percentage explicitamente. Nunca são derivados de detentor/
    // artista_externo/pagador/destinatario (campos do share financeiro —
    // conceito distinto, ver Fase 5 / C6) nem preenchidos com default artificial.
    const cols = this.toColumns(dto);
    await assertSameTenantFk(this.ds!, 'works',      cols['work_id']      as string | undefined, tenantId, 'Obra');
    await assertSameTenantFk(this.ds!, 'phonograms', cols['fonograma_id'] as string | undefined, tenantId, 'Fonograma');
    await this.assertSplitBudget(tenantId, cols);
    const entity = this.repo!.create({ tenant_id: tenantId, ...cols } as any);
    return this.repo!.save(entity as any) as any;
  }

  async update(tenantId: string, id: string, dto: UpdateShareDto): Promise<ShareEntity> {
    const current = await this.findById(tenantId, id);
    const cols = this.toColumns(dto);
    // Merge with the current row so an update that omits work_id/fonograma_id/
    // share_type (unchanged) still validates against the right scope.
    await this.assertSplitBudget(tenantId, {
      share_type:   cols['share_type']   !== undefined ? cols['share_type']   : current.share_type,
      work_id:      cols['work_id']      !== undefined ? cols['work_id']      : current.work_id,
      fonograma_id: cols['fonograma_id'] !== undefined ? cols['fonograma_id'] : current.fonograma_id,
      percentual:   cols['percentual']   !== undefined ? cols['percentual']   : current.percentual,
    }, id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await casUpdate(
      this.repo!,
      { id, tenant_id: tenantId } as any,
      { ...cols, updated_at: new Date() } as any,
      dto.expectedUpdatedAt,
      'Esta participação (share) foi alterada por outro usuário desde que você a carregou. Recarregue e tente novamente.',
    );
    return this.findById(tenantId, id);
  }

  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.repo!.update({ id, tenant_id: tenantId } as any, { deleted_at: new Date() } as any);
    return { deleted: true };
  }
}
