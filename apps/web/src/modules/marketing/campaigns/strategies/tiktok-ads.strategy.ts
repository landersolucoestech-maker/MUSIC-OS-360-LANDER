import { BasePlatformStrategy, asset } from "./strategy.contract";

/** TikTok Ads (feed / spark ads / top view). */
export class TikTokAdsStrategy extends BasePlatformStrategy {
  constructor() {
    super({
      platform: "TIKTOK_ADS",
      objectives: ["awareness", "engagement", "traffic", "conversions"],
      placements: ["tiktok_feed", "spark_ads", "top_view"],
      requiredAssets: [
        asset("video_9x16", "Vídeo 9:16", true, "9:16"),
        asset("final_url", "URL final", true),
      ],
      recommendedAssets: [
        asset("caption", "Legenda", false),
        asset("call_to_action", "Call to action", false),
      ],
      defaultObjective: "engagement",
    });
  }
}
