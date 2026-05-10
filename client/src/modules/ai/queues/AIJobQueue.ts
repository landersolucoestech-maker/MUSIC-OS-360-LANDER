/**
 * modules/ai/queues/AIJobQueue.ts
 *
 * Fila de jobs de IA — architecture Redis-ready.
 *
 * MOCK_MODE / standalone: implementação in-memory com EventEmitter pattern.
 * PRODUÇÃO:               substituir por BullMQ + Redis (server-side).
 *
 * Responsabilidades:
 *  — enqueue: adiciona job à fila
 *  — dequeue: retira próximo job pendente
 *  — update:  actualiza status e resultado do job
 *  — getJob:  consulta job por ID
 *  — subscribe: notificação reactiva quando job muda de estado
 *
 * Fluxo:
 * Frontend → AIJobQueue.enqueue() → AIWorker.process() → AIJobQueue.update(completed)
 */

import type { AIJob, AIJobStatus, AIRequest, AIResponse } from "../domain/ai.types";

// ─── Types ────────────────────────────────────────────────────────────────────

type JobStatusListener = (job: AIJob) => void;

/** Input para enqueue — requestId e createdAt são gerados internamente */
export type AIEnqueueInput = Omit<AIRequest, "requestId" | "createdAt">;

// ─── In-memory queue (MOCK_MODE / standalone) ─────────────────────────────────

export class AIJobQueue {
  private readonly jobs = new Map<string, AIJob>();
  private readonly queue: string[] = [];
  private readonly listeners = new Map<string, Set<JobStatusListener>>();
  private readonly globalListeners = new Set<JobStatusListener>();

  readonly maxJobsInMemory: number;

  constructor(maxJobsInMemory = 500) {
    this.maxJobsInMemory = maxJobsInMemory;
  }

  // ── Enqueue ──────────────────────────────────────────────────────────────

  enqueue(input: AIEnqueueInput, maxAttempts = 3): AIJob {
    const request: AIRequest = {
      ...input,
      requestId: `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
    };
    const job: AIJob = {
      jobId:      `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      request,
      status:     "pending",
      attempts:   0,
      maxAttempts,
      enqueuedAt: new Date().toISOString(),
    };

    this.jobs.set(job.jobId, job);
    this.queue.push(job.jobId);

    // Garbage collect se ultrapassar limite
    if (this.jobs.size > this.maxJobsInMemory) {
      const oldestId = Array.from(this.jobs.keys())[0];
      if (oldestId) {
        this.jobs.delete(oldestId);
      }
    }

    this.notifyListeners(job);
    return job;
  }

  // ── Dequeue (próximo pendente) ────────────────────────────────────────────

  dequeue(): AIJob | undefined {
    while (this.queue.length > 0) {
      const jobId = this.queue[0];
      const job   = jobId ? this.jobs.get(jobId) : undefined;

      if (!job) {
        this.queue.shift();
        continue;
      }

      if (job.status === "pending" || job.status === "retrying") {
        this.queue.shift();
        return job;
      }

      this.queue.shift();
    }
    return undefined;
  }

  // ── Update job ────────────────────────────────────────────────────────────

  update(
    jobId: string,
    update: Partial<Pick<AIJob, "status" | "response" | "error" | "attempts" | "startedAt" | "completedAt">>,
  ): AIJob | undefined {
    const job = this.jobs.get(jobId);
    if (!job) return undefined;

    const updated: AIJob = { ...job, ...update };
    this.jobs.set(jobId, updated);
    this.notifyListeners(updated);
    return updated;
  }

  markProcessing(jobId: string): AIJob | undefined {
    return this.update(jobId, {
      status:    "processing",
      startedAt: new Date().toISOString(),
    });
  }

  markCompleted(jobId: string, response: AIResponse): AIJob | undefined {
    return this.update(jobId, {
      status:      "completed",
      response,
      completedAt: new Date().toISOString(),
    });
  }

  markFailed(jobId: string, error: string, retry = false): AIJob | undefined {
    const job = this.jobs.get(jobId);
    if (!job) return undefined;

    const shouldRetry = retry && job.attempts < job.maxAttempts;

    if (shouldRetry) {
      const updated = this.update(jobId, {
        status:   "retrying",
        error,
        attempts: job.attempts + 1,
      });
      if (updated) {
        this.queue.push(jobId);
      }
      return updated;
    }

    return this.update(jobId, {
      status:      "failed",
      error,
      completedAt: new Date().toISOString(),
    });
  }

  // ── Consulta ──────────────────────────────────────────────────────────────

  getJob(jobId: string): AIJob | undefined {
    return this.jobs.get(jobId);
  }

  getJobsByStatus(status: AIJobStatus): AIJob[] {
    return Array.from(this.jobs.values()).filter((j) => j.status === status);
  }

  getPendingCount(): number {
    return this.getJobsByStatus("pending").length + this.getJobsByStatus("retrying").length;
  }

  getAllJobs(limit = 50): AIJob[] {
    return Array.from(this.jobs.values()).slice(-limit).reverse();
  }

  // ── Subscriptions ─────────────────────────────────────────────────────────

  subscribe(listener: JobStatusListener): () => void {
    this.globalListeners.add(listener);
    return () => this.globalListeners.delete(listener);
  }

  subscribeToJob(jobId: string, listener: JobStatusListener): () => void {
    if (!this.listeners.has(jobId)) {
      this.listeners.set(jobId, new Set());
    }
    this.listeners.get(jobId)!.add(listener);

    return () => {
      const set = this.listeners.get(jobId);
      if (set) {
        set.delete(listener);
        if (set.size === 0) this.listeners.delete(jobId);
      }
    };
  }

  private notifyListeners(job: AIJob): void {
    this.globalListeners.forEach((l) => l(job));
    this.listeners.get(job.jobId)?.forEach((l) => l(job));
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  getStats() {
    const jobs = Array.from(this.jobs.values());
    const completed = jobs.filter((j) => j.status === "completed");
    const failed    = jobs.filter((j) => j.status === "failed");
    const avgLatency = completed.length > 0
      ? completed.reduce((sum, j) => {
          if (!j.response) return sum;
          return sum + j.response.latencyMs;
        }, 0) / completed.length
      : 0;

    return {
      total:     jobs.length,
      pending:   jobs.filter((j) => j.status === "pending").length,
      processing: jobs.filter((j) => j.status === "processing").length,
      completed: completed.length,
      failed:    failed.length,
      retrying:  jobs.filter((j) => j.status === "retrying").length,
      avgLatencyMs: Math.round(avgLatency),
    };
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _queueInstance: AIJobQueue | null = null;

export function getAIJobQueue(): AIJobQueue {
  if (!_queueInstance) {
    _queueInstance = new AIJobQueue();
  }
  return _queueInstance;
}
