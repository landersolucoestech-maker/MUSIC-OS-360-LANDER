/**
 * queues/services/market-benchmark-refresh-queue.service.ts
 *
 * Fase 3.2 — producer service para a fila "analytics-refresh" (item 4/27:
 * nenhuma chamada pesada à Soundcharts dentro do request HTTP; refresh do
 * Market Benchmark roda em background). Mesmo padrão de
 * notifications-queue.service.ts: quando Redis está indisponível (BullMQ
 * no-op), os métodos retornam 'unavailable' em vez de lançar — o chamador
 * (MarketBenchmarkService.getStatus) decide o readStatus a partir disso.
 *
 * Dedup (item 7/8): jobId determinístico `benchmark-refresh__{tenant}__{artist}__{engineVersion}`.
 * Enquanto um job com esse id estiver waiting/active/delayed, um novo
 * enqueue NUNCA cria um job duplicado — BullMQ dedupa por jobId
 * nativamente. Um job 'failed' anterior é removido antes de tentar de novo
 * (dá uma tentativa limpa em vez de ficar preso ao id ocupado).
 *
 * jobId usa '__' como separador, não ':' — BullMQ (Job.validateOptions)
 * lança "Custom Id cannot contain :" porque ':' é o separador de chaves do
 * Redis. Mesma correção já aplicada em artist-external-profile-sync.service.ts.
 */
import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { QUEUE_NAMES, ANALYTICS_REFRESH_JOB_NAMES } from '../queue.constants';
import type { MarketBenchmarkRefreshJobPayload } from '../../modules/artists/platform-profiles/analytics/market-benchmark-refresh.types';

export type EnqueueRefreshOutcome = 'enqueued' | 'already_running' | 'unavailable' | 'error';

@Injectable()
export class MarketBenchmarkRefreshQueueService {
  private readonly logger = new Logger(MarketBenchmarkRefreshQueueService.name);

  constructor(
    @Optional()
    @InjectQueue(QUEUE_NAMES.ANALYTICS_REFRESH)
    private readonly queue: Queue<MarketBenchmarkRefreshJobPayload> | null,
  ) {}

  get available(): boolean {
    return this.queue != null;
  }

  dedupKey(tenantId: string, artistId: string, engineVersion: string): string {
    return `benchmark-refresh__${tenantId}__${artistId}__${engineVersion}`;
  }

  async enqueueRefresh(
    tenantId: string,
    artistId: string,
    targetUuid: string,
    engineVersion: string,
    reason: MarketBenchmarkRefreshJobPayload['reason'],
  ): Promise<EnqueueRefreshOutcome> {
    if (!this.queue) return 'unavailable';
    const jobId = this.dedupKey(tenantId, artistId, engineVersion);

    try {
      const existing = await this.queue.getJob(jobId);
      if (existing) {
        const state = await existing.getState();
        if (state === 'waiting' || state === 'active' || state === 'delayed') {
          this.logger.debug(`[analytics-refresh] benchmark_duplicate_refresh_suppressed jobId=${jobId} state=${state}`);
          return 'already_running';
        }
        if (state === 'failed') {
          await existing.remove();
        }
      }

      const payload: MarketBenchmarkRefreshJobPayload = {
        tenant_id: tenantId,
        artist_id: artistId,
        target_uuid: targetUuid,
        engine_version: engineVersion,
        reason,
        idempotency_key: jobId,
      };
      const job = await this.queue.add(ANALYTICS_REFRESH_JOB_NAMES.MARKET_BENCHMARK_REFRESH, payload, {
        jobId,
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: true,
        removeOnFail: false,
      });
      this.logger.log(`[analytics-refresh] benchmark_refresh_enqueued jobId=${job.id} tenant=${tenantId} artist=${artistId} reason=${reason}`);
      return 'enqueued';
    } catch (err) {
      this.logger.error(`[analytics-refresh] benchmark_refresh_enqueue_failed jobId=${jobId} tenant=${tenantId} artist=${artistId}: ${err instanceof Error ? err.message : String(err)}`);
      return 'error';
    }
  }

  /** 'not_found' | estado real do job — usado por getStatus() para decidir REFRESHING vs. re-enfileirar. */
  async getRefreshState(tenantId: string, artistId: string, engineVersion: string): Promise<string> {
    if (!this.queue) return 'not_found';
    const jobId = this.dedupKey(tenantId, artistId, engineVersion);
    const job = await this.queue.getJob(jobId);
    if (!job) return 'not_found';
    return job.getState();
  }
}
