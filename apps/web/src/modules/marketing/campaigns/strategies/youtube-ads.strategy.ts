import { BasePlatformStrategy, asset } from "./strategy.contract";

/** YouTube Ads (in-stream / in-feed / shorts / bumper). */
export class YouTubeAdsStrategy extends BasePlatformStrategy {
  constructor() {
    super({
      platform: "YOUTUBE_ADS",
      objectives: ["awareness", "views", "traffic", "conversions"],
      placements: ["in_stream", "in_feed_video", "shorts", "bumper"],
      requiredAssets: [
        asset("video", "Vídeo", true),
        asset("final_url", "URL final", true),
      ],
      recommendedAssets: [asset("thumbnail", "Thumbnail", false)],
      defaultObjective: "awareness",
    });
  }
}
