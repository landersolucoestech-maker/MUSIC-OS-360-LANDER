import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../database/database.module';
import {
  PipelineEntity, PipelineStageEntity, PipelineOpportunityEntity,
} from '../../database/entities';
import { EventsService, DOMAIN_EVENTS } from '../../core/events/events.service';
import { WsGateway } from '../../core/websocket/ws.gateway';
import type {
  CreatePipelineDto, UpdatePipelineDto,
  CreateStageDto, UpdateStageDto,
  CreateOpportunityDto, UpdateOpportunityDto, MoveOpportunityDto, QueryOpportunityDto,
} from './dto/pipelines.dto';

@Injectable()
export class PipelinesService {
  private readonly logger = new Logger(PipelinesService.name);
  private pipelines!:     Repository<PipelineEntity>;
  private stages!:        Repository<PipelineStageEntity>;
  private opportunities!: Repository<PipelineOpportunityEntity>;

  constructor(
    @Inject(DATA_SOURCE) private readonly ds: DataSource | null,
    private readonly events: EventsService,
    private readonly ws: WsGateway,
  ) {
    if (ds) {
      this.pipelines     = ds.getRepository(PipelineEntity);
      this.stages        = ds.getRepository(PipelineStageEntity);
      this.opportunities = ds.getRepository(PipelineOpportunityEntity);
    }
  }

  // ── Pipeline CRUD ──────────────────────────────────────────────────────────

  async listPipelines(tenantId: string) {
    return this.pipelines.find({
      where: { tenant_id: tenantId },
      relations: ['stages'],
      order: { created_at: 'ASC' },
    });
  }

  async findPipelineById(tenantId: string, id: string) {
    const p = await this.pipelines.findOne({
      where: { id, tenant_id: tenantId },
      relations: ['stages'],
    });
    if (!p || p.deleted_at) throw new NotFoundException('Pipeline não encontrado');
    p.stages.sort((a, b) => a.position - b.position);
    return p;
  }

  async createPipeline(tenantId: string, userId: string, dto: CreatePipelineDto) {
    return this.pipelines.save(this.pipelines.create({
      tenant_id:   tenantId,
      created_by:  userId,
      ...dto,
    }));
  }

  async updatePipeline(tenantId: string, id: string, dto: UpdatePipelineDto) {
    await this.findPipelineById(tenantId, id);
    await this.pipelines.update({ id, tenant_id: tenantId }, { ...dto, updated_at: new Date() });
    return this.findPipelineById(tenantId, id);
  }

  async deletePipeline(tenantId: string, id: string) {
    await this.findPipelineById(tenantId, id);
    await this.pipelines.update({ id, tenant_id: tenantId }, { deleted_at: new Date() });
    return { deleted: true };
  }

  // ── Stage CRUD ─────────────────────────────────────────────────────────────

  async listStages(tenantId: string, pipelineId: string) {
    await this.findPipelineById(tenantId, pipelineId);
    return this.stages.find({
      where: { tenant_id: tenantId, pipeline_id: pipelineId },
      order: { position: 'ASC' },
    });
  }

  async createStage(tenantId: string, pipelineId: string, dto: CreateStageDto) {
    await this.findPipelineById(tenantId, pipelineId);
    // Auto-assign position if not given
    if (dto.position === undefined) {
      const count = await this.stages.count({ where: { pipeline_id: pipelineId } });
      dto.position = count;
    }
    const { win_probability, ...rest } = dto;
    return this.stages.save(this.stages.create({
      tenant_id:        tenantId,
      pipeline_id:      pipelineId,
      ...rest,
      win_probability:  win_probability != null ? win_probability.toString() : null,
    }));
  }

  async updateStage(tenantId: string, pipelineId: string, stageId: string, dto: UpdateStageDto) {
    const stage = await this.stages.findOne({ where: { id: stageId, pipeline_id: pipelineId, tenant_id: tenantId } });
    if (!stage) throw new NotFoundException('Estágio não encontrado');
    const { win_probability, ...rest } = dto;
    const updates: Record<string, unknown> = { ...rest, updated_at: new Date() };
    if (win_probability != null) updates['win_probability'] = win_probability.toString();
    await this.stages.update({ id: stageId }, updates as Parameters<typeof this.stages.update>[1]);
    return this.stages.findOne({ where: { id: stageId } });
  }

  async deleteStage(tenantId: string, pipelineId: string, stageId: string) {
    const stage = await this.stages.findOne({ where: { id: stageId, pipeline_id: pipelineId, tenant_id: tenantId } });
    if (!stage) throw new NotFoundException('Estágio não encontrado');
    await this.stages.delete({ id: stageId });
    return { deleted: true };
  }

  // ── Opportunity CRUD ───────────────────────────────────────────────────────

  async listOpportunities(tenantId: string, pipelineId: string, q: QueryOpportunityDto) {
    const qb = this.opportunities.createQueryBuilder('o')
      .where('o.tenant_id = :tenantId AND o.pipeline_id = :pipelineId AND o.deleted_at IS NULL', { tenantId, pipelineId });
    if (q.stage_id)    qb.andWhere('o.stage_id = :sid',      { sid: q.stage_id });
    if (q.status)      qb.andWhere('o.status = :st',         { st: q.status });
    if (q.assigned_to) qb.andWhere('o.assigned_to = :at',    { at: q.assigned_to });
    if (q.search)      qb.andWhere('o.title ILIKE :s',       { s: `%${q.search}%` });
    qb.orderBy('o.created_at', 'DESC').skip(q.offset ?? 0).take(q.limit ?? 50);
    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, offset: q.offset ?? 0, limit: q.limit ?? 50 } };
  }

  async findOpportunityById(tenantId: string, id: string) {
    const o = await this.opportunities.findOne({ where: { id, tenant_id: tenantId } });
    if (!o || o.deleted_at) throw new NotFoundException('Oportunidade não encontrada');
    return o;
  }

  async createOpportunity(tenantId: string, pipelineId: string, userId: string, dto: CreateOpportunityDto) {
    await this.findPipelineById(tenantId, pipelineId);
    const slaDate = await this.computeSlaDate(dto.stage_id);
    const entity = this.opportunities.create({
      tenant_id:           tenantId,
      pipeline_id:         pipelineId,
      created_by:          userId,
      updated_by:          userId,
      ...dto,
      value:               dto.value?.toString() ?? null,
      probability:         dto.probability?.toString() ?? null,
      expected_close_date: dto.expected_close_date ? new Date(dto.expected_close_date) : null,
      sla_due_at:          slaDate,
      stage_history:       dto.stage_id ? [{ stage_id: dto.stage_id, entered_at: new Date().toISOString(), actor_id: userId }] : [],
    });
    const saved = await this.opportunities.save(entity);
    this.ws.sendToTenant(tenantId, 'pipeline:opportunity.created', { id: saved.id, pipelineId });
    return saved;
  }

  async updateOpportunity(tenantId: string, id: string, userId: string, dto: UpdateOpportunityDto) {
    await this.findOpportunityById(tenantId, id);
    const updates: Record<string, unknown> = {
      ...dto,
      updated_by: userId,
      updated_at: new Date(),
    };
    if (dto.value       !== undefined) updates['value']       = dto.value.toString();
    if (dto.probability !== undefined) updates['probability'] = dto.probability.toString();
    if (dto.expected_close_date)       updates['expected_close_date'] = new Date(dto.expected_close_date);
    if (dto.status === 'won' || dto.status === 'lost') updates['actual_close_date'] = new Date();
    await this.opportunities.update({ id, tenant_id: tenantId }, updates);
    return this.findOpportunityById(tenantId, id);
  }

  async moveOpportunity(tenantId: string, id: string, userId: string, dto: MoveOpportunityDto) {
    const opp = await this.findOpportunityById(tenantId, id);
    const slaDate = await this.computeSlaDate(dto.stage_id);
    const history = Array.isArray(opp.stage_history) ? [...opp.stage_history] : [];
    history.push({ stage_id: dto.stage_id, entered_at: new Date().toISOString(), actor_id: userId });
    await this.opportunities.update(
      { id, tenant_id: tenantId },
      {
        stage_id:      dto.stage_id,
        stage_history: history as Parameters<typeof this.opportunities.update>[1] extends { stage_history?: infer T } ? T : unknown[],
        sla_due_at:    slaDate,
        sla_breached:  false,
        updated_by:    userId,
        updated_at:    new Date(),
      } as Parameters<typeof this.opportunities.update>[1],
    );
    this.ws.sendToTenant(tenantId, 'pipeline:opportunity.moved', { id, stageId: dto.stage_id });
    return this.findOpportunityById(tenantId, id);
  }

  async deleteOpportunity(tenantId: string, id: string) {
    await this.findOpportunityById(tenantId, id);
    await this.opportunities.update({ id, tenant_id: tenantId }, { deleted_at: new Date() });
    return { deleted: true };
  }

  // ── Kanban view ────────────────────────────────────────────────────────────

  async getKanban(tenantId: string, pipelineId: string) {
    const pipeline = await this.findPipelineById(tenantId, pipelineId);
    const stages   = pipeline.stages;
    const opps     = await this.opportunities.find({
      where: { tenant_id: tenantId, pipeline_id: pipelineId },
      order: { created_at: 'DESC' },
    });
    return stages.map(stage => ({
      stage,
      opportunities: opps.filter(o => o.stage_id === stage.id && !o.deleted_at),
      total_value:   opps
        .filter(o => o.stage_id === stage.id && !o.deleted_at && o.value)
        .reduce((sum, o) => sum + parseFloat(o.value as string), 0),
    }));
  }

  private async computeSlaDate(stageId?: string | null): Promise<Date | null> {
    if (!stageId) return null;
    const stage = await this.stages.findOne({ where: { id: stageId } });
    if (!stage?.sla_days) return null;
    const d = new Date();
    d.setDate(d.getDate() + stage.sla_days);
    return d;
  }
}
