import { instagramService } from "./instagram.service";
import { tiktokService }   from "./tiktok.service";
import { youtubeService }  from "./youtube.service";
import type { ConteudoWithRelations } from "../types/marketing.types";
import { IntegrationError } from "@/shared/lib/errors";

export type PublishPlatform = "instagram" | "tiktok" | "youtube" | "facebook" | "twitter" | "linkedin";

export interface PublishResult {
  platform:  PublishPlatform;
  success:   boolean;
  external_id?: string;
  url?:         string;
  error?:       string;
}

export interface ScheduleResult {
  platform:   PublishPlatform;
  success:    boolean;
  scheduled_at: string;
  error?:     string;
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
  async publish(conteudo: ConteudoWithRelations, mediaUrl = ""): Promise<PublishResult> {
    const platform = getFirstPlatform(conteudo);
    if (!platform) return { platform: "instagram", success: false, error: "Nenhuma plataforma selecionada" };

    const meta = getMeta(conteudo);

    try {
      if (platform === "instagram") {
        const result = await instagramService.publishPost({
          caption:    conteudo.legenda ?? "",
          media_url:  mediaUrl,
          media_type: (meta.carrossel as boolean) ? "CAROUSEL_ALBUM" : "IMAGE",
          hashtags:   (meta.hashtags as string[] | undefined) ?? [],
          location_id: (meta.location as string | undefined),
        });
        return { platform, success: true, external_id: result.id, url: result.permalink };
      }

      if (platform === "tiktok") {
        const result = await tiktokService.publishVideo({
          title:         conteudo.titulo ?? "",
          video_url:     mediaUrl,
          privacy_level: (meta.tkPrivacy === "friends" ? "MUTUAL_FOLLOW_FRIENDS" : meta.tkPrivacy === "private" ? "SELF_ONLY" : "PUBLIC_TO_EVERYONE"),
        });
        return { platform, success: true, external_id: result.publish_id, url: result.share_url };
      }

      if (platform === "youtube") {
        const result = await youtubeService.uploadVideo({
          title:          conteudo.titulo ?? "",
          description:    conteudo.legenda ?? "",
          tags:           (meta.ytTags as string[] | undefined) ?? [],
          privacy_status: (meta.ytPrivacy as "public" | "unlisted" | "private" | undefined) ?? "public",
          video_url:      mediaUrl,
        });
        return { platform, success: true, external_id: result.id, url: result.url };
      }

      throw new IntegrationError(platform, `Publicação em ${platform} não está disponível.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      return { platform, success: false, error: msg };
    }
  },

  async schedule(conteudo: ConteudoWithRelations, scheduledAt: string, mediaUrl = ""): Promise<ScheduleResult> {
    const platform = getFirstPlatform(conteudo);
    if (!platform) return { platform: "instagram", success: false, scheduled_at: scheduledAt, error: "Nenhuma plataforma selecionada" };

    const meta = getMeta(conteudo);

    try {
      if (platform === "instagram") {
        await instagramService.schedulePost({
          caption:    conteudo.legenda ?? "",
          media_url:  mediaUrl,
          media_type: (meta.carrossel as boolean) ? "CAROUSEL_ALBUM" : "IMAGE",
          hashtags:   (meta.hashtags as string[] | undefined) ?? [],
          scheduled_publish_time: scheduledAt,
        });
        return { platform, success: true, scheduled_at: scheduledAt };
      }

      if (platform === "tiktok") {
        await tiktokService.scheduleVideo({
          title:         conteudo.titulo ?? "",
          video_url:     mediaUrl,
          privacy_level: (meta.tkPrivacy === "friends" ? "MUTUAL_FOLLOW_FRIENDS" : meta.tkPrivacy === "private" ? "SELF_ONLY" : "PUBLIC_TO_EVERYONE"),
          scheduled_publish_time: scheduledAt,
        });
        return { platform, success: true, scheduled_at: scheduledAt };
      }

      if (platform === "youtube") {
        await youtubeService.scheduleVideo({
          title:          conteudo.titulo ?? "",
          description:    conteudo.legenda ?? "",
          tags:           (meta.ytTags as string[] | undefined) ?? [],
          privacy_status: (meta.ytPrivacy as "public" | "unlisted" | "private" | undefined) ?? "public",
          video_url:      mediaUrl,
          publish_at:     scheduledAt,
        });
        return { platform, success: true, scheduled_at: scheduledAt };
      }

      throw new IntegrationError(platform, `Agendamento em ${platform} não está disponível.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      return { platform, success: false, scheduled_at: scheduledAt, error: msg };
    }
  },
};
