import { MOCK_MODE } from "@/shared/lib/env";
import { IntegrationError } from "@/shared/lib/errors";

export interface YouTubeSchedulePayload {
  conteudoId:     string;
  title:          string;
  description?:   string;
  tags?:          string[];
  privacy_status: "public" | "unlisted" | "private";
  video_url?:     string;
  thumbnail_url?: string;
  scheduledAt:    string;
}

export interface YouTubeAnalytics {
  view_count:              number;
  like_count:              number;
  comment_count:           number;
  subscriber_gained:       number;
  watch_time_minutes:      number;
}

async function delay(ms = 350) {
  return new Promise((r) => setTimeout(r, ms));
}

export const youtubeService = {
  async schedulePost(payload: YouTubeSchedulePayload): Promise<{ id: string; scheduledAt: string }> {
    if (MOCK_MODE) {
      await delay();
      return { id: `yt-sched-${Date.now()}`, scheduledAt: payload.scheduledAt };
    }
    throw new IntegrationError(
      "youtube",
      "YouTube API não configurada. Ative a integração em Configurações → Integrações.",
    );
  },

  async publishNow(conteudoId: string): Promise<{ url: string }> {
    if (MOCK_MODE) {
      await delay();
      const id = `yt-mock-${conteudoId}`;
      return { url: `https://www.youtube.com/watch?v=${id}` };
    }
    throw new IntegrationError(
      "youtube",
      "YouTube API não configurada. Ative a integração em Configurações → Integrações.",
    );
  },

  async getAnalytics(conteudoId: string): Promise<YouTubeAnalytics> {
    await delay(200);
    return {
      view_count:          Math.floor(Math.random() * 100000 + 500),
      like_count:          Math.floor(Math.random() * 8000 + 100),
      comment_count:       Math.floor(Math.random() * 500),
      subscriber_gained:   Math.floor(Math.random() * 200),
      watch_time_minutes:  conteudoId ? Math.floor(Math.random() * 50000 + 1000) : 0,
    };
  },
};
