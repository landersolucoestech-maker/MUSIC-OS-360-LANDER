import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../database/database.module';
import { WorkEntity, WorkParticipantEntity } from '../../database/entities';
import { EventsService, DOMAIN_EVENTS } from '../../core/events/events.service';
import type { CreateWorkDto }  from './dto/create-work.dto';
import type { UpdateWorkDto }  from './dto/update-work.dto';
import type { QueryWorkDto }   from './dto/query-work.dto';

export interface ParticipanteResponse {
  id: string;
  nome: string;
  classeFuncao: string;
  link: string | null;
  percentual: string | null;
}

type WorkWithParticipantes = WorkEntity & { participantes: ParticipanteResponse[] };

@Injectable()
export class WorksService {
  private readonly ds: DataSource | null = null;
  private readonly repo: Repository<WorkEntity> | null = null;
  private readonly participantsRepo: Repository<WorkParticipantEntity> | null = null;

  constructor(
    @Inject(DATA_SOURCE) ds: DataSource | null,
    private readonly events: EventsService,
  ) {
    if (ds) {
      this.ds = ds;
      this.repo = ds.getRepository(WorkEntity);
      this.participantsRepo = ds.getRepository(WorkParticipantEntity);
    }
  }

  /**
   * `works.participantes` foi normalizada em `work_participants`
   * (migration WorkParticipantsNormalization20260718000011). Reidrata o
   * array no MESMO formato que o frontend sempre consumiu, para que o
   * contrato de API não mude.
   */
  private async hydrateParticipantes(works: WorkEntity[]): Promise<WorkWithParticipantes[]> {
    if (works.length === 0) return [];
    const ids = works.map((w) => w.id);
    const rows = await this.participantsRepo!
      .createQueryBuilder('p')
      .where('p.work_id IN (:...ids)', { ids })
      .orderBy('p.ordem', 'ASC')
      .getMany();

    const byWork = new Map<string, ParticipanteResponse[]>();
    for (const row of rows) {
      const list = byWork.get(row.work_id) ?? [];
      list.push({
        id: row.id,
        nome: row.nome,
        classeFuncao: row.classe_funcao,
        link: row.link,
        percentual: row.percentual,
      });
      byWork.set(row.work_id, list);
    }

    return works.map((w) => Object.assign(w, { participantes: byWork.get(w.id) ?? [] }));
  }

  private async replaceParticipantes(
    tenantId: string,
    workId: string,
    participantes: unknown[] | undefined,
  ): Promise<void> {
    if (participantes === undefined) return;
    await this.participantsRepo!.delete({ work_id: workId, tenant_id: tenantId });
    const rows = (participantes as Array<Record<string, unknown>>).map((p, index) =>
      this.participantsRepo!.create({
        id: (typeof p.id === 'string' && p.id) || randomUUID(),
        tenant_id: tenantId,
        work_id: workId,
        nome: String(p.nome ?? ''),
        classe_funcao: String(p.classeFuncao ?? 'não_informado'),
        link: (p.link as string) || null,
        percentual: p.percentual != null && p.percentual !== '' ? String(p.percentual) : null,
        ordem: index,
      }),
    );
    if (rows.length > 0) await this.participantsRepo!.save(rows);
  }

  async list(tenantId: string, query: QueryWorkDto) {
    const qb = this.repo!
      .createQueryBuilder('w')
      .where('w.tenant_id = :tenantId', { tenantId })
      .andWhere('w.deleted_at IS NULL');

    if ((query as any).status) qb.andWhere('w.status = :status', { status: (query as any).status });
    if ((query as any).tipo)   qb.andWhere('w.tipo = :tipo',     { tipo:   (query as any).tipo });
    if ((query as any).search) qb.andWhere('w.titulo ILIKE :search', { search: `%${(query as any).search}%` });

    qb.orderBy('w.created_at', (query as any).ascending ? 'ASC' : 'DESC')
      .skip((query as any).offset ?? 0)
      .take((query as any).limit ?? 50);

    const [data, total] = await qb.getManyAndCount();
    const hydrated = await this.hydrateParticipantes(data);
    return { data: hydrated, meta: { total, offset: (query as any).offset ?? 0, limit: (query as any).limit ?? 50 } };
  }

  async findById(tenantId: string, id: string): Promise<WorkWithParticipantes> {
    const result = await this.repo!
      .createQueryBuilder('w')
      .where('w.id = :id AND w.tenant_id = :tenantId AND w.deleted_at IS NULL', { id, tenantId })
      .getOne();
    if (!result) throw new NotFoundException('Obra não encontrada');
    const [hydrated] = await this.hydrateParticipantes([result]);
    return hydrated;
  }

  async create(tenantId: string, userId: string, dto: CreateWorkDto): Promise<WorkWithParticipantes> {
    // works.tipo é NOT NULL; o formulário envia tipo_obra (campo próprio).
    const tipo = dto.tipo ?? dto.tipo_obra ?? 'composicao';
    const { participantes, ...rest } = dto as CreateWorkDto & { participantes?: unknown[] };
    const entity = this.repo!.create({ tenant_id: tenantId, ...(rest as any), tipo, created_by: userId, updated_by: userId });
    const saved = (await this.repo!.save(entity as any)) as WorkEntity;
    await this.replaceParticipantes(tenantId, saved.id, participantes);

    // Dispara automações nativas internas (ex.: catalog-metadata-validator). Os
    // handlers são assíncronos e à prova de falha — nunca revertem a criação da obra.
    this.events.emitTyped(DOMAIN_EVENTS.CATALOG_WORK_CREATED, {
      tenantId,
      userId,
      aggregateType: 'work',
      aggregateId:   saved.id,
      payload: { tenantId, workId: saved.id, createdBy: userId },
    });

    return this.findById(tenantId, saved.id);
  }

  async update(tenantId: string, userId: string, id: string, dto: UpdateWorkDto): Promise<WorkWithParticipantes> {
    await this.findById(tenantId, id);
    const { participantes, ...rest } = dto as UpdateWorkDto & { participantes?: unknown[] };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.repo!.update({ id, tenant_id: tenantId } as any, { ...(rest as any), updated_at: new Date(), updated_by: userId } as any);
    await this.replaceParticipantes(tenantId, id, participantes);
    return this.findById(tenantId, id);
  }

  async softDelete(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.repo!.update({ id, tenant_id: tenantId } as any, { deleted_at: new Date() } as any);
    return { deleted: true };
  }
}
