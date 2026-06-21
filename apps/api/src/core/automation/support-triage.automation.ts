/**
 * core/automation/support-triage.automation.ts
 *
 * Automação NATIVA, INTERNA e INVISÍVEL:
 *   support.ticket.created → support-triage → salva triagem em support_tickets.metadata.aiTriage
 *
 * Toda a orquestração comum (idempotência metadata + skill_runs, auditoria,
 * envelope, persistência, fail-safe) vive em `runNativeSkillAutomation`. Aqui ficam
 * apenas as partes específicas: load do ticket, montagem do input e o UPDATE da
 * tabela `support_tickets`.
 *
 * Garantias herdadas do runner: execução não-bloqueante, falha da IA nunca reverte
 * support.ticket.created, dupla guarda de idempotência, e nenhum efeito colateral
 * (sem tarefas, sem notificações, sem escalação, sem mudança de status, sem
 * tabelas novas).
 */

import { Injectable, Inject, Optional } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DataSource, EntityManager } from 'typeorm';
import { DATA_SOURCE } from '../../database/database.module';
import { DatabaseContextService } from '../../database/database-context.service';
import { DOMAIN_EVENTS } from '../events/events.service';
import type { DomainEvent } from '../events/events.service';
import type { SupportTicketCreatedPayload } from '../events/domain-events.types';
import { SkillRunService } from '../skills/skill-run.service';
import { AIService } from '../../modules/ai/ai.service';
import {
  SUPPORT_TRIAGE_SYSTEM_PROMPT,
  buildSupportTriagePrompt,
  parseSupportTriageResponse,
  validateSupportTriageInput,
  type SupportTriageInput,
  type SupportModule,
} from '@music-os-360/ai-skills';
import { runNativeSkillAutomation } from './native-skill-automation.runner';

const SKILL_NAME = 'support-triage';

/** Módulos aceitos pela skill (espelha o union SupportModule do pacote). */
const KNOWN_MODULES: readonly SupportModule[] = [
  'artists', 'releases', 'contracts', 'financial', 'catalog', 'marketing',
  'audiovisual', 'agenda', 'integrations', 'ai', 'settings', 'support', 'other',
];

/** Mapeia a `category` livre do ticket para um SupportModule; undefined se não casar. */
function mapModule(category: string | null | undefined): SupportModule | undefined {
  const c = (category ?? '').trim().toLowerCase();
  return (KNOWN_MODULES as readonly string[]).includes(c) ? (c as SupportModule) : undefined;
}

interface TicketRow {
  subject: string;
  description: string | null;
  category: string | null;
  metadata: Record<string, unknown> | null;
}

@Injectable()
export class SupportTriageAutomation {
  private readonly ds: DataSource | null;

  constructor(
    @Inject(DATA_SOURCE) @Optional() ds: DataSource | null,
    private readonly skillRun: SkillRunService,
    private readonly ai: AIService,
    @Optional() private readonly dbContext?: DatabaseContextService,
  ) {
    this.ds = ds ?? null;
  }

  @OnEvent(DOMAIN_EVENTS.SUPPORT_TICKET_CREATED, { async: true })
  async onSupportTicketCreated(event: DomainEvent<SupportTicketCreatedPayload>): Promise<void> {
    const tenantId = event.tenantId;
    const payload = event.payload;
    const ticketId = payload?.ticketId;

    await runNativeSkillAutomation<TicketRow, SupportTriageInput>(
      { ds: this.ds, dbContext: this.dbContext, skillRun: this.skillRun, ai: this.ai },
      {
        eventName: DOMAIN_EVENTS.SUPPORT_TICKET_CREATED,
        skillName: SKILL_NAME,
        tenantId,
        userId: payload?.createdBy ?? null,
        entityType: 'support_ticket',
        entityId: ticketId,
        metadataKey: 'aiTriage',
        systemPrompt: SUPPORT_TRIAGE_SYSTEM_PROMPT,
        load: (manager) => this.loadTicket(tenantId, ticketId, manager),
        getMetadata: (row) => (row.metadata ?? {}) as Record<string, unknown>,
        buildInput: (row) => this.buildInput(row),
        validateInput: validateSupportTriageInput,
        buildPrompt: buildSupportTriagePrompt,
        parseResponse: parseSupportTriageResponse,
        saveMetadata: (next, manager) => this.persistMetadata(tenantId, ticketId, next, manager),
      },
    );
  }

  // ── Persistência (read/write de support_tickets.metadata via DataSource) ─────

  private async loadTicket(
    tenantId: string,
    ticketId: string,
    manager: EntityManager,
  ): Promise<TicketRow | null> {
    if (!this.ds) return null;
    const rows = (await manager.query(
      `SELECT subject, description, category, metadata
         FROM support_tickets
        WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
        LIMIT 1`,
      [ticketId, tenantId],
    )) as TicketRow[];
    return rows?.[0] ?? null;
  }

  private async persistMetadata(
    tenantId: string,
    ticketId: string,
    nextMetadata: Record<string, unknown>,
    manager: EntityManager,
  ): Promise<void> {
    if (!this.ds) return;
    await manager.query(
      `UPDATE support_tickets SET metadata = $1::jsonb, updated_at = NOW()
        WHERE id = $2 AND tenant_id = $3 AND deleted_at IS NULL`,
      [JSON.stringify(nextMetadata), ticketId, tenantId],
    );
  }

  // ── Montagem do input da skill ──────────────────────────────────────────────

  private buildInput(ticket: TicketRow): SupportTriageInput {
    const md = (ticket.metadata ?? {}) as Record<string, unknown>;

    const input: SupportTriageInput = {
      subject: ticket.subject,
      message: ticket.description?.trim() || ticket.subject,
      language: 'pt-BR',
    };

    const module = mapModule(ticket.category);
    if (module) input.affectedModule = module;
    if (typeof md.userRole === 'string') input.userRole = md.userRole;
    if (typeof md.context === 'string') input.context = md.context;

    return input;
  }
}
