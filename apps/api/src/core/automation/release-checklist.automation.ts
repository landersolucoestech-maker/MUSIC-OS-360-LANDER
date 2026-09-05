/**
 * core/automation/release-checklist.automation.ts
 *
 * Automação NATIVA, INTERNA e INVISÍVEL:
 *   release.created → release-checklist → salva auditoria em releases.metadata.aiChecklist
 *
 * Toda a orquestração comum (idempotência metadata + skill_runs, auditoria,
 * envelope, persistência, fail-safe) vive em `runNativeSkillAutomation`. Aqui ficam
 * apenas as partes específicas: load do release (com nome do artista), montagem do
 * input e o UPDATE da tabela `releases`.
 *
 * Garantias herdadas do runner: execução não-bloqueante, falha da IA nunca reverte
 * release.created, dupla guarda de idempotência, e nenhum efeito colateral (sem
 * tarefas reais, sem notificações, sem tabelas novas).
 */

import { Injectable, Inject, Optional } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DataSource, EntityManager } from 'typeorm';
import { DATA_SOURCE } from '../../database/database.module';
import { DatabaseContextService } from '../../database/database-context.service';
import { DOMAIN_EVENTS } from '../events/events.service';
import type { DomainEvent } from '../events/events.service';
import type { ReleaseCreatedPayload } from '../events/domain-events.types';
import { SkillRunService } from '../skills/skill-run.service';
import { AIService } from '../../modules/ai/ai.service';
import {
  RELEASE_CHECKLIST_SYSTEM_PROMPT,
  buildReleaseChecklistPrompt,
  parseReleaseChecklistResponse,
  validateReleaseChecklistInput,
  type ReleaseChecklistInput,
  type ReleaseType,
} from '@music-os-360/ai-skills';
import { runNativeSkillAutomation } from './native-skill-automation.runner';

const SKILL_NAME = 'release-checklist';

/** Tipos de lançamento aceitos pela skill (alinha o varchar livre de releases.tipo). */
const KNOWN_RELEASE_TYPES: readonly ReleaseType[] = ['single', 'ep', 'album', 'mixtape', 'video', 'other'];

/** Mapeia o `tipo` livre do release para o enum da skill; cai em "other" se desconhecido. */
function mapReleaseType(tipo: string | null | undefined): ReleaseType {
  const t = (tipo ?? '').trim().toLowerCase();
  if ((KNOWN_RELEASE_TYPES as readonly string[]).includes(t)) return t as ReleaseType;
  if (t === 'álbum' || t === 'lp') return 'album';
  if (t === 'clipe' || t === 'vídeo' || t === 'videoclipe') return 'video';
  return 'other';
}

interface ReleaseRow {
  titulo: string;
  tipo: string | null;
  data_lancamento: string | Date | null;
  upc: string | null;
  capa_url: string | null;
  artist_id: string | null;
  artist_name: string | null;
  metadata: Record<string, unknown> | null;
}

@Injectable()
export class ReleaseChecklistAutomation {
  private readonly ds: DataSource | null;

  constructor(
    @Inject(DATA_SOURCE) @Optional() ds: DataSource | null,
    private readonly skillRun: SkillRunService,
    private readonly ai: AIService,
    @Optional() private readonly dbContext?: DatabaseContextService,
  ) {
    this.ds = ds ?? null;
  }

  @OnEvent(DOMAIN_EVENTS.RELEASE_CREATED, { async: true })
  async onReleaseCreated(event: DomainEvent<ReleaseCreatedPayload>): Promise<void> {
    const tenantId = event.tenantId;
    const payload = event.payload;
    const releaseId = payload?.releaseId;

    await runNativeSkillAutomation<ReleaseRow, ReleaseChecklistInput>(
      { ds: this.ds, dbContext: this.dbContext, skillRun: this.skillRun, ai: this.ai },
      {
        eventName: DOMAIN_EVENTS.RELEASE_CREATED,
        skillName: SKILL_NAME,
        tenantId,
        userId: payload?.createdBy ?? null,
        entityType: 'release',
        entityId: releaseId,
        metadataKey: 'aiChecklist',
        systemPrompt: RELEASE_CHECKLIST_SYSTEM_PROMPT,
        load: (manager) => this.loadRelease(tenantId, releaseId, manager),
        getMetadata: (row) => (row.metadata ?? {}) as Record<string, unknown>,
        buildInput: (row) => this.buildInput(row),
        validateInput: validateReleaseChecklistInput,
        buildPrompt: buildReleaseChecklistPrompt,
        parseResponse: parseReleaseChecklistResponse,
        saveMetadata: (next, manager) => this.persistMetadata(tenantId, releaseId, next, manager),
      },
    );
  }

  // ── Persistência (read/write de releases.metadata via DataSource) ───────────

  private async loadRelease(
    tenantId: string,
    releaseId: string,
    manager: EntityManager,
  ): Promise<ReleaseRow | null> {
    if (!this.ds) return null;
    const rows = (await manager.query(
      `SELECT r.titulo, r.tipo, r.data_lancamento, r.upc, r.capa_url, r.artist_id, r.metadata,
              a.nome_artistico AS artist_name
         FROM releases r
         LEFT JOIN artists a
           ON a.id = r.artist_id AND a.tenant_id = r.tenant_id AND a.deleted_at IS NULL
        WHERE r.id = $1 AND r.tenant_id = $2 AND r.deleted_at IS NULL
        LIMIT 1`,
      [releaseId, tenantId],
    )) as ReleaseRow[];
    return rows?.[0] ?? null;
  }

  private async persistMetadata(
    tenantId: string,
    releaseId: string,
    nextMetadata: Record<string, unknown>,
    manager: EntityManager,
  ): Promise<void> {
    if (!this.ds) return;
    await manager.query(
      `UPDATE releases SET metadata = $1::jsonb, updated_at = NOW()
        WHERE id = $2 AND tenant_id = $3 AND deleted_at IS NULL`,
      [JSON.stringify(nextMetadata), releaseId, tenantId],
    );
  }

  // ── Montagem do input da skill ──────────────────────────────────────────────

  private buildInput(release: ReleaseRow): ReleaseChecklistInput {
    const md = (release.metadata ?? {}) as Record<string, unknown>;
    const flag = (key: string): boolean => md[key] === true;

    const input: ReleaseChecklistInput = {
      releaseTitle: release.titulo,
      artistName: release.artist_name?.trim() || 'Artista não identificado',
      releaseType: mapReleaseType(release.tipo),
      hasCover: release.capa_url != null,
      hasISRC: flag('hasISRC'),
      hasUPC: release.upc != null,
      hasContracts: flag('hasContracts'),
      hasSplits: flag('hasSplits'),
      hasMarketingPlan: flag('hasMarketingPlan'),
      language: 'pt-BR',
    };

    if (release.data_lancamento) input.releaseDate = new Date(release.data_lancamento).toISOString();
    if (typeof md.context === 'string') input.context = md.context;

    return input;
  }
}
