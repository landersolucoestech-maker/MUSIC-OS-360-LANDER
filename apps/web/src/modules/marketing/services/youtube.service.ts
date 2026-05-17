import { IntegrationError } from "@/shared/lib/errors";

export interface YouTubeVideoPayload {
  title:          string;
  description:    string;
  tags?:          string[];
  privacy_status: "public" | "unlisted" | "private";
  video_url:      string;
  thumbnail_url?: string;
  category_id?:  string;
}

export interface YouTubeVideoResult {
  id:            string;
  url:           string;
  thumbnail_url: string;
  title:         string;
}

export interface YouTubeVideoStats {
  view_count:     number;
  like_count:     number;
  comment_count:  number;
  subscriber_gained: number;
  watch_time_minutes: number;
}

async function delay(ms = 400) {
  return new Promise((r) => setTimeout(r, ms));
}

export const youtubeService = {
  async uploadVideo(payload: YouTubeVideoPayload): Promise<YouTubeVideoResult> {
    await delay();
    const enabled = false;
    if (!enabled) {
      throw new IntegrationError(
        "youtube",
        "Upload ao YouTube não está habilitado. Configure a integração em Configurações → Integrações.",
      );
    }
    const id = `yt-mock-${Date.now()}`;
    return {
      id,
      url:           `https://www.youtube.com/watch?v=${id}`,
      thumbnail_url: payload.thumbnail_url ?? `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
      title:         payload.title,
    };
  },

  async scheduleVideo(payload: YouTubeVideoPayload & { publish_at: string }): Promise<{ id: string; status: "scheduled" }> {
    await delay();
    const enabled = false;
    if (!enabled) {
      throw new IntegrationError(
        "youtube",
        "Agendamento no YouTube não está habilitado neste ambiente.",
      );
    }
    return { id: `yt-scheduled-${Date.now()}`, status: "scheduled" };
  },

  async getVideoStats(videoId: string): Promise<YouTubeVideoStats> {
    await delay();
    return {
      view_count:             Math.floor(Math.random() * 100000 + 500),
      like_count:             Math.floor(Math.random() * 8000 + 100),
      comment_count:          Math.floor(Math.random() * 500),
      subscriber_gained:      Math.floor(Math.random() * 200),
      watch_time_minutes:     videoId ? Math.floor(Math.random() * 50000 + 1000) : 0,
    };
  },
};
