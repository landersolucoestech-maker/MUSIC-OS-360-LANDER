/**
 * integrations/adapters/streaming.adapter.ts
 *
 * Adapter de métricas de streaming e ads.
 * Resolve providers mock (standalone) ou reais (produção via backend proxy).
 *
 * REGRA: o frontend NUNCA acede a tokens OAuth de plataformas streaming.
 * Em produção, todas as chamadas passam por /api/streaming/:platform/*.
 *
 * Uso:
 *   import { getStreamingAdapter, getAdsAdapter } from "@/modules/integrations/adapters/streaming.adapter";
 *   const spotify  = getStreamingAdapter("spotify");
 *   const metrics  = await spotify.getArtistMetrics(artistId, "30d");
 */

import type {
  IStreamingProvider,
  IAdsProvider,
  StreamingPlatformId,
  AdsPlatformId,
} from "@/modules/integrations/dto";
import { MOCK_MODE } from "@/shared/lib/env";
import { makeMockStreamingProvider, makeMockAdsProvider } from "@/modules/integrations/providers";

const _streamingCache = new Map<StreamingPlatformId, IStreamingProvider>();
const _adsCache       = new Map<AdsPlatformId, IAdsProvider>();

export function getStreamingAdapter(platform: StreamingPlatformId): IStreamingProvider {
  if (_streamingCache.has(platform)) return _streamingCache.get(platform)!;

  let provider: IStreamingProvider;

  if (MOCK_MODE) {
    provider = makeMockStreamingProvider(platform);
  } else {
    // PRODUÇÃO: BackendStreamingProvider que chama:
    //   GET /api/streaming/:platform/artist/:artistId?period=...
    //   GET /api/streaming/:platform/track/:isrc?period=...
    //   O backend usa os tokens OAuth de cada plataforma (server-side, nunca expostos).
    // import { BackendStreamingProvider } from "@/modules/integrations/providers/backend/backend-streaming.provider";
    // provider = new BackendStreamingProvider(platform);
    provider = makeMockStreamingProvider(platform); // fallback
  }

  _streamingCache.set(platform, provider);
  return provider;
}

export function getAdsAdapter(platform: AdsPlatformId): IAdsProvider {
  if (_adsCache.has(platform)) return _adsCache.get(platform)!;

  let provider: IAdsProvider;

  if (MOCK_MODE) {
    provider = makeMockAdsProvider(platform);
  } else {
    // PRODUÇÃO: BackendAdsProvider
    //   GET /api/ads/:platform/campaigns
    // import { BackendAdsProvider } from "@/modules/integrations/providers/backend/backend-ads.provider";
    // provider = new BackendAdsProvider(platform);
    provider = makeMockAdsProvider(platform); // fallback
  }

  _adsCache.set(platform, provider);
  return provider;
}
