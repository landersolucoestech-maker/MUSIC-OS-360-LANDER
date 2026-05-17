import { IntegrationError } from "@/shared/lib/errors";

export interface TikTokPostPayload {
  title:         string;
  video_url:     string;
  privacy_level: "PUBLIC_TO_EVERYONE" | "MUTUAL_FOLLOW_FRIENDS" | "SELF_ONLY";
  disable_duet?: boolean;
  disable_stitch?: boolean;
  disable_comment?: boolean;
}

export interface TikTokPostResult {
  publish_id: string;
  share_url?: string;
}

export interface TikTokVideoStats {
  view_count:    number;
  like_count:    number;
  comment_count: number;
  share_count:   number;
  play_count:    number;
}

async function delay(ms = 400) {
  return new Promise((r) => setTimeout(r, ms));
}

export const tiktokService = {
  async publishVideo(payload: TikTokPostPayload): Promise<TikTokPostResult> {
    await delay();
    const enabled = false;
    if (!enabled) {
      throw new IntegrationError(
        "tiktok",
        "Publicação no TikTok não está habilitada. Configure a integração em Configurações → Integrações.",
      );
    }
    return {
      publish_id: `tt-mock-${Date.now()}`,
      share_url:  `https://www.tiktok.com/@user/video/mock-${Date.now()}`,
    };
  },

  async scheduleVideo(payload: TikTokPostPayload & { scheduled_publish_time: string }): Promise<{ publish_id: string; status: "SCHEDULED" }> {
    await delay();
    const enabled = false;
    if (!enabled) {
      throw new IntegrationError(
        "tiktok",
        "Agendamento no TikTok não está habilitado neste ambiente.",
      );
    }
    return { publish_id: `tt-scheduled-${Date.now()}`, status: "SCHEDULED" };
  },

  async getVideoStats(videoId: string): Promise<TikTokVideoStats> {
    await delay();
    return {
      view_count:    Math.floor(Math.random() * 50000 + 1000),
      like_count:    Math.floor(Math.random() * 5000 + 50),
      comment_count: Math.floor(Math.random() * 300),
      share_count:   Math.floor(Math.random() * 1000),
      play_count:    videoId ? Math.floor(Math.random() * 80000 + 2000) : 0,
    };
  },
};
