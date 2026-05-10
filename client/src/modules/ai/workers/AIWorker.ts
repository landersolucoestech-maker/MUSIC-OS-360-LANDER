/**
 * modules/ai/workers/AIWorker.ts
 *
 * Worker que processa jobs da AIJobQueue.
 *
 * MOCK_MODE / standalone: worker in-process, polling a cada 100ms.
 * PRODUÇÃO (server-side): substituir por BullMQ worker com Redis.
 *
 * Responsabilidades:
 *  — polling da fila de jobs pendentes
 *  — execução via AIOrchestrator (com retries e fallback)
 *  — rastreio no AIAnalytics após cada execução
 *  — actualização de status no AIJobQueue
 *
 * Fluxo obrigatório (frontend standalone):
 * Queue.enqueue → Worker.poll → Orchestrator.execute → Analytics.record → Queue.update
 */

import type { AIJob } from "../domain/ai.types";
import { getAIOrchestrator } from "../orchestrators/AIOrchestrator";
import { getAIJobQueue } from "../queues/AIJobQueue";
import { getAIAnalytics } from "../analytics/AIAnalytics";

// ─── Worker config ────────────────────────────────────────────────────────────

interface AIWorkerConfig {
  pollIntervalMs: number;
  maxConcurrentJobs: number;
  enabled: boolean;
}

const DEFAULT_CONFIG: AIWorkerConfig = {
  pollIntervalMs:     150,
  maxConcurrentJobs:  1,
  enabled:            true,
};

// ─── Worker ───────────────────────────────────────────────────────────────────

export class AIWorker {
  private readonly config: AIWorkerConfig;
  private readonly orchestrator = getAIOrchestrator();
  private readonly queue        = getAIJobQueue();
  private readonly analytics    = getAIAnalytics();

  private _running      = false;
  private _processing   = 0;
  private _pollTimerId: ReturnType<typeof setInterval> | null = null;

  constructor(config: Partial<AIWorkerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ── Start / Stop ─────────────────────────────────────────────────────────

  start(): void {
    if (this._running || !this.config.enabled) return;
    this._running = true;
    this._pollTimerId = setInterval(() => this.poll(), this.config.pollIntervalMs);
  }

  stop(): void {
    this._running = false;
    if (this._pollTimerId !== null) {
      clearInterval(this._pollTimerId);
      this._pollTimerId = null;
    }
  }

  get isRunning(): boolean { return this._running; }
  get processingCount(): number { return this._processing; }

  // ── Poll ──────────────────────────────────────────────────────────────────

  private async poll(): Promise<void> {
    if (this._processing >= this.config.maxConcurrentJobs) return;

    const job = this.queue.dequeue();
    if (!job) return;

    this._processing++;
    this.queue.markProcessing(job.jobId);

    try {
      await this.processJob(job);
    } finally {
      this._processing--;
    }
  }

  // ── Process ───────────────────────────────────────────────────────────────

  private async processJob(job: AIJob): Promise<void> {
    const startMs = Date.now();
    const req     = job.request;

    try {
      const response = await this.orchestrator.execute({
        skill:       req.skill,
        prompt:      req.prompt,
        tenantId:    req.context.tenantId,
        userId:      req.context.userId,
        context: {
          artistName:   req.context.artistName,
          genre:        req.context.genre,
          platform:     req.context.platform,
          tone:         req.context.tone,
          language:     req.context.language,
          extraContext: req.context.extraContext,
        },
        provider:    req.provider,
        model:       req.model,
        maxTokens:   req.maxTokens,
        temperature: req.temperature,
      });

      this.queue.markCompleted(job.jobId, response);

      // Registar no analytics
      this.analytics.record({
        tenantId:     req.context.tenantId,
        userId:       req.context.userId,
        skill:        req.skill,
        provider:     response.provider,
        model:        response.model,
        inputTokens:  response.inputTokens,
        outputTokens: response.outputTokens,
        totalTokens:  response.totalTokens,
        costUsd:      response.costUsd,
        latencyMs:    Date.now() - startMs,
        status:       "success",
        retries:      job.attempts,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const shouldRetry  = job.attempts < job.maxAttempts - 1;

      this.queue.markFailed(job.jobId, errorMessage, shouldRetry);

      // Registar falha no analytics
      this.analytics.record({
        tenantId:     req.context.tenantId,
        userId:       req.context.userId,
        skill:        req.skill,
        provider:     req.provider ?? "openai",
        model:        req.model    ?? "gpt-4o-mini",
        inputTokens:  0,
        outputTokens: 0,
        totalTokens:  0,
        costUsd:      0,
        latencyMs:    Date.now() - startMs,
        status:       "failure",
        retries:      job.attempts,
        errorMessage,
      });
    }
  }
}

// ─── Singleton — auto-start ────────────────────────────────────────────────────

let _workerInstance: AIWorker | null = null;

export function getAIWorker(): AIWorker {
  if (!_workerInstance) {
    _workerInstance = new AIWorker();
    _workerInstance.start();
  }
  return _workerInstance;
}
