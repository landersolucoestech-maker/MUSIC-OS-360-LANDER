/**
 * marketing/adapters/meta-ads.adapter.ts
 *
 * Ponto de desacoplamento futuro: integração Meta Ads → domínio Marketing.
 *
 * ESTADO ATUAL: re-exporta os tipos e hooks do módulo marketing/hooks.
 * Todo código de marketing que depende do Meta Ads deve importar daqui,
 * isolando o contrato do adaptador do resto do domínio.
 *
 * MIGRAÇÃO FUTURA:
 * - MetaAdsConfigDialog já foi movido para marketing/components/
 * - Transformar useMetaAds em adaptador de porta: MarketingAdsPort
 * - Suportar múltiplos providers de ads (Google Ads, TikTok Ads, etc.)
 *   sob a mesma interface de porta
 *
 * Uso actual:
 *   import { useMetaAdsStatus } from "@/modules/marketing/adapters/meta-ads.adapter"
 */

export type { MetaAdsStatus } from "@/modules/marketing/hooks/useMetaAds";

export {
  useMetaAdsStatus,
  useMetaAdsSaveCredentials,
  useMetaAdsDeleteCredentials,
  useMetaAdsTestConnection,
} from "@/modules/marketing/hooks/useMetaAds";
