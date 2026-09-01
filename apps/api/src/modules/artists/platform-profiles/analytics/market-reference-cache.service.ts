import { Inject, Injectable, Logger } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../../../database/database.module';
import { MarketReferenceMetricEntity } from '../../../../database/entities';
import { SoundchartsService } from '../../../integrations/soundcharts/soundcharts.service';
import { SoundchartsNotFoundError } from '../../../integrations/soundcharts/soundcharts.errors';
import { PRIMARY_METRIC_BY_PLATFORM, type MetricKey } from '../metric-keys';
import { MAX_CANDIDATES_PER_REFRESH, COHORT_CACHE_TTL_HOURS, BENCHMARK_METRICS } from './market-benchmark.config';

export interface CohortFetchStats {
  candidatesConsidered: number;
  metricRequestCount: number;
  cacheHits: number;
  cacheMisses: number;
}

export interface ReferenceCandidate {
  uuid: string;
  name: string | null;
  countryCode: string | null;
}

export interface ReferenceCandidateMetric {
  candidateUuid: string;
  metricKey: MetricKey;
  value: number | null;
}

// Métrica -> plataforma Soundcharts, para escolher o método correto do
// SoundchartsService (todos aceitam UUID diretamente — o candidato é
// externo, nunca passa por resolução de link cadastrado).
const PLATFORM_BY_METRIC = new Map<MetricKey, keyof typeof PRIMARY_METRIC_BY_PLATFORM>(
  Object.entries(PRIMARY_METRIC_BY_PLATFORM).map(([platform, metric]) => [metric, platform as keyof typeof PRIMARY_METRIC_BY_PLATFORM]),
);

/**
 * analytics/market-reference-cache.service.ts
 *
 * Fase 3.1 — descoberta e cache de candidatos de mercado REAIS via
 * Soundcharts `/related` (nunca "artistas do tenant" — esse era o defeito
 * conceitual corrigido nesta missão). Item 17 (fetch budget): a UI nunca
 * dispara isto diretamente; MarketBenchmarkService chama
 * `ensureFreshCohort()` e cada métrica de candidato só é buscada de novo
 * quando o cache (`market_reference_metrics`) está mais velho que
 * COHORT_CACHE_TTL_HOURS — dentro do TTL, reusa a linha existente, custo
 * zero de rede. Orçamento por refresh frio: no máximo
 * MAX_CANDIDATES_PER_REFRESH candidatos × (BENCHMARK_METRICS + 1 chamada de
 * país) chamadas Soundcharts.
 */
@Injectable()
export class MarketReferenceCacheService {
  private readonly logger = new Logger(MarketReferenceCacheService.name);
  private readonly repo: Repository<MarketReferenceMetricEntity> | null = null;

  constructor(
    @Inject(DATA_SOURCE) ds: DataSource | null,
    private readonly soundcharts: SoundchartsService,
  ) {
    if (ds) this.repo = ds.getRepository(MarketReferenceMetricEntity);
  }

  /**
   * Descobre candidatos via /related e garante que o cache de métricas de
   * cada um esteja fresco (dentro do TTL) — buscando ao vivo só o que
   * estiver ausente/stale. Retorna os candidatos considerados (até
   * MAX_CANDIDATES_PER_REFRESH), um snapshot em memória das métricas (cache
   * já atualizado no banco) e estatísticas de observabilidade (item 28).
   *
   * Concorrência estritamente sequencial (CANDIDATE_FETCH_CONCURRENCY=1,
   * item 11) — nunca `Promise.all` irrestrito. Erro transitório da
   * Soundcharts (rate limit/5xx/timeout) é PROPAGADO (nunca vira cohort
   * vazio silencioso — item 9): só `SoundchartsNotFoundError` (candidato
   * genuinamente sem aquela plataforma indexada) vira `null`. Propagar faz o
   * job de refresh (BullMQ) falhar e reusar o retry/backoff já configurado
   * globalmente (attempts=3, backoff exponencial) — reaproveitado, não
   * reimplementado (item 3).
   */
  async ensureFreshCohort(
    targetArtistUuid: string,
  ): Promise<{ candidates: ReferenceCandidate[]; metrics: ReferenceCandidateMetric[]; stats: CohortFetchStats }> {
    const stats: CohortFetchStats = { candidatesConsidered: 0, metricRequestCount: 0, cacheHits: 0, cacheMisses: 0 };
    if (!this.repo) return { candidates: [], metrics: [], stats };

    const related = await this.soundcharts.getRelatedArtists(targetArtistUuid, 0, 100);
    const candidateUuids = related.items.slice(0, MAX_CANDIDATES_PER_REFRESH).map((i) => i.uuid);
    if (candidateUuids.length === 0) return { candidates: [], metrics: [], stats };
    stats.candidatesConsidered = candidateUuids.length;

    const staleThreshold = new Date(Date.now() - COHORT_CACHE_TTL_HOURS * 60 * 60 * 1000);
    const existing = await this.repo
      .createQueryBuilder('m')
      .where('m.candidate_uuid IN (:...uuids)', { uuids: candidateUuids })
      .getMany();
    const existingByKey = new Map(existing.map((row) => [`${row.candidate_uuid}|${row.metric}`, row]));

    const candidates: ReferenceCandidate[] = [];
    const metrics: ReferenceCandidateMetric[] = [];

    for (const item of related.items.slice(0, MAX_CANDIDATES_PER_REFRESH)) {
      let countryCode: string | null = existing.find((r) => r.candidate_uuid === item.uuid)?.candidate_country_code ?? null;
      const needsCountryRefresh = !existing.some((r) => r.candidate_uuid === item.uuid && r.updated_at > staleThreshold);
      if (needsCountryRefresh) {
        try {
          countryCode = await this.soundcharts.getArtistCountryCode(item.uuid);
        } catch (err) {
          this.logger.warn(`[market-reference-cache] falha ao buscar país de ${item.uuid}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
      candidates.push({ uuid: item.uuid, name: item.name, countryCode });

      for (const metricKey of BENCHMARK_METRICS) {
        const cacheKey = `${item.uuid}|${metricKey}`;
        const cached = existingByKey.get(cacheKey);
        const isFresh = cached && cached.updated_at > staleThreshold;
        if (isFresh) {
          stats.cacheHits += 1;
          this.logger.debug(`[market-reference-cache] benchmark_cache_hit candidate=${item.uuid} metric=${metricKey}`);
          metrics.push({ candidateUuid: item.uuid, metricKey, value: cached.value != null ? Number(cached.value) : null });
          continue;
        }

        stats.cacheMisses += 1;
        stats.metricRequestCount += 1;
        this.logger.debug(`[market-reference-cache] benchmark_cache_miss candidate=${item.uuid} metric=${metricKey}`);
        const value = await this.fetchMetric(item.uuid, metricKey);
        metrics.push({ candidateUuid: item.uuid, metricKey, value });
        await this.upsert(item.uuid, item.name, countryCode, metricKey, value);
      }
    }

    return { candidates, metrics, stats };
  }

  /** `null` = candidato genuinamente sem essa plataforma indexada (SoundchartsNotFoundError). Qualquer outro erro é PROPAGADO — nunca vira cohort vazio (item 9). */
  private async fetchMetric(uuid: string, metricKey: MetricKey): Promise<number | null> {
    const platform = PLATFORM_BY_METRIC.get(metricKey);
    if (!platform) return null;
    try {
      switch (platform) {
        case 'spotify': return (await this.soundcharts.getSpotifyMonthlyListeners(uuid)).value;
        case 'youtube': return (await this.soundcharts.getYouTubeAudience(uuid)).subscribers.value;
        case 'deezer': return (await this.soundcharts.getDeezerFans(uuid)).value;
        case 'soundcloud': return (await this.soundcharts.getSoundCloudFollowers(uuid)).value;
        case 'instagram': return (await this.soundcharts.getInstagramFollowers(uuid)).value;
        case 'tiktok': return (await this.soundcharts.getTikTokFollowers(uuid)).value;
        case 'apple-music': return null; // sem métrica de audiência comparável — nunca usado em BENCHMARK_METRICS hoje
      }
    } catch (err) {
      if (err instanceof SoundchartsNotFoundError) return null;
      throw err;
    }
  }

  private async upsert(uuid: string, name: string | null, countryCode: string | null, metricKey: MetricKey, value: number | null): Promise<void> {
    if (!this.repo) return;
    const now = new Date();
    try {
      await this.repo
        .createQueryBuilder()
        .insert()
        .into(MarketReferenceMetricEntity)
        .values({
          candidate_uuid: uuid,
          candidate_name: name,
          candidate_country_code: countryCode,
          metric: metricKey,
          value,
          fetched_at: now,
          observed_at: now,
          source_provider: 'soundcharts',
          updated_at: now,
        } as never)
        .orUpdate(['candidate_name', 'candidate_country_code', 'value', 'fetched_at', 'observed_at', 'updated_at'], ['candidate_uuid', 'metric'])
        .execute();
    } catch (err) {
      this.logger.warn(`[market-reference-cache] falha ao gravar cache de ${uuid}/${metricKey}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
