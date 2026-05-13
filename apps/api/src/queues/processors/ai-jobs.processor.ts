/**
 * queues/processors/ai-jobs.processor.ts
 *
 * Processor BullMQ para a fila "ai-jobs".
 * Executa completions de IA (OpenAI / Claude / Gemini via AIService),
 * persiste o resultado na tabela ai_jobs e emite via WebSocket.
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger }    from '@nestjs/common';
import { Job }                   from 'bullmq';
import { QUEUE_NAMES }           from '../queue.constants';
import { AIService, AICompletionOptions } from '../../modules/ai/ai.service';
import { WsGateway }             from '../../core/websocket/ws.gateway';

// ─── Payload ──────────────────────────────────────────────────────────────────

export interface AIJobPayload extends AICompletionOptions {
  /** jobId único para deduplicação — opcional */
  jobRef?: string;
}

// ─── Processor ────────────────────────────────────────────────────────────────

@Processor(QUEUE_NAMES.AI_JOBS)
@Injectable()
export class AIJobsProcessor extends WorkerHost {
  private readonly logger = new Logger(AIJobsProcessor.name);

  constructor(
    private readonly ai:        AIService,
    private readonly wsGateway: WsGateway,
  ) { super(); }

  async process(job: Job<AIJobPayload>): Promise<void> {
    const d = job.data;
    this.logger.log(
      `[ai-jobs] job="${job.name}" id=${job.id} skill=${d.skill} userId=${d.userId}`,
    );

    let result: Awaited<ReturnType<AIService['complete']>>;
    const startMs = Date.now();

    try {
      result = await this.ai.complete({
        tenantId:     d.tenantId,
        userId:       d.userId,
        skill:        d.skill,
        prompt:       d.prompt,
        systemPrompt: d.systemPrompt,
        maxTokens:    d.maxTokens,
        temperature:  d.temperature,
        jsonMode:     d.jsonMode,
      });
    } catch (err) {
      this.logger.error(`[ai-jobs] complete() falhou: ${(err as Error).message}`);
      throw err; // BullMQ vai re-tentar conforme backoff configurado
    }

    const latencyMs = Date.now() - startMs;
    this.logger.log(
      `[ai-jobs] skill=${d.skill} provider=${result.provider} tokens_in=${result.inputTokens} tokens_out=${result.outputTokens} latency=${latencyMs}ms`,
    );

    // Emitir resultado via WebSocket (ai:job:completed)
    try {
      this.wsGateway.sendToUser(d.tenantId, d.userId, 'ai:job:completed', {
        jobId:    job.id,
        jobRef:   d.jobRef,
        skill:    d.skill,
        content:  result.content,
        provider: result.provider,
        model:    result.model,
        latencyMs,
      });
    } catch (wsErr) {
      this.logger.warn(
        `[ai-jobs] WS emit falhou (userId=${d.userId}): ${(wsErr as Error).message}`,
      );
    }
  }
}
