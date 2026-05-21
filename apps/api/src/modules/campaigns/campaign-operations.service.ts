import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../database/database.module';
import { CampaignTaskEntity, CampaignAssetEntity, CampaignEntity } from '../../database/entities';
import type {
  CreateCampaignTaskDto, UpdateCampaignTaskDto, QueryCampaignTaskDto,
  CreateCampaignAssetDto,
} from './dto/campaign-operations.dto';

@Injectable()
export class CampaignOperationsService {
  private tasks!:     Repository<CampaignTaskEntity>;
  private assets!:    Repository<CampaignAssetEntity>;
  private campaigns!: Repository<CampaignEntity>;

  constructor(@Inject(DATA_SOURCE) private readonly ds: DataSource | null) {
    if (ds) {
      this.tasks     = ds.getRepository(CampaignTaskEntity);
      this.assets    = ds.getRepository(CampaignAssetEntity);
      this.campaigns = ds.getRepository(CampaignEntity);
    }
  }

  private async assertCampaignExists(tenantId: string, campaignId: string) {
    const c = await this.campaigns.findOne({ where: { id: campaignId, tenant_id: tenantId } });
    if (!c || c.deleted_at) throw new NotFoundException('Campanha não encontrada');
  }

  // ── Tasks ──────────────────────────────────────────────────────────────────

  async listTasks(tenantId: string, campaignId: string, q: QueryCampaignTaskDto) {
    await this.assertCampaignExists(tenantId, campaignId);
    const qb = this.tasks.createQueryBuilder('t')
      .where('t.tenant_id = :tenantId AND t.campaign_id = :campaignId', { tenantId, campaignId });
    if (q.status)      qb.andWhere('t.status = :st', { st: q.status });
    if (q.assigned_to) qb.andWhere('t.assigned_to = :at', { at: q.assigned_to });
    qb.orderBy('t.due_date', 'ASC', 'NULLS LAST').skip(q.offset ?? 0).take(q.limit ?? 50);
    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, offset: q.offset ?? 0, limit: q.limit ?? 50 } };
  }

  async createTask(tenantId: string, campaignId: string, userId: string, dto: CreateCampaignTaskDto) {
    await this.assertCampaignExists(tenantId, campaignId);
    return this.tasks.save(this.tasks.create({
      tenant_id:   tenantId,
      campaign_id: campaignId,
      created_by:  userId,
      ...dto,
      due_date: dto.due_date ? new Date(dto.due_date) : null,
    }));
  }

  async updateTask(tenantId: string, campaignId: string, taskId: string, dto: UpdateCampaignTaskDto) {
    const task = await this.tasks.findOne({ where: { id: taskId, campaign_id: campaignId, tenant_id: tenantId } });
    if (!task) throw new NotFoundException('Tarefa não encontrada');
    const updates: Record<string, unknown> = { ...dto, updated_at: new Date() };
    if (dto.status === 'done' && !task.completed_at) updates['completed_at'] = new Date();
    if (dto.due_date) updates['due_date'] = new Date(dto.due_date);
    await this.tasks.update({ id: taskId }, updates);
    return this.tasks.findOne({ where: { id: taskId } });
  }

  async deleteTask(tenantId: string, campaignId: string, taskId: string) {
    const t = await this.tasks.findOne({ where: { id: taskId, campaign_id: campaignId, tenant_id: tenantId } });
    if (!t) throw new NotFoundException('Tarefa não encontrada');
    await this.tasks.delete({ id: taskId });
    return { deleted: true };
  }

  // ── Calendar view ─────────────────────────────────────────────────────────

  async getCalendar(tenantId: string, campaignId: string) {
    await this.assertCampaignExists(tenantId, campaignId);
    const tasks = await this.tasks.find({
      where: { tenant_id: tenantId, campaign_id: campaignId },
      order: { due_date: 'ASC' },
    });
    return tasks.filter(t => t.due_date).map(t => ({
      id:          t.id,
      title:       t.title,
      date:        t.due_date,
      status:      t.status,
      priority:    t.priority,
      assigned_to: t.assigned_to,
    }));
  }

  // ── Assets ─────────────────────────────────────────────────────────────────

  async listAssets(tenantId: string, campaignId: string) {
    await this.assertCampaignExists(tenantId, campaignId);
    return this.assets.find({
      where: { tenant_id: tenantId, campaign_id: campaignId },
      order: { created_at: 'DESC' },
    });
  }

  async addAsset(tenantId: string, campaignId: string, userId: string, dto: CreateCampaignAssetDto) {
    await this.assertCampaignExists(tenantId, campaignId);
    return this.assets.save(this.assets.create({
      tenant_id:   tenantId,
      campaign_id: campaignId,
      created_by:  userId,
      ...dto,
    }));
  }

  async deleteAsset(tenantId: string, campaignId: string, assetId: string) {
    const a = await this.assets.findOne({ where: { id: assetId, campaign_id: campaignId, tenant_id: tenantId } });
    if (!a) throw new NotFoundException('Asset não encontrado');
    await this.assets.update({ id: assetId }, { deleted_at: new Date() });
    return { deleted: true };
  }
}
