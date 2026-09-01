import { MarketBenchmarkService } from './market-benchmark.service';
import type { SoundchartsService } from '../../../integrations/soundcharts/soundcharts.service';
import type { MarketReferenceCacheService } from './market-reference-cache.service';
import type { MarketBenchmarkRefreshQueueService, EnqueueRefreshOutcome } from '../../../../queues/services/market-benchmark-refresh-queue.service';
import { MINIMUM_COHORT_SIZE, MARKET_BENCHMARK_ENGINE_VERSION } from './market-benchmark.config';

function ownRow(platform: string, overrides: Record<string, unknown> = {}) {
  return { platform, followers: null, subscribers: null, monthly_listeners: null, raw_payload: { soundcharts_uuid: 'target-uuid' }, ...overrides };
}

function snapshotRow(overrides: Record<string, unknown> = {}) {
  return {
    tenant_id: 't1', artist_id: 'a1', engine_version: MARKET_BENCHMARK_ENGINE_VERSION, status: 'OK',
    score: '77.20', label: 'Forte', cohort_definition: { sourceArtistUuid: 'target-uuid', countryFilter: 'BR', candidateCount: 20 },
    sample_size: 20, fallback_level: 1, metrics: [], calculated_at: new Date(),
    ...overrides,
  };
}

function buildFakeDs(ownRows: unknown[], snapshotFindOneResult: unknown = null, insertCapture: unknown[] = []) {
  const query = jest.fn(async (_sql: string, _params?: unknown[]) => ownRows);
  const repo = {
    insert: jest.fn(async (row: unknown) => { insertCapture.push(row); }),
    findOne: jest.fn(async () => snapshotFindOneResult),
  };
  return { ds: { query, getRepository: () => repo } as never, query, repo };
}

function candidatePool(n: number, countryCode: string | null = 'BR') {
  return Array.from({ length: n }, (_, i) => ({ uuid: `cand-${i}`, name: `Candidate ${i}`, countryCode }));
}

function candidateMetric(uuid: string, metricKey: string, value: number) {
  return { candidateUuid: uuid, metricKey, value };
}

function fakeReferenceCache(candidates: unknown[], metrics: unknown[]) {
  return {
    ensureFreshCohort: jest.fn().mockResolvedValue({ candidates, metrics, stats: { candidatesConsidered: candidates.length, metricRequestCount: 0, cacheHits: 0, cacheMisses: 0 } }),
  } as unknown as MarketReferenceCacheService;
}

function fakeRefreshQueue(overrides: Partial<{ getRefreshState: () => Promise<string>; enqueueRefresh: () => Promise<EnqueueRefreshOutcome> }> = {}) {
  return {
    getRefreshState: jest.fn().mockResolvedValue('not_found'),
    enqueueRefresh: jest.fn().mockResolvedValue('enqueued'),
    ...overrides,
  } as unknown as MarketBenchmarkRefreshQueueService;
}

describe('MarketBenchmarkService.computeAndPersist (worker path — matemática inalterada da Fase 3.1)', () => {
  it('coorte externa real >= mínimo, mesmo país do artista-alvo: fallbackLevel=1, status OK', async () => {
    const { ds } = buildFakeDs([ownRow('spotify', { monthly_listeners: 5000 })]);
    const candidates = candidatePool(MINIMUM_COHORT_SIZE, 'BR');
    const metrics = candidates.map((c, i) => candidateMetric(c.uuid, 'spotify.monthly_listeners', 1000 + i * 100));
    const soundcharts = { getArtistCountryCode: jest.fn().mockResolvedValue('BR') } as unknown as SoundchartsService;
    const service = new MarketBenchmarkService(ds, soundcharts, fakeReferenceCache(candidates, metrics), fakeRefreshQueue());

    const { result } = await service.computeAndPersist('t1', 'a1', 'target-uuid');
    expect(result.status).toBe('OK');
    expect(result.fallbackLevel).toBe(1);
    expect(result.cohortDefinition.countryFilter).toBe('BR');
  });

  it('país desconhecido/coorte insuficiente no país: cai para fallbackLevel=2', async () => {
    const { ds } = buildFakeDs([ownRow('spotify', { monthly_listeners: 5000 })]);
    const candidates = [...candidatePool(3, 'BR'), ...candidatePool(MINIMUM_COHORT_SIZE, 'US')];
    const metrics = candidates.map((c, i) => candidateMetric(c.uuid, 'spotify.monthly_listeners', 1000 + i * 50));
    const soundcharts = { getArtistCountryCode: jest.fn().mockResolvedValue('BR') } as unknown as SoundchartsService;
    const service = new MarketBenchmarkService(ds, soundcharts, fakeReferenceCache(candidates, metrics), fakeRefreshQueue());

    const { result } = await service.computeAndPersist('t1', 'a1', 'target-uuid');
    expect(result.fallbackLevel).toBe(2);
    expect(result.sampleSize).toBe(candidates.length);
  });

  it('coorte insuficiente: INSUFFICIENT_MARKET_DATA, nunca percentil fictício', async () => {
    const { ds } = buildFakeDs([ownRow('spotify', { monthly_listeners: 5000 })]);
    const candidates = candidatePool(3, null);
    const metrics = candidates.map((c, i) => candidateMetric(c.uuid, 'spotify.monthly_listeners', 1000 + i));
    const soundcharts = { getArtistCountryCode: jest.fn().mockResolvedValue(null) } as unknown as SoundchartsService;
    const service = new MarketBenchmarkService(ds, soundcharts, fakeReferenceCache(candidates, metrics), fakeRefreshQueue());

    const { result } = await service.computeAndPersist('t1', 'a1', 'target-uuid');
    expect(result.status).toBe('INSUFFICIENT_MARKET_DATA');
    expect(result.score).toBeNull();
  });

  it('persiste um snapshot append-only por refresh', async () => {
    const inserted: unknown[] = [];
    const { ds } = buildFakeDs([ownRow('spotify', { monthly_listeners: 5000 })], null, inserted);
    const candidates = candidatePool(MINIMUM_COHORT_SIZE, 'BR');
    const metrics = candidates.map((c, i) => candidateMetric(c.uuid, 'spotify.monthly_listeners', 1000 + i));
    const soundcharts = { getArtistCountryCode: jest.fn().mockResolvedValue('BR') } as unknown as SoundchartsService;
    const service = new MarketBenchmarkService(ds, soundcharts, fakeReferenceCache(candidates, metrics), fakeRefreshQueue());

    await service.computeAndPersist('t1', 'a1', 'target-uuid');
    expect(inserted).toHaveLength(1);
  });

  it('SNAPSHOT DEDUP (item 24/25): resultado idêntico ao último snapshot não grava linha nova', async () => {
    const inserted: unknown[] = [];
    const candidates = candidatePool(MINIMUM_COHORT_SIZE, 'BR');
    const metrics = candidates.map((c, i) => candidateMetric(c.uuid, 'spotify.monthly_listeners', 1000 + i));
    const soundcharts = { getArtistCountryCode: jest.fn().mockResolvedValue('BR') } as unknown as SoundchartsService;
    const service1 = new MarketBenchmarkService(
      buildFakeDs([ownRow('spotify', { monthly_listeners: 5000 })], null, inserted).ds,
      soundcharts, fakeReferenceCache(candidates, metrics), fakeRefreshQueue(),
    );
    const { result: firstResult } = await service1.computeAndPersist('t1', 'a1', 'target-uuid');
    expect(inserted).toHaveLength(1);

    // Segunda rodada: mesmo resultado exato — findOne deve devolver o snapshot recém-gravado.
    const lastRow = snapshotRow({
      engine_version: firstResult.engineVersion, status: firstResult.status,
      score: firstResult.score != null ? firstResult.score.toFixed(2) : null, label: firstResult.label,
      sample_size: firstResult.sampleSize, fallback_level: firstResult.fallbackLevel, metrics: firstResult.metrics,
    });
    const { ds: ds2 } = buildFakeDs([ownRow('spotify', { monthly_listeners: 5000 })], lastRow, inserted);
    const service2 = new MarketBenchmarkService(ds2, soundcharts, fakeReferenceCache(candidates, metrics), fakeRefreshQueue());
    await service2.computeAndPersist('t1', 'a1', 'target-uuid');
    expect(inserted).toHaveLength(1); // ainda 1 — não duplicou
  });

  it('CROSS-TENANT: coorte externa nunca carrega tenant_id — dado público compartilhável', async () => {
    const { ds } = buildFakeDs([ownRow('spotify', { monthly_listeners: 5000 })]);
    const candidates = candidatePool(MINIMUM_COHORT_SIZE, 'BR');
    const metrics = candidates.map((c, i) => candidateMetric(c.uuid, 'spotify.monthly_listeners', 1000 + i));
    const soundcharts = { getArtistCountryCode: jest.fn().mockResolvedValue('BR') } as unknown as SoundchartsService;
    const service = new MarketBenchmarkService(ds, soundcharts, fakeReferenceCache(candidates, metrics), fakeRefreshQueue());

    await service.computeAndPersist('tenant-A', 'artist-A', 'target-uuid');
    expect(candidates.every((c) => !('tenant_id' in (c as object)))).toBe(true);
  });
});

describe('MarketBenchmarkService.getStatus (read path — item 26: sempre rápido, sem chamada Soundcharts)', () => {
  it('sem UUID Soundcharts resolvido: READY instantâneo com resultado vazio, nunca enfileira refresh', async () => {
    const { ds } = buildFakeDs([]);
    const soundcharts = {} as unknown as SoundchartsService;
    const referenceCache = { ensureFreshCohort: jest.fn() } as unknown as MarketReferenceCacheService;
    const refreshQueue = fakeRefreshQueue();
    const service = new MarketBenchmarkService(ds, soundcharts, referenceCache, refreshQueue);

    const status = await service.getStatus('t1', 'a1');
    expect(status.readStatus).toBe('READY');
    expect(status.result?.status).toBe('INSUFFICIENT_MARKET_DATA');
    expect(refreshQueue.enqueueRefresh).not.toHaveBeenCalled();
    expect(referenceCache.ensureFreshCohort).not.toHaveBeenCalled();
  });

  it('snapshot fresco (dentro do TTL, mesma engine_version): READY, serve na hora, NUNCA chama Soundcharts', async () => {
    const { ds } = buildFakeDs([ownRow('spotify')], snapshotRow({ calculated_at: new Date() }));
    const soundcharts = { getArtistCountryCode: jest.fn() } as unknown as SoundchartsService;
    const referenceCache = { ensureFreshCohort: jest.fn() } as unknown as MarketReferenceCacheService;
    const refreshQueue = fakeRefreshQueue();
    const service = new MarketBenchmarkService(ds, soundcharts, referenceCache, refreshQueue);

    const status = await service.getStatus('t1', 'a1');
    expect(status.readStatus).toBe('READY');
    expect(status.result?.score).toBe(77.2);
    expect(refreshQueue.enqueueRefresh).not.toHaveBeenCalled();
    expect(referenceCache.ensureFreshCohort).not.toHaveBeenCalled();
    expect(soundcharts.getArtistCountryCode).not.toHaveBeenCalled();
  });

  it('snapshot stale (fora do TTL): STALE, serve o último resultado E enfileira refresh em background', async () => {
    const staleDate = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const { ds } = buildFakeDs([ownRow('spotify')], snapshotRow({ calculated_at: staleDate }));
    const soundcharts = {} as unknown as SoundchartsService;
    const referenceCache = { ensureFreshCohort: jest.fn() } as unknown as MarketReferenceCacheService;
    const refreshQueue = fakeRefreshQueue();
    const service = new MarketBenchmarkService(ds, soundcharts, referenceCache, refreshQueue);

    const status = await service.getStatus('t1', 'a1');
    expect(status.readStatus).toBe('STALE');
    expect(status.result?.score).toBe(77.2); // último resultado, não null
    expect(status.staleSince).toBe(staleDate.toISOString());
    expect(refreshQueue.enqueueRefresh).toHaveBeenCalledWith('t1', 'a1', 'target-uuid', MARKET_BENCHMARK_ENGINE_VERSION, 'stale');
    expect(referenceCache.ensureFreshCohort).not.toHaveBeenCalled(); // getStatus NUNCA calcula direto
  });

  it('engine_version mudou desde o último snapshot: tratado como STALE (nunca apresentado como resultado da versão atual)', async () => {
    const { ds } = buildFakeDs([ownRow('spotify')], snapshotRow({ engine_version: '1.0.0', calculated_at: new Date() }));
    const soundcharts = {} as unknown as SoundchartsService;
    const refreshQueue = fakeRefreshQueue();
    const service = new MarketBenchmarkService(ds, soundcharts, { ensureFreshCohort: jest.fn() } as unknown as MarketReferenceCacheService, refreshQueue);

    const status = await service.getStatus('t1', 'a1');
    expect(status.readStatus).toBe('STALE');
    expect(status.result?.engineVersion).toBe('1.0.0'); // preserva a versão antiga no resultado servido — nunca finge ser a atual
    expect(refreshQueue.enqueueRefresh).toHaveBeenCalled();
  });

  it('nenhum snapshot ainda: REFRESHING, enfileira refresh, result=null (nunca calcula na hora)', async () => {
    const { ds } = buildFakeDs([ownRow('spotify')], null);
    const soundcharts = {} as unknown as SoundchartsService;
    const referenceCache = { ensureFreshCohort: jest.fn() } as unknown as MarketReferenceCacheService;
    const refreshQueue = fakeRefreshQueue();
    const service = new MarketBenchmarkService(ds, soundcharts, referenceCache, refreshQueue);

    const status = await service.getStatus('t1', 'a1');
    expect(status.readStatus).toBe('REFRESHING');
    expect(status.result).toBeNull();
    expect(refreshQueue.enqueueRefresh).toHaveBeenCalledWith('t1', 'a1', 'target-uuid', MARKET_BENCHMARK_ENGINE_VERSION, 'cold');
    expect(referenceCache.ensureFreshCohort).not.toHaveBeenCalled();
  });

  it('CONCORRÊNCIA (item 8): refresh já em andamento (job active) e sem snapshot: REFRESHING, NÃO reenfileira outro job', async () => {
    const { ds } = buildFakeDs([ownRow('spotify')], null);
    const soundcharts = {} as unknown as SoundchartsService;
    const refreshQueue = fakeRefreshQueue({ getRefreshState: jest.fn().mockResolvedValue('active') });
    const service = new MarketBenchmarkService(ds, soundcharts, {} as unknown as MarketReferenceCacheService, refreshQueue);

    const status = await service.getStatus('t1', 'a1');
    expect(status.readStatus).toBe('REFRESHING');
    expect(refreshQueue.enqueueRefresh).not.toHaveBeenCalled();
  });

  it('CONCORRÊNCIA: refresh já em andamento (job waiting) e HÁ snapshot antigo: STALE servido, sem reenfileirar', async () => {
    const { ds } = buildFakeDs([ownRow('spotify')], snapshotRow({ calculated_at: new Date(Date.now() - 48 * 60 * 60 * 1000) }));
    const soundcharts = {} as unknown as SoundchartsService;
    const refreshQueue = fakeRefreshQueue({ getRefreshState: jest.fn().mockResolvedValue('waiting') });
    const service = new MarketBenchmarkService(ds, soundcharts, {} as unknown as MarketReferenceCacheService, refreshQueue);

    const status = await service.getStatus('t1', 'a1');
    expect(status.readStatus).toBe('STALE');
    expect(status.result).not.toBeNull();
    expect(refreshQueue.enqueueRefresh).not.toHaveBeenCalled();
  });

  it('fila indisponível (Redis off) e sem snapshot: INTEGRATION_UNAVAILABLE', async () => {
    const { ds } = buildFakeDs([ownRow('spotify')], null);
    const soundcharts = {} as unknown as SoundchartsService;
    const refreshQueue = fakeRefreshQueue({ enqueueRefresh: jest.fn().mockResolvedValue('unavailable') });
    const service = new MarketBenchmarkService(ds, soundcharts, {} as unknown as MarketReferenceCacheService, refreshQueue);

    const status = await service.getStatus('t1', 'a1');
    expect(status.readStatus).toBe('INTEGRATION_UNAVAILABLE');
    expect(status.result).toBeNull();
  });

  it('falha ao enfileirar (erro inesperado) e sem snapshot: ERROR', async () => {
    const { ds } = buildFakeDs([ownRow('spotify')], null);
    const soundcharts = {} as unknown as SoundchartsService;
    const refreshQueue = fakeRefreshQueue({ enqueueRefresh: jest.fn().mockResolvedValue('error') });
    const service = new MarketBenchmarkService(ds, soundcharts, {} as unknown as MarketReferenceCacheService, refreshQueue);

    const status = await service.getStatus('t1', 'a1');
    expect(status.readStatus).toBe('ERROR');
  });

  it('fila indisponível MAS já existe snapshot: STALE servido (nunca ERROR quando há algo pra mostrar)', async () => {
    const { ds } = buildFakeDs([ownRow('spotify')], snapshotRow({ calculated_at: new Date(Date.now() - 48 * 60 * 60 * 1000) }));
    const soundcharts = {} as unknown as SoundchartsService;
    const refreshQueue = fakeRefreshQueue({ enqueueRefresh: jest.fn().mockResolvedValue('unavailable') });
    const service = new MarketBenchmarkService(ds, soundcharts, {} as unknown as MarketReferenceCacheService, refreshQueue);

    const status = await service.getStatus('t1', 'a1');
    expect(status.readStatus).toBe('STALE');
    expect(status.result).not.toBeNull();
  });
});
