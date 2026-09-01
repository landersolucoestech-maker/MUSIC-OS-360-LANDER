import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { QUEUE_NAMES, ANALYTICS_REFRESH_JOB_NAMES } from '../queue.constants';
import { MarketBenchmarkService } from '../../modules/artists/platform-profiles/analytics/market-benchmark.service';
import { DatabaseContextService } from '../../database/database-context.service';
import type { MarketBenchmarkRefreshJobPayload } from '../../modules/artists/platform-profiles/analytics/market-benchmark-refresh.types';

/**
 * queues/processors/market-benchmark-refresh.processor.ts
 *
 * Fase 3.2 — worker que executa o trabalho PESADO (até
 * MAX_CANDIDATES_PER_REFRESH × BENCHMARK_METRICS chamadas Soundcharts) fora
 * do request HTTP. Chama MarketBenchmarkService.computeAndPersist() — a
 * mesma matemática validada na Fase 3.1, engine inalterado (item 39).
 *
 * Retry/backoff reaproveitados do default global do BullMQ (item 3) + os
 * mesmos attempts=3/backoff exponencial explícitos no enqueue (item 9) — um
 * erro transitório da Soundcharts (rate limit/5xx/timeout) propagado por
 * MarketReferenceCacheService.fetchMetric() faz este job falhar e o BullMQ
 * reagenda automaticamente.
 *
 * Contexto de tenant (achado na validação real com worker): market_benchmark_snapshots
 * tem FORCE RLS com WITH CHECK em private_get_tenant_id(). Um job BullMQ roda fora do
 * ciclo HTTP — sem envolver a chamada em runInTenantContext (mesmo padrão já usado por
 * ArtistPlatformSyncProcessor), o INSERT do snapshot é rejeitado pelo Postgres
 * ("new row violates row-level security policy"), o job "completa" do ponto de vista do
 * BullMQ mesmo assim (persistIfChanged engole o erro) e a leitura seguinte nunca encontra
 * snapshot — reenfileirando 'cold' indefinidamente.
 */
@Processor(QUEUE_NAMES.ANALYTICS_REFRESH)
@Injectable()
export class MarketBenchmarkRefreshProcessor extends WorkerHost {
  private readonly logger = new Logger(MarketBenchmarkRefreshProcessor.name);

  constructor(
    private readonly marketBenchmark: MarketBenchmarkService,
    private readonly dbContext: DatabaseContextService,
  ) {
    super();
  }

  async process(job: Job<MarketBenchmarkRefreshJobPayload>): Promise<void> {
    if (job.name !== ANALYTICS_REFRESH_JOB_NAMES.MARKET_BENCHMARK_REFRESH) return;

    const payload = job.data;
    // Fail-closed: mesmo padrão do ArtistPlatformSyncProcessor — job assíncrono
    // sem tenant NUNCA toca dados tenant-scoped.
    if (!payload.tenant_id) {
      this.logger.warn(`[analytics-refresh] job=${job.id} sem tenant_id — abortado (fail-closed)`);
      return;
    }

    const logCtx = `job=${job.id} tenant=${payload.tenant_id} artist=${payload.artist_id} target=${payload.target_uuid} reason=${payload.reason} attempt=${job.attemptsMade + 1}`;
    const startedAt = Date.now();
    this.logger.log(`[analytics-refresh] benchmark_refresh_started ${logCtx}`);

    try {
      const { result, stats } = await this.dbContext.runInTenantContext(
        { tenantId: payload.tenant_id, orgId: null, role: null },
        () => this.marketBenchmark.computeAndPersist(payload.tenant_id, payload.artist_id, payload.target_uuid),
      );
      const durationMs = Date.now() - startedAt;
      this.logger.log(
        `[analytics-refresh] benchmark_refresh_completed ${logCtx} status=${result.status} sampleSize=${result.sampleSize} ` +
          `fallbackLevel=${result.fallbackLevel} candidateCount=${stats.candidatesConsidered} metricRequests=${stats.metricRequestCount} ` +
          `cacheHits=${stats.cacheHits} cacheMisses=${stats.cacheMisses} durationMs=${durationMs}`,
      );
    } catch (err) {
      const durationMs = Date.now() - startedAt;
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`[analytics-refresh] benchmark_refresh_failed ${logCtx} durationMs=${durationMs} error="${message}"`);
      throw err; // deixa o BullMQ decidir retry/backoff/dead-letter (removeOnFail:false preserva o job para inspeção).
    }
  }
}
