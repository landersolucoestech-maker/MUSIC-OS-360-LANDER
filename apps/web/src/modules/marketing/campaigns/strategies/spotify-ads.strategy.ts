import { BasePlatformStrategy, asset } from "./strategy.contract";

/** Spotify Ads (audio / video takeover / podcast). Streams is a valid objective. */
export class SpotifyAdsStrategy extends BasePlatformStrategy {
  constructor() {
    super({
      platform: "SPOTIFY_ADS",
      objectives: ["awareness", "streams", "traffic"],
      placements: ["audio_ads", "video_takeover", "podcast_ads"],
      requiredAssets: [
        asset("audio_30s", "Áudio 30s", true, "30s"),
        asset("click_url", "URL de clique", true),
      ],
      recommendedAssets: [
        asset("audio_15s", "Áudio 15s", false, "15s"),
        asset("cover_art", "Cover art", false),
      ],
      defaultObjective: "streams",
    });
  }
}
