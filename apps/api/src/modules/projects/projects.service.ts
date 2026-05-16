import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../database/database.module';
import { ProjectEntity } from '../../database/entities';
import type { CreateProjectDto, UpdateProjectDto, QueryProjectDto } from './dto/projects.dto';
import { ProjectStatus } from '@music-os-360/types';
import { WorkflowService } from '../../core/workflow/workflow.service';

@Injectable()
export class ProjectsService {
  private readonly ds:   DataSource | null = null;
  private readonly repo: Repository<ProjectEntity> | null = null;

  constructor(
    @Inject(DATA_SOURCE) ds: DataSource | null,
    private readonly workflowService: WorkflowService,
  ) {
    if (ds) {
      this.ds   = ds;
      this.repo = ds.getRepository(ProjectEntity);
    }
  }

  async list(tenantId: string, query: QueryProjectDto) {
    const q = query as Record<string, unknown>;
    const qb = this.repo!
      .createQueryBuilder('p')
      .where('p.tenant_id = :tenantId', { tenantId })
      .andWhere('p.deleted_at IS NULL');

    if (q['status'])     qb.andWhere('p.status = :status',         { status:    q['status'] });
    if (q['tipo'])       qb.andWhere('p.tipo = :tipo',             { tipo:      q['tipo'] });
    if (q['artista_id']) qb.andWhere('p.artista_id = :artistaId',  { artistaId: q['artista_id'] });
    if (q['search'])     qb.andWhere('p.nome ILIKE :search',       { search: `%${q['search']}%` });

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

  async findById(
    tenantId: string,
    id: string,
    actorRole?: string,
  ): Promise<ProjectEntity & { allowed_transitions: { to: string; label?: string }[] }> {
    const result = await this.repo!
      .createQueryBuilder('p')
      .where('p.id = :id AND p.tenant_id = :tenantId AND p.deleted_at IS NULL', { id, tenantId })
      .getOne();
    if (!result) throw new NotFoundException('Projeto não encontrado');
    const allowed_transitions = this.workflowService.getAllowedTransitions('project', result.status, actorRole);
    return { ...result, allowed_transitions };
  }

  async create(tenantId: string, userId: string, dto: CreateProjectDto): Promise<ProjectEntity> {
    const entity = this.repo!.create({
      tenant_id:  tenantId,
      ...(dto as unknown as Record<string, unknown>),
      created_by: userId,
      updated_by: userId,
    } as Partial<ProjectEntity>);
    return this.repo!.save(entity as ProjectEntity);
  }

  async update(
    tenantId: string,
    userId: string,
    id: string,
    dto: UpdateProjectDto,
    actorRole?: string,
  ): Promise<ProjectEntity & { allowed_transitions: { to: string; label?: string }[] }> {
    const current = await this.findById(tenantId, id, actorRole);
    const dtoMap  = dto as Record<string, unknown>;
    const statusChanging = dtoMap['status'] != null && dtoMap['status'] !== current.status;

    const { status: _s, ...restFields } = dtoMap;
    void _s;

    const nonStatusUpdates: Record<string, unknown> = {
      updated_at: new Date(),
      updated_by: userId,
      ...restFields,
    };

    if (statusChanging) {
      const req = {
        entityType: 'project' as const,
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
        await em.update(ProjectEntity, { id, tenant_id: tenantId }, {
          ...nonStatusUpdates,
          status: dtoMap['status'] as ProjectStatus,
        });
      });
    } else {
      await this.repo!.update({ id, tenant_id: tenantId } as any, nonStatusUpdates as any);
    }

    return this.findById(tenantId, id, actorRole);
  }

  async softDelete(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    await this.repo!.update({ id, tenant_id: tenantId } as any, { deleted_at: new Date() } as any);
    return { deleted: true };
  }
}
