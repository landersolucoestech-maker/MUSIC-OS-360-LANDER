/**
 * core/automation/marketing-calendar-builder.automation.ts
 *
 * Automação NATIVA, INTERNA e INVISÍVEL:
 *   release.approved → marketing-calendar-builder → salva PLANEJAMENTO interno em
 *   releases.metadata.aiMarketingCalendar
 *
 * Toda a orquestração comum vive em `runNativeSkillAutomation`.
 *
 * Restrições: apenas planejamento interno — NÃO cria posts, NÃO cria campanhas,
 * NÃO cria calendário oficial, não altera status/dados oficiais do release.
 */

import { Injectable, Inject, Optional } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DataSource, EntityManager } from 'typeorm';
import { DATA_SOURCE } from '../../database/database.module';
import { DatabaseContextService } from '../../database/database-context.service';
import { DOMAIN_EVENTS } from '../events/events.service';
import type { DomainEvent } from '../events/events.service';
import type { ReleaseApprovedPayload } from '../events/domain-events.types';
import { SkillRunService } from '../skills/skill-run.service';
import { AIService } from '../../modules/ai/ai.service';
import {
  MARKETING_CALENDAR_BUILDER_SYSTEM_PROMPT,
  buildMarketingCalendarBuilderPrompt,
  parseMarketingCalendarBuilderResponse,
  validateMarketingCalendarBuilderInput,
  type MarketingCalendarBuilderInput,
  type MarketingPlatform,
} from '@music-os-360/ai-skills';
import { runNativeSkillAutomation } from './native-skill-automation.runner';

const SKILL_NAME = 'marketing-calendar-builder';
const DEFAULT_PLATFORMS: MarketingPlatform[] = ['instagram', 'tiktok', 'youtube'];
const CAMPAIGN_WINDOW_DAYS = 28;

interface ReleaseRow {
  titulo: string;
  data_lancamento: string | Date | null;
  artist_name: string | null;
  metadata: Record<string, unknown> | null;
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

@Injectable()
export class MarketingCalendarBuilderAutomation {
  private readonly ds: DataSource | null;

  constructor(
    @Inject(DATA_SOURCE) @Optional() ds: DataSource | null,
    private readonly skillRun: SkillRunService,
    private readonly ai: AIService,
    @Optional() private readonly dbContext?: DatabaseContextService,
  ) {
    this.ds = ds ?? null;
  }

  @OnEvent(DOMAIN_EVENTS.RELEASE_APPROVED, { async: true })
  async onReleaseApproved(event: DomainEvent<ReleaseApprovedPayload>): Promise<void> {
    const tenantId = event.tenantId;
    const payload = event.payload;
    const releaseId = payload?.releaseId;
    const approvedAt = payload?.approvedAt;

    await runNativeSkillAutomation<ReleaseRow, MarketingCalendarBuilderInput>(
      { ds: this.ds, dbContext: this.dbContext, skillRun: this.skillRun, ai: this.ai },
      {
        eventName: DOMAIN_EVENTS.RELEASE_APPROVED,
        skillName: SKILL_NAME,
        tenantId,
        userId: payload?.approvedBy ?? null,
        entityType: 'release',
        entityId: releaseId,
        metadataKey: 'aiMarketingCalendar',
        systemPrompt: MARKETING_CALENDAR_BUILDER_SYSTEM_PROMPT,
        load: (manager) => this.loadRelease(tenantId, releaseId, manager),
        getMetadata: (row) => (row.metadata ?? {}) as Record<string, unknown>,
        buildInput: (row) => this.buildInput(row, approvedAt),
        validateInput: validateMarketingCalendarBuilderInput,
        buildPrompt: buildMarketingCalendarBuilderPrompt,
        parseResponse: parseMarketingCalendarBuilderResponse,
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
      `SELECT r.titulo, r.data_lancamento, r.metadata,
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

  private buildInput(release: ReleaseRow, approvedAt: string | undefined): MarketingCalendarBuilderInput {
    const md = (release.metadata ?? {}) as Record<string, unknown>;

    const startBase = release.data_lancamento
      ? new Date(release.data_lancamento)
      : approvedAt
        ? new Date(approvedAt)
        : new Date();
    const startDate = toIsoDate(startBase);
    const endDate = toIsoDate(new Date(startBase.getTime() + CAMPAIGN_WINDOW_DAYS * 86_400_000));

    const platforms =
      Array.isArray(md.marketingPlatforms) && md.marketingPlatforms.length > 0
        ? (md.marketingPlatforms.map((p) => String(p)) as MarketingPlatform[])
        : DEFAULT_PLATFORMS;

    const input: MarketingCalendarBuilderInput = {
      artistName: release.artist_name?.trim() || 'Artista',
      releaseTitle: release.titulo,
      campaignGoal: `Lançamento e promoção de "${release.titulo}".`,
      startDate,
      endDate,
      platforms,
      frequency: 'medium',
      language: 'pt-BR',
    };

    if (typeof md.context === 'string') input.context = md.context;

    return input;
  }
}
