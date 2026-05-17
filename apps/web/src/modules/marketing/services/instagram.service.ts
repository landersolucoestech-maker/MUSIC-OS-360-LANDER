import { IntegrationError } from "@/shared/lib/errors";

export interface InstagramPostPayload {
  caption:      string;
  media_url:    string;
  media_type:   "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  hashtags?:    string[];
  location_id?: string;
}

export interface InstagramPostResult {
  id:           string;
  permalink:    string;
  timestamp:    string;
  media_type:   string;
}

export interface InstagramInsight {
  impressions:  number;
  reach:        number;
  likes:        number;
  comments:     number;
  saved:        number;
  video_views?: number;
}

async function delay(ms = 400) {
  return new Promise((r) => setTimeout(r, ms));
}

export const instagramService = {
  async publishPost(payload: InstagramPostPayload): Promise<InstagramPostResult> {
    await delay();
    const enabled = false;
    if (!enabled) {
      throw new IntegrationError(
        "instagram",
        "Publicação no Instagram não está habilitada neste ambiente. Configure a integração em Configurações → Integrações.",
      );
    }
    return {
      id:         `ig-mock-${Date.now()}`,
      permalink:  `https://www.instagram.com/p/mock-${Date.now()}/`,
      timestamp:  new Date().toISOString(),
      media_type: payload.media_type,
    };
  },

  async schedulePost(payload: InstagramPostPayload & { scheduled_publish_time: string }): Promise<{ id: string; status: "SCHEDULED" }> {
    await delay();
    const enabled = false;
    if (!enabled) {
      throw new IntegrationError(
        "instagram",
        "Agendamento no Instagram não está habilitado neste ambiente.",
      );
    }
    return { id: `ig-scheduled-${Date.now()}`, status: "SCHEDULED" };
  },

  async getInsights(mediaId: string): Promise<InstagramInsight> {
    await delay();
    return {
      impressions:  Math.floor(Math.random() * 8000 + 500),
      reach:        Math.floor(Math.random() * 5000 + 300),
      likes:        Math.floor(Math.random() * 600 + 10),
      comments:     Math.floor(Math.random() * 80),
      saved:        Math.floor(Math.random() * 200),
      video_views:  mediaId ? Math.floor(Math.random() * 3000) : undefined,
    };
  },
};
