import { MOCK_MODE } from "@/shared/lib/env";
import { IntegrationError } from "@/shared/lib/errors";

export interface TikTokSchedulePayload {
  conteudoId:    string;
  title:         string;
  video_url?:    string;
  privacy_level: "public" | "friends" | "private";
  duration_secs?: number;
  thumbnail_url?: string;
  scheduledAt:   string;
}

export interface TikTokAnalytics {
  view_count:    number;
  like_count:    number;
  comment_count: number;
  share_count:   number;
  play_count:    number;
}

async function delay(ms = 350) {
  return new Promise((r) => setTimeout(r, ms));
}

export const tiktokService = {
  async schedulePost(payload: TikTokSchedulePayload): Promise<{ id: string; scheduledAt: string }> {
    if (MOCK_MODE) {
      await delay();
      return { id: `tt-sched-${Date.now()}`, scheduledAt: payload.scheduledAt };
    }
    throw new IntegrationError(
      "tiktok",
      "TikTok API não configurada. Ative a integração em Configurações → Integrações.",
    );
  },

  async publishNow(conteudoId: string): Promise<{ url: string }> {
    if (MOCK_MODE) {
      await delay();
      return { url: `https://www.tiktok.com/@user/video/mock-${conteudoId}` };
    }
    throw new IntegrationError(
      "tiktok",
      "TikTok API não configurada. Ative a integração em Configurações → Integrações.",
    );
  },

  async getAnalytics(conteudoId: string): Promise<TikTokAnalytics> {
    await delay(200);
    return {
      view_count:    Math.floor(Math.random() * 50000 + 1000),
      like_count:    Math.floor(Math.random() * 5000 + 50),
      comment_count: Math.floor(Math.random() * 300),
      share_count:   Math.floor(Math.random() * 1000),
      play_count:    conteudoId ? Math.floor(Math.random() * 80000 + 2000) : 0,
    };
  },
};
