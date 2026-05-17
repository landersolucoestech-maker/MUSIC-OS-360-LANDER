import { MOCK_MODE } from "@/shared/lib/env";
import { NotImplementedError } from "@/shared/lib/errors";

export interface InstagramSchedulePayload {
  conteudoId:   string;
  caption:      string;
  media_url?:   string;
  media_type?:  "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  hashtags?:    string[];
  location?:    string;
  scheduledAt:  string;
}

export interface InstagramAnalytics {
  impressions:  number;
  reach:        number;
  likes:        number;
  comments:     number;
  saved:        number;
  video_views?: number;
}

async function delay(ms = 350) {
  return new Promise((r) => setTimeout(r, ms));
}

export const instagramService = {
  async schedulePost(payload: InstagramSchedulePayload): Promise<{ id: string; scheduledAt: string }> {
    if (MOCK_MODE) {
      await delay();
      return { id: `ig-sched-${Date.now()}`, scheduledAt: payload.scheduledAt };
    }
    throw new NotImplementedError(
      "instagram.schedulePost",
      "Integração Instagram não disponível em produção. Ative em Configurações → Integrações.",
    );
  },

  async publishNow(conteudoId: string): Promise<{ url: string }> {
    if (MOCK_MODE) {
      await delay();
      return { url: `https://www.instagram.com/p/mock-${conteudoId}/` };
    }
    throw new NotImplementedError(
      "instagram.publishNow",
      "Integração Instagram não disponível em produção. Ative em Configurações → Integrações.",
    );
  },

  async getAnalytics(conteudoId: string): Promise<InstagramAnalytics> {
    await delay(200);
    return {
      impressions:  Math.floor(Math.random() * 8000 + 500),
      reach:        Math.floor(Math.random() * 5000 + 300),
      likes:        Math.floor(Math.random() * 600 + 10),
      comments:     Math.floor(Math.random() * 80),
      saved:        Math.floor(Math.random() * 200),
      video_views:  conteudoId ? Math.floor(Math.random() * 3000) : undefined,
    };
  },
};
