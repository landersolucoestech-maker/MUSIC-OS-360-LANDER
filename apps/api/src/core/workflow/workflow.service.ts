/**
 * workflow.service.ts
 *
 * Injectable NestJS service that wraps WorkflowEngine instances.
 * Handles: transition execution, history persistence, allowed_transitions exposure.
 */

import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../database/database.module';
import { WorkflowTransitionEntity } from '../../database/entities';
import { WorkflowEngine } from './workflow.engine';
import {
  WorkflowDefinition,
  WorkflowContext,
  AllowedTransition,
  WorkflowTransitionError,
} from './workflow.types';

export interface TransitionRequest {
  entityType: string;
  entityId: string;
  tenantId: string;
  actorId: string;
  actorRole?: string;
  fromStatus: string;
  toStatus: string;
  entity: Record<string, unknown>;
  reason?: string;
}

export interface TransitionResult {
  success: boolean;
  fromStatus: string;
  toStatus: string;
}

@Injectable()
export class WorkflowService {
  private readonly engines = new Map<string, WorkflowEngine<string>>();
  private readonly historyRepo: Repository<WorkflowTransitionEntity> | null = null;

  constructor(@Inject(DATA_SOURCE) ds: DataSource | null) {
    if (ds) {
      this.historyRepo = ds.getRepository(WorkflowTransitionEntity);
    }
  }

  /** Register a workflow definition. Called once per domain module at startup. */
  register<TState extends string>(definition: WorkflowDefinition<TState>): void {
    this.engines.set(definition.entityType, new WorkflowEngine(definition as WorkflowDefinition<string>));
  }

  /** Returns transitions available to the actor from the current status. */
  getAllowedTransitions(
    entityType: string,
    currentStatus: string,
    actorRole?: string,
  ): AllowedTransition<string>[] {
    const engine = this.engines.get(entityType);
    if (!engine) return [];
    return engine.getAllowedTransitions(currentStatus, actorRole);
  }

  /** Validates and executes a state transition, persisting history. */
  async transition(req: TransitionRequest): Promise<TransitionResult> {
    const engine = this.engines.get(req.entityType);
    if (!engine) {
      throw new BadRequestException(
        `Workflow não encontrado para entity type '${req.entityType}'`,
      );
    }

    const context: WorkflowContext<string> = {
      entityType: req.entityType,
      entityId:   req.entityId,
      tenantId:   req.tenantId,
      actorId:    req.actorId,
      actorRole:  req.actorRole,
      fromStatus: req.fromStatus,
      toStatus:   req.toStatus,
      entity:     req.entity,
      reason:     req.reason,
    };

    try {
      await engine.transition(context);
    } catch (err) {
      if (err instanceof WorkflowTransitionError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    await this.persistHistory(req);

    return { success: true, fromStatus: req.fromStatus, toStatus: req.toStatus };
  }

  /** Returns paginated transition history for an entity. */
  async getHistory(tenantId: string, entityType: string, entityId: string, limit = 50) {
    if (!this.historyRepo) return [];
    return this.historyRepo.find({
      where: { tenant_id: tenantId, entity_type: entityType, entity_id: entityId } as any,
      order: { created_at: 'DESC' } as any,
      take: limit,
    });
  }

  private async persistHistory(req: TransitionRequest): Promise<void> {
    if (!this.historyRepo) return;
    const entry = this.historyRepo.create({
      tenant_id:   req.tenantId,
      entity_type: req.entityType,
      entity_id:   req.entityId,
      from_status: req.fromStatus,
      to_status:   req.toStatus,
      actor_id:    req.actorId,
      actor_role:  req.actorRole ?? null,
      reason:      req.reason ?? null,
      metadata:    {},
    } as any);
    await this.historyRepo.save(entry as any);
  }
}
