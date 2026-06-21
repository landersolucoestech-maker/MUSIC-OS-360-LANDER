import { BasePlatformStrategy, asset } from "./strategy.contract";

/** Google Ads (Search / Display / Performance Max). */
export class GoogleAdsStrategy extends BasePlatformStrategy {
  constructor() {
    super({
      platform: "GOOGLE_ADS",
      objectives: ["traffic", "leads", "conversions", "awareness"],
      placements: ["search", "display", "performance_max"],
      requiredAssets: [
        asset("headlines", "Títulos", true),
        asset("descriptions", "Descrições", true),
        asset("final_url", "URL final", true),
      ],
      recommendedAssets: [asset("keywords", "Palavras-chave", false)],
      defaultObjective: "traffic",
    });
  }
}
