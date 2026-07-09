import type {
  AdsPlatformId,
  IAdsProvider,
  IStreamingProvider,
  StreamingPlatformId,
} from "@/modules/integrations/dto";
import { createUnavailableAdsProvider, createUnavailableStreamingProvider } from "./unavailable.provider";

const streamingCache = new Map<StreamingPlatformId, IStreamingProvider>();
const adsCache = new Map<AdsPlatformId, IAdsProvider>();

export function getStreamingAdapter(platform: StreamingPlatformId): IStreamingProvider {
  const cached = streamingCache.get(platform);
  if (cached) return cached;
  const provider = createUnavailableStreamingProvider(platform);
  streamingCache.set(platform, provider);
  return provider;
}

export function getAdsAdapter(platform: AdsPlatformId): IAdsProvider {
  const cached = adsCache.get(platform);
  if (cached) return cached;
  const provider = createUnavailableAdsProvider(platform);
  adsCache.set(platform, provider);
  return provider;
}
