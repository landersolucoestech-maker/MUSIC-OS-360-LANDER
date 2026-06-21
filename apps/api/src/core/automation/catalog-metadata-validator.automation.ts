/**
 * core/automation/catalog-metadata-validator.automation.ts
 *
 * Automação NATIVA, INTERNA e INVISÍVEL:
 *   catalog.work.created      → catalog-metadata-validator (type=work)      → works.metadata.aiCatalogValidation
 *   catalog.recording.created → catalog-metadata-validator (type=recording) → phonograms.metadata.aiCatalogValidation
 *
 * Um único handler trata os dois eventos, mantendo entityType/eventName/idempotencyKey
 * próprios de cada tipo. Toda a orquestração comum (idempotência metadata + skill_runs,
 * auditoria, envelope, persistência, fail-safe) vive em `runNativeSkillAutomation`.
 *
 * Garantias herdadas do runner: execução não-bloqueante, falha da IA nunca reverte a
 * criação do ativo, dupla guarda de idempotência (running recente/success bloqueiam;
 * running stale/failed permitem retry), e nenhum efeito colateral (não aprova catálogo,
 * não altera status de obra/fonograma, sem tarefas, sem notificações, sem tabelas novas).
 */

import { Injectable, Inject, Optional } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DataSource, EntityManager } from 'typeorm';
import { DATA_SOURCE } from '../../database/database.module';
import { DatabaseContextService } from '../../database/database-context.service';
import { DOMAIN_EVENTS } from '../events/events.service';
import type { DomainEvent } from '../events/events.service';
import type {
  CatalogWorkCreatedPayload,
  CatalogRecordingCreatedPayload,
} from '../events/domain-events.types';
import { SkillRunService } from '../skills/skill-run.service';
import { AIService } from '../../modules/ai/ai.service';
import {
  CATALOG_METADATA_VALIDATOR_SYSTEM_PROMPT,
  buildCatalogMetadataValidatorPrompt,
  parseCatalogMetadataValidatorResponse,
  validateCatalogMetadataValidatorInput,
  type CatalogMetadataValidatorInput,
  type CatalogComposer,
} from '@music-os-360/ai-skills';
import { runNativeSkillAutomation } from './native-skill-automation.runner';

const SKILL_NAME = 'catalog-metadata-validator';
const METADATA_KEY = 'aiCatalogValidation';

interface WorkRow {
  titulo: string;
  compositor: string | null;
  compositores: string | null;
  co_compositores: string | null;
  editora: string | null;
  isrc: string | null;
  metadata: Record<string, unknown> | null;
}

interface RecordingRow {
  titulo: string;
  compositores: string | null;
  interpretes: string | null;
  produtores: string | null;
  isrc: string | null;
  gravadora: string | null;
  metadata: Record<string, unknown> | null;
}

/** Divide um campo texto livre (com `;` `,` `/` ou quebras) numa lista limpa. */
function splitList(text: string | null | undefined): string[] {
  if (!text) return [];
  return text.split(/[;,/\n]+/).map((s) => s.trim()).filter((s) => s.length > 0);
}

/** Une vários campos texto em CatalogComposer[] (deduplicado por nome). */
function toComposers(...texts: Array<string | null | undefined>): CatalogComposer[] {
  const names = new Set<string>();
  for (const t of texts) for (const n of splitList(t)) names.add(n);
  return [...names].map((name) => ({ name }));
}

@Injectable()
export class CatalogMetadataValidatorAutomation {
  private readonly ds: DataSource | null;

  constructor(
    @Inject(DATA_SOURCE) @Optional() ds: DataSource | null,
    private readonly skillRun: SkillRunService,
    private readonly ai: AIService,
    @Optional() private readonly dbContext?: DatabaseContextService,
  ) {
    this.ds = ds ?? null;
  }

  // ── Obra (work) ─────────────────────────────────────────────────────────────

  @OnEvent(DOMAIN_EVENTS.CATALOG_WORK_CREATED, { async: true })
  async onWorkCreated(event: DomainEvent<CatalogWorkCreatedPayload>): Promise<void> {
    const tenantId = event.tenantId;
    const payload = event.payload;
    const workId = payload?.workId;

    await runNativeSkillAutomation<WorkRow, CatalogMetadataValidatorInput>(
      { ds: this.ds, dbContext: this.dbContext, skillRun: this.skillRun, ai: this.ai },
      {
        eventName: DOMAIN_EVENTS.CATALOG_WORK_CREATED,
        skillName: SKILL_NAME,
        tenantId,
        userId: payload?.createdBy ?? null,
        entityType: 'work',
        entityId: workId,
        metadataKey: METADATA_KEY,
        systemPrompt: CATALOG_METADATA_VALIDATOR_SYSTEM_PROMPT,
        load: (manager) => this.loadWork(tenantId, workId, manager),
        getMetadata: (row) => (row.metadata ?? {}) as Record<string, unknown>,
        buildInput: (row) => this.buildWorkInput(row),
        validateInput: validateCatalogMetadataValidatorInput,
        buildPrompt: buildCatalogMetadataValidatorPrompt,
        parseResponse: parseCatalogMetadataValidatorResponse,
        saveMetadata: (next, manager) => this.persistWork(tenantId, workId, next, manager),
      },
    );
  }

  // ── Fonograma (recording) ───────────────────────────────────────────────────

  @OnEvent(DOMAIN_EVENTS.CATALOG_RECORDING_CREATED, { async: true })
  async onRecordingCreated(event: DomainEvent<CatalogRecordingCreatedPayload>): Promise<void> {
    const tenantId = event.tenantId;
    const payload = event.payload;
    const recordingId = payload?.recordingId;

    await runNativeSkillAutomation<RecordingRow, CatalogMetadataValidatorInput>(
      { ds: this.ds, dbContext: this.dbContext, skillRun: this.skillRun, ai: this.ai },
      {
        eventName: DOMAIN_EVENTS.CATALOG_RECORDING_CREATED,
        skillName: SKILL_NAME,
        tenantId,
        userId: payload?.createdBy ?? null,
        entityType: 'recording',
        entityId: recordingId,
        metadataKey: METADATA_KEY,
        systemPrompt: CATALOG_METADATA_VALIDATOR_SYSTEM_PROMPT,
        load: (manager) => this.loadRecording(tenantId, recordingId, manager),
        getMetadata: (row) => (row.metadata ?? {}) as Record<string, unknown>,
        buildInput: (row) => this.buildRecordingInput(row),
        validateInput: validateCatalogMetadataValidatorInput,
        buildPrompt: buildCatalogMetadataValidatorPrompt,
        parseResponse: parseCatalogMetadataValidatorResponse,
        saveMetadata: (next, manager) => this.persistRecording(tenantId, recordingId, next, manager),
      },
    );
  }

  // ── Persistência: works ─────────────────────────────────────────────────────

  private async loadWork(
    tenantId: string,
    workId: string,
    manager: EntityManager,
  ): Promise<WorkRow | null> {
    if (!this.ds) return null;
    const rows = (await manager.query(
      `SELECT titulo, compositor, compositores, co_compositores, editora, isrc, metadata
         FROM works
        WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
        LIMIT 1`,
      [workId, tenantId],
    )) as WorkRow[];
    return rows?.[0] ?? null;
  }

  private async persistWork(
    tenantId: string,
    workId: string,
    nextMetadata: Record<string, unknown>,
    manager: EntityManager,
  ): Promise<void> {
    if (!this.ds) return;
    await manager.query(
      `UPDATE works SET metadata = $1::jsonb, updated_at = NOW()
        WHERE id = $2 AND tenant_id = $3 AND deleted_at IS NULL`,
      [JSON.stringify(nextMetadata), workId, tenantId],
    );
  }

  // ── Persistência: phonograms ────────────────────────────────────────────────

  private async loadRecording(
    tenantId: string,
    recordingId: string,
    manager: EntityManager,
  ): Promise<RecordingRow | null> {
    if (!this.ds) return null;
    const rows = (await manager.query(
      `SELECT titulo, compositores, interpretes, produtores, isrc, gravadora, metadata
         FROM phonograms
        WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
        LIMIT 1`,
      [recordingId, tenantId],
    )) as RecordingRow[];
    return rows?.[0] ?? null;
  }

  private async persistRecording(
    tenantId: string,
    recordingId: string,
    nextMetadata: Record<string, unknown>,
    manager: EntityManager,
  ): Promise<void> {
    if (!this.ds) return;
    await manager.query(
      `UPDATE phonograms SET metadata = $1::jsonb, updated_at = NOW()
        WHERE id = $2 AND tenant_id = $3 AND deleted_at IS NULL`,
      [JSON.stringify(nextMetadata), recordingId, tenantId],
    );
  }

  // ── Montagem do input da skill ──────────────────────────────────────────────

  private buildWorkInput(work: WorkRow): CatalogMetadataValidatorInput {
    const md = (work.metadata ?? {}) as Record<string, unknown>;
    const input: CatalogMetadataValidatorInput = {
      title: work.titulo,
      type: 'work',
      composers: toComposers(work.compositor, work.compositores, work.co_compositores),
      language: 'pt-BR',
    };
    if (work.editora) input.publisher = work.editora;
    // ISRC numa obra é inconsistência — passado para o modelo apontar, se houver.
    if (work.isrc) input.isrc = work.isrc;
    if (typeof md.context === 'string') input.context = md.context;
    return input;
  }

  private buildRecordingInput(rec: RecordingRow): CatalogMetadataValidatorInput {
    const md = (rec.metadata ?? {}) as Record<string, unknown>;
    const input: CatalogMetadataValidatorInput = {
      title: rec.titulo,
      type: 'recording',
      performers: splitList(rec.interpretes),
      language: 'pt-BR',
    };
    const composers = toComposers(rec.compositores);
    if (composers.length > 0) input.composers = composers;
    const producers = splitList(rec.produtores);
    if (producers.length > 0) input.producers = producers;
    if (rec.isrc) input.isrc = rec.isrc;
    if (rec.gravadora) input.label = rec.gravadora;
    if (typeof md.context === 'string') input.context = md.context;
    return input;
  }
}
