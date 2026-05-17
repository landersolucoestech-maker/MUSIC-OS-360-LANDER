import { instagramService } from "./instagram.service";
import { tiktokService }   from "./tiktok.service";
import { youtubeService }  from "./youtube.service";
import type { ConteudoWithRelations } from "../types/marketing.types";
import { IntegrationError } from "@/shared/lib/errors";

export type PublishPlatform = "instagram" | "tiktok" | "youtube" | "facebook" | "twitter" | "linkedin";

export interface PublishNowResult {
  platform:    PublishPlatform;
  success:     boolean;
  url?:        string;
  error?:      string;
}

export interface SchedulePostResult {
  platform:    PublishPlatform;
  success:     boolean;
  id?:         string;
  scheduledAt?: string;
  error?:      string;
}

export interface PlatformAnalytics {
  impressions?:   number;
  reach?:         number;
  likes?:         number;
  comments?:      number;
  views?:         number;
  shares?:        number;
  saved?:         number;
  [key: string]:  number | undefined;
}

function getFirstPlatform(c: ConteudoWithRelations): PublishPlatform | null {
  const p = c.plataforma;
  const arr = Array.isArray(p) ? p : p ? [p] : [];
  return (arr[0] as PublishPlatform | undefined) ?? null;
}

function getMeta(c: ConteudoWithRelations): Record<string, unknown> {
  return ((c as Record<string, unknown>).meta_plataforma ?? {}) as Record<string, unknown>;
}

export const publishingService = {
  async schedulePost(
    conteudo: ConteudoWithRelations,
    scheduledAt: string,
  ): Promise<SchedulePostResult> {
    const platform = getFirstPlatform(conteudo);
    if (!platform) return { platform: "instagram", success: false, error: "Nenhuma plataforma selecionada" };

    const meta = getMeta(conteudo);

    try {
      if (platform === "instagram") {
        const r = await instagramService.schedulePost({
          conteudoId:  conteudo.id,
          caption:     conteudo.legenda ?? "",
          hashtags:    (meta.hashtags as string[] | undefined) ?? [],
          location:    (meta.location  as string | undefined),
          media_type:  (meta.carrossel as boolean) ? "CAROUSEL_ALBUM" : "IMAGE",
          scheduledAt,
        });
        return { platform, success: true, id: r.id, scheduledAt: r.scheduledAt };
      }

      if (platform === "tiktok") {
        const r = await tiktokService.schedulePost({
          conteudoId:    conteudo.id,
          title:         conteudo.titulo ?? "",
          privacy_level: (meta.tkPrivacy as "public" | "friends" | "private" | undefined) ?? "public",
          duration_secs: (meta.tkDuration as number | undefined),
          thumbnail_url: (meta.tkThumbnail as string | undefined),
          scheduledAt,
        });
        return { platform, success: true, id: r.id, scheduledAt: r.scheduledAt };
      }

      if (platform === "youtube") {
        const r = await youtubeService.schedulePost({
          conteudoId:     conteudo.id,
          title:          conteudo.titulo ?? "",
          description:    conteudo.legenda ?? "",
          tags:           (meta.ytTags     as string[] | undefined) ?? [],
          privacy_status: (meta.ytPrivacy  as "public" | "unlisted" | "private" | undefined) ?? "public",
          thumbnail_url:  (meta.ytThumbnail as string | undefined),
          scheduledAt,
        });
        return { platform, success: true, id: r.id, scheduledAt: r.scheduledAt };
      }

      throw new IntegrationError(platform, `Agendamento em ${platform} não disponível.`);
    } catch (err) {
      return { platform, success: false, error: err instanceof Error ? err.message : "Erro desconhecido" };
    }
  },

  async publishNow(conteudo: ConteudoWithRelations): Promise<PublishNowResult> {
    const platform = getFirstPlatform(conteudo);
    if (!platform) return { platform: "instagram", success: false, error: "Nenhuma plataforma selecionada" };

    try {
      if (platform === "instagram") {
        const r = await instagramService.publishNow(conteudo.id);
        return { platform, success: true, url: r.url };
      }
      if (platform === "tiktok") {
        const r = await tiktokService.publishNow(conteudo.id);
        return { platform, success: true, url: r.url };
      }
      if (platform === "youtube") {
        const r = await youtubeService.publishNow(conteudo.id);
        return { platform, success: true, url: r.url };
      }
      throw new IntegrationError(platform, `Publicação em ${platform} não disponível.`);
    } catch (err) {
      return { platform, success: false, error: err instanceof Error ? err.message : "Erro desconhecido" };
    }
  },

  async getAnalytics(conteudo: ConteudoWithRelations): Promise<PlatformAnalytics> {
    const platform = getFirstPlatform(conteudo);
    if (!platform) return {};

    if (platform === "instagram") {
      const r = await instagramService.getAnalytics(conteudo.id);
      return { impressions: r.impressions, reach: r.reach, likes: r.likes, comments: r.comments, saved: r.saved };
    }
    if (platform === "tiktok") {
      const r = await tiktokService.getAnalytics(conteudo.id);
      return { views: r.view_count, likes: r.like_count, comments: r.comment_count, shares: r.share_count };
    }
    if (platform === "youtube") {
      const r = await youtubeService.getAnalytics(conteudo.id);
      return { views: r.view_count, likes: r.like_count, comments: r.comment_count };
    }
    return {};
  },
};
