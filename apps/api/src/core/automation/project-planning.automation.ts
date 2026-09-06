/**
 * core/automation/project-planning.automation.ts
 *
 * Automação NATIVA, INTERNA e INVISÍVEL:
 *   project.completed → project-planning → salva plano em projects.metadata.aiPlan
 *
 * Toda a orquestração comum (idempotência metadata + skill_runs, auditoria,
 * envelope, persistência, fail-safe) vive em `runNativeSkillAutomation`. Aqui ficam
 * apenas as partes específicas: elegibilidade, load do projeto, montagem do input
 * e o UPDATE da tabela `projects`.
 *
 * Garantias herdadas do runner: execução não-bloqueante, falha da IA nunca reverte
 * project.completed, dupla guarda de idempotência, e nenhum efeito colateral
 * (sem tarefas reais, sem notificações, sem tabelas novas).
 */

import { Injectable, Inject, Optional } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DataSource, EntityManager } from 'typeorm';
import { DATA_SOURCE } from '../../database/database.module';
import { DatabaseContextService } from '../../database/database-context.service';
import { DOMAIN_EVENTS } from '../events/events.service';
import type { DomainEvent } from '../events/events.service';
import type { ProjectCompletedPayload } from '../events/domain-events.types';
import { SkillRunService } from '../skills/skill-run.service';
import { AIService } from '../../modules/ai/ai.service';
import {
  PROJECT_PLANNING_SYSTEM_PROMPT,
  buildProjectPlanningPrompt,
  parseProjectPlanningResponse,
  validateProjectPlanningInput,
  type ProjectPlanningInput,
} from '@music-os-360/ai-skills';
import { runNativeSkillAutomation } from './native-skill-automation.runner';

const SKILL_NAME = 'project-planning';

/** Palavras-chave que indicam projeto musical / lançamento musical (type livre). */
const MUSICAL_TYPE_KEYWORDS = [
  'lancamento', 'lançamento', 'single', 'ep', 'album', 'álbum', 'release',
  'fonograma', 'musical', 'musica', 'música', 'turne', 'turnê', 'show',
  'clipe', 'audiovisual', 'obra',
];

/** Departamentos operacionais padrão (quando o projeto não os declara em metadata). */
const DEFAULT_DEPARTMENTS = ['A&R', 'Marketing', 'Audiovisual', 'Distribuição', 'Jurídico', 'Administrativo'];

interface ProjectRow {
  nome: string;
  type: string;
  descricao: string | null;
  artist_id: string | null;
  data_fim: string | Date | null;
  metadata: Record<string, unknown> | null;
}

function isMusicalProject(type: string | null | undefined): boolean {
  if (!type) return false;
  const t = type.toLowerCase();
  return MUSICAL_TYPE_KEYWORDS.some((k) => t.includes(k));
}

@Injectable()
export class ProjectPlanningAutomation {
  private readonly ds: DataSource | null;

  constructor(
    @Inject(DATA_SOURCE) @Optional() ds: DataSource | null,
    private readonly skillRun: SkillRunService,
    private readonly ai: AIService,
    @Optional() private readonly dbContext?: DatabaseContextService,
  ) {
    this.ds = ds ?? null;
  }

  @OnEvent(DOMAIN_EVENTS.PROJECT_COMPLETED, { async: true })
  async onProjectCompleted(event: DomainEvent<ProjectCompletedPayload>): Promise<void> {
    const tenantId = event.tenantId;
    const payload = event.payload;
    const projectId = payload?.projectId;

    await runNativeSkillAutomation<ProjectRow, ProjectPlanningInput>(
      { ds: this.ds, dbContext: this.dbContext, skillRun: this.skillRun, ai: this.ai },
      {
        eventName: DOMAIN_EVENTS.PROJECT_COMPLETED,
        skillName: SKILL_NAME,
        tenantId,
        userId: payload?.completedBy ?? null,
        entityType: 'project',
        entityId: projectId,
        metadataKey: 'aiPlan',
        systemPrompt: PROJECT_PLANNING_SYSTEM_PROMPT,
        isEligible: () => isMusicalProject(payload?.type),
        load: (manager) => this.loadProject(tenantId, projectId, manager),
        getMetadata: (row) => (row.metadata ?? {}) as Record<string, unknown>,
        buildInput: (row) => this.buildInput(row),
        validateInput: validateProjectPlanningInput,
        buildPrompt: buildProjectPlanningPrompt,
        parseResponse: parseProjectPlanningResponse,
        saveMetadata: (next, manager) => this.persistMetadata(tenantId, projectId, next, manager),
      },
    );
  }

  // ── Persistência (read/write de projects.metadata via DataSource) ───────────

  private async loadProject(
    tenantId: string,
    projectId: string,
    manager: EntityManager,
  ): Promise<ProjectRow | null> {
    if (!this.ds) return null;
    const rows = (await manager.query(
      `SELECT nome, type, descricao, artist_id, data_fim, metadata
         FROM projects
        WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
        LIMIT 1`,
      [projectId, tenantId],
    )) as ProjectRow[];
    return rows?.[0] ?? null;
  }

  private async persistMetadata(
    tenantId: string,
    projectId: string,
    nextMetadata: Record<string, unknown>,
    manager: EntityManager,
  ): Promise<void> {
    if (!this.ds) return;
    await manager.query(
      `UPDATE projects SET metadata = $1::jsonb, updated_at = NOW()
        WHERE id = $2 AND tenant_id = $3 AND deleted_at IS NULL`,
      [JSON.stringify(nextMetadata), projectId, tenantId],
    );
  }

  // ── Montagem do input da skill ──────────────────────────────────────────────

  private buildInput(project: ProjectRow): ProjectPlanningInput {
    const md = (project.metadata ?? {}) as Record<string, unknown>;

    const departments =
      Array.isArray(md.departments) && md.departments.length > 0
        ? md.departments.map((d) => String(d))
        : DEFAULT_DEPARTMENTS;

    const goals =
      Array.isArray(md.goals) && md.goals.length > 0
        ? md.goals.map((g) => String(g))
        : [`Concluir e operacionalizar as entregas do projeto "${project.nome}".`];

    const input: ProjectPlanningInput = {
      projectName: project.nome,
      projectType: project.type,
      departments,
      goals,
      language: 'pt-BR',
    };

    if (project.descricao) input.context = String(project.descricao);
    if (project.data_fim) input.deadline = new Date(project.data_fim).toISOString();

    return input;
  }
}
