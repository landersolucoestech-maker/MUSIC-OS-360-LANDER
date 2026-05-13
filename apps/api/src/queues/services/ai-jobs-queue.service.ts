/**
 * queues/services/ai-jobs-queue.service.ts
 *
 * Producer service para a fila "ai-jobs".
 * Expõe métodos tipados para enfileirar completions de IA
 * que serão processadas assincronamente pelo AIJobsProcessor.
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue }        from '@nestjs/bullmq';
import { Queue, JobsOptions } from 'bullmq';
import { QUEUE_NAMES }        from '../queue.constants';
import type { AIJobPayload }  from '../processors/ai-jobs.processor';

// ─── Prioridades ──────────────────────────────────────────────────────────────

const NORMAL_PRIORITY: Partial<JobsOptions> = { priority: 5 };
const LOW_PRIORITY:    Partial<JobsOptions> = { priority: 10 };

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class AIJobsQueueService {
  private readonly logger = new Logger(AIJobsQueueService.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.AI_JOBS)
    private readonly queue: Queue,
  ) {}

  // ── Enfileirar AI job genérico ────────────────────────────────────────────

  async enqueue(payload: AIJobPayload, opts?: Partial<JobsOptions>): Promise<string | undefined> {
    const job = await this.queue.add('ai:complete', payload, {
      ...NORMAL_PRIORITY,
      attempts: 2,
      backoff:  { type: 'exponential', delay: 3000 },
      ...opts,
    });
    this.logger.log(
      `[ai-jobs] enqueued jobId=${job.id} skill=${payload.skill} userId=${payload.userId}`,
    );
    return job.id;
  }

  // ── Geração de biografia de artista ──────────────────────────────────────

  async enqueueBiography(opts: {
    tenantId:   string;
    userId:     string;
    artistName: string;
    context:    string;
    jobRef?:    string;
  }): Promise<string | undefined> {
    return this.enqueue({
      tenantId: opts.tenantId,
      userId:   opts.userId,
      skill:    'biography',
      prompt:   `Escreve uma biografia profissional para o artista: ${opts.artistName}.\nContexto: ${opts.context}`,
      jobRef:   opts.jobRef,
    });
  }

  // ── Geração de copy de campanha ──────────────────────────────────────────

  async enqueueCampaignCopy(opts: {
    tenantId: string;
    userId:   string;
    campaign: string;
    platform: string;
    goal:     string;
    jobRef?:  string;
  }): Promise<string | undefined> {
    return this.enqueue({
      tenantId: opts.tenantId,
      userId:   opts.userId,
      skill:    'campaign_copy',
      prompt:   `Cria copy para campanha "${opts.campaign}" na plataforma ${opts.platform}. Objectivo: ${opts.goal}.`,
      jobRef:   opts.jobRef,
    }, LOW_PRIORITY);
  }

  // ── Análise de contrato ───────────────────────────────────────────────────

  async enqueueContractAnalysis(opts: {
    tenantId:     string;
    userId:       string;
    contractText: string;
    jobRef?:      string;
  }): Promise<string | undefined> {
    return this.enqueue({
      tenantId: opts.tenantId,
      userId:   opts.userId,
      skill:    'contract_analysis',
      prompt:   `Analisa o seguinte contrato e identifica cláusulas problemáticas:\n\n${opts.contractText}`,
      jobRef:   opts.jobRef,
    });
  }

  // ── Stats da fila ─────────────────────────────────────────────────────────

  async getQueueStats(): Promise<{
    waiting:   number;
    active:    number;
    completed: number;
    failed:    number;
    delayed:   number;
  }> {
    const [waiting, active, completed, failed, delayed] = [
      await this.queue.getWaitingCount(),
      await this.queue.getActiveCount(),
      await this.queue.getCompletedCount(),
      await this.queue.getFailedCount(),
      await this.queue.getDelayedCount(),
    ];
    return { waiting, active, completed, failed, delayed };
  }
}
