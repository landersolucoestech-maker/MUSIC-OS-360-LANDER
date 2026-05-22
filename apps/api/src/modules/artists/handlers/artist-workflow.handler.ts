/**
 * artist-workflow.handler.ts
 *
 * ARTIST_STATUS_CHANGED → contratado:
 *   1. Idempotency: skip if CRM task type='artist.onboarding:{artistId}' already exists
 *   2. Create 6 onboarding CRM tasks
 *   3. Update ArtistEntity.metadata.onboarding_tasks_created_at
 *   4. Emit ARTIST_ONBOARDING_STARTED
 *   5. Emit DISTRIBUTION_SETUP_REQUESTED
 *   6. Enqueue onboarding-check job
 *   7. Move pipeline opportunity to matching stage
 */

import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../../database/database.module';
import {
  ArtistEntity,
  CrmTaskEntity,
  PipelineEntity,
  PipelineStageEntity,
  PipelineOpportunityEntity,
} from '../../../database/entities';
import { EventsService, DOMAIN_EVENTS } from '../../../core/events/events.service';
import { WorkflowQueueService } from '../../../queues/services/workflow-queue.service';
import { NotificationsQueueService } from '../../../queues/services/notifications-queue.service';
import type { DomainEvent } from '../../../core/events/events.service';
import type { ArtistStatusChangedPayload } from '../../../core/events/domain-events.types';

const ONBOARDING_TASKS: ReadonlyArray<{ title: string; description: string; priority: string; daysFromNow: number }> = [
  { title: 'Onboarding artístico',          description: 'Apresentar plataforma e fluxos ao artista',         priority: 'high',   daysFromNow: 3  },
  { title: 'Coleta documental',             description: 'Solicitar e validar documentos (CPF, CNPJ, etc.)',   priority: 'high',   daysFromNow: 5  },
  { title: 'Setup de distribuição digital', description: 'Configurar perfil nas distribuidoras e DSPs',        priority: 'medium', daysFromNow: 10 },
  { title: 'Setup de marketing',            description: 'Criar perfis e plano de conteúdo inicial',           priority: 'medium', daysFromNow: 10 },
  { title: 'Revisão de identidade visual',  description: 'Alinhar brand guidelines e assets visuais',          priority: 'low',    daysFromNow: 15 },
  { title: 'Kickoff operacional',           description: 'Reunião de alinhamento com equipa interna',          priority: 'high',   daysFromNow: 7  },
];

@Injectable()
export class ArtistWorkflowHandler {
  private readonly logger = new Logger(ArtistWorkflowHandler.name);

  private readonly artistRepo:      Repository<ArtistEntity>              | null = null;
  private readonly taskRepo:        Repository<CrmTaskEntity>             | null = null;
  private readonly pipelineRepo:    Repository<PipelineEntity>            | null = null;
  private readonly stageRepo:       Repository<PipelineStageEntity>       | null = null;
  private readonly opportunityRepo: Repository<PipelineOpportunityEntity> | null = null;

  constructor(
    @Inject(DATA_SOURCE) @Optional() ds: DataSource | null,
    @Optional() private readonly events: EventsService,
    @Optional() private readonly workflowQueue: WorkflowQueueService,
    @Optional() private readonly notificationsQueue: NotificationsQueueService,
  ) {
    if (ds) {
      this.artistRepo      = ds.getRepository(ArtistEntity);
      this.taskRepo        = ds.getRepository(CrmTaskEntity);
      this.pipelineRepo    = ds.getRepository(PipelineEntity);
      this.stageRepo       = ds.getRepository(PipelineStageEntity);
      this.opportunityRepo = ds.getRepository(PipelineOpportunityEntity);
    }
  }

  @OnEvent(DOMAIN_EVENTS.ARTIST_STATUS_CHANGED)
  async onArtistStatusChanged(event: DomainEvent<ArtistStatusChangedPayload>): Promise<void> {
    const { artistId, tenantId, nomeArtistico, newStatus, changedBy } = event.payload;

    if (newStatus !== 'contratado') return;

    // 1. Idempotency check
    if (this.taskRepo) {
      try {
        const existing = await this.taskRepo.findOne({
          where: { tenant_id: tenantId, type: `artist.onboarding:${artistId}` },
        });
        if (existing) {
          this.logger.debug(`Onboarding tasks already created for artist "${artistId}" — skipping`);
          return;
        }
      } catch (err) {
        this.logger.warn(`Idempotency check failed for artist "${artistId}" — ${String(err)}`);
        return;
      }
    }

    const now = new Date();
    const taskTitles: string[] = [];

    // 2. Create 6 onboarding CRM tasks
    if (this.taskRepo) {
      try {
        const tasks = ONBOARDING_TASKS.map((t) => {
          const due = new Date(now);
          due.setDate(due.getDate() + t.daysFromNow);
          return this.taskRepo!.create({
            tenant_id:   tenantId,
            title:       t.title,
            description: t.description,
            status:      'pending',
            priority:    t.priority,
            type:        `artist.onboarding:${artistId}`,
            assigned_to: changedBy,
            due_date:    due,
            created_by:  changedBy,
          });
        });
        await this.taskRepo.save(tasks);
        taskTitles.push(...ONBOARDING_TASKS.map((t) => t.title));
        this.logger.log(`Created ${tasks.length} onboarding tasks for artist "${artistId}" (${nomeArtistico})`);
      } catch (err) {
        this.logger.error(`Failed to create onboarding tasks for "${artistId}" — ${String(err)}`);
      }
    }

    // 3. Update ArtistEntity.metadata
    if (this.artistRepo) {
      try {
        const artist = await this.artistRepo.findOne({ where: { id: artistId, tenant_id: tenantId } });
        if (artist) {
          await this.artistRepo.update(
            { id: artistId, tenant_id: tenantId },
            { metadata: { ...artist.metadata, onboarding_tasks_created_at: now.toISOString() } } as any,
          );
        }
      } catch (err) {
        this.logger.warn(`Failed to update artist metadata for "${artistId}" — ${String(err)}`);
      }
    }

    // 4. Emit ARTIST_ONBOARDING_STARTED
    if (this.events) {
      try {
        this.events.emitTyped(DOMAIN_EVENTS.ARTIST_ONBOARDING_STARTED, {
          tenantId,
          userId:        changedBy,
          aggregateType: 'artist',
          aggregateId:   artistId,
          payload: {
            artistId,
            tenantId,
            nomeArtistico,
            tasks:     taskTitles,
            startedAt: now.toISOString(),
          },
        });
      } catch (err) {
        this.logger.warn(`Failed to emit ARTIST_ONBOARDING_STARTED for "${artistId}" — ${String(err)}`);
      }
    }

    // 5. Emit DISTRIBUTION_SETUP_REQUESTED
    if (this.events) {
      try {
        this.events.emitTyped(DOMAIN_EVENTS.DISTRIBUTION_SETUP_REQUESTED, {
          tenantId,
          userId:        changedBy,
          aggregateType: 'artist',
          aggregateId:   artistId,
          payload: {
            artistId,
            tenantId,
            contractId:   null,
            requestedAt:  now.toISOString(),
            providerHint: null,
          },
        });
      } catch (err) {
        this.logger.warn(`Failed to emit DISTRIBUTION_SETUP_REQUESTED for "${artistId}" — ${String(err)}`);
      }
    }

    // 6. Enqueue onboarding-check and distribution-sync jobs
    if (this.workflowQueue) {
      try {
        await Promise.all([
          this.workflowQueue.enqueueOnboardingCheck({
            tenantId,
            artistId,
            tasks: taskTitles,
            correlationId: event.correlationId ?? null,
          }),
          this.workflowQueue.enqueueDistributionSync({
            tenantId,
            artistId,
            contractId:   null,
            providerHint: null,
            correlationId: event.correlationId ?? null,
          }),
        ]);
      } catch (err) {
        this.logger.warn(`Failed to enqueue workflow jobs for "${artistId}" — ${String(err)}`);
      }
    }

    // 7. Notify team
    if (this.notificationsQueue) {
      try {
        await this.notificationsQueue.enqueue({
          tenantId,
          userId:   changedBy,
          title:    `Onboarding iniciado: ${nomeArtistico}`,
          body:     `Artista contratado — ${taskTitles.length} tarefas criadas`,
          type:     'artist:onboarding_started',
          entity:   'artist',
          entityId: artistId,
          metadata: { artistId, nomeArtistico, correlationId: event.correlationId ?? null },
        });
      } catch (err) {
        this.logger.warn(`Failed to enqueue onboarding notification for "${artistId}" — ${String(err)}`);
      }
    }

    // 8. Pipeline automation: move opportunity to stage matching newStatus
    await this.movePipelineOpportunity(tenantId, artistId, newStatus, changedBy, event.correlationId ?? null);
  }

  private async movePipelineOpportunity(
    tenantId: string, artistId: string, newStatus: string, actorId: string, correlationId: string | null,
  ): Promise<void> {
    if (!this.pipelineRepo || !this.stageRepo || !this.opportunityRepo) return;
    try {
      const pipeline = await this.pipelineRepo.findOne({
        where: { tenant_id: tenantId, type: 'artists', deleted_at: null as any },
      });
      if (!pipeline) return;

      const stage = await this.stageRepo.findOne({
        where: { pipeline_id: pipeline.id, tenant_id: tenantId },
        order: { position: 'ASC' },
      });
      if (!stage) return;

      const opportunity = await this.opportunityRepo
        .createQueryBuilder('o')
        .where('o.tenant_id = :tenantId AND o.pipeline_id = :pipelineId AND o.status = :status AND o.deleted_at IS NULL', {
          tenantId, pipelineId: pipeline.id, status: 'open',
        })
        .andWhere(`o.metadata->>'artist_id' = :artistId`, { artistId })
        .getOne();

      if (!opportunity) return;

      const history = Array.isArray(opportunity.stage_history) ? opportunity.stage_history : [];
      await this.opportunityRepo.update(
        { id: opportunity.id, tenant_id: tenantId },
        {
          stage_id:     stage.id,
          updated_by:   actorId,
          stage_history: [
            ...history,
            { stageId: stage.id, movedAt: new Date().toISOString(), movedBy: actorId, trigger: `artist.status:${newStatus}`, correlationId },
          ],
        } as any,
      );
      this.logger.log(`Pipeline opportunity "${opportunity.id}" moved to stage "${stage.name}" for artist "${artistId}"`);
    } catch (err) {
      this.logger.warn(`Pipeline move failed for artist "${artistId}" — ${String(err)}`);
    }
  }
}
