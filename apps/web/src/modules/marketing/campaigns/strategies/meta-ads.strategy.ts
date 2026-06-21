import { BasePlatformStrategy, asset } from "./strategy.contract";

/** Meta Ads (Instagram + Facebook + Audience Network). */
export class MetaAdsStrategy extends BasePlatformStrategy {
  constructor() {
    super({
      platform: "META_ADS",
      objectives: ["awareness", "traffic", "engagement", "leads", "conversions"],
      placements: [
        "instagram_feed",
        "instagram_stories",
        "instagram_reels",
        "facebook_feed",
        "facebook_stories",
        "audience_network",
      ],
      requiredAssets: [
        asset("image_1080x1080", "Imagem 1080x1080", true, "1080x1080"),
        asset("final_url", "URL de destino", true),
      ],
      recommendedAssets: [
        asset("video_9x16", "Vídeo 9:16", false, "9:16"),
        asset("lead_form", "Formulário de leads", false),
      ],
      defaultObjective: "traffic",
    });
  }
}
