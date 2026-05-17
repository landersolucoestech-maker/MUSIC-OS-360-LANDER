import { MOCK_MODE } from "@/shared/lib/env";
import { IntegrationError } from "@/shared/lib/errors";
import { getOAuthConnection } from "./platform-tokens";

export interface TikTokSchedulePayload {
  conteudoId:    string;
  title:         string;
  video_url?:    string;
  privacy_level: "public" | "friends" | "private";
  duration_secs?: number;
  thumbnail_url?: string;
  scheduledAt:   string;
}

/**
 * Payload for immediate publishing.
 * video_url is required for real TikTok publishing (Content Posting API requires a video source).
 */
export interface TikTokPublishNowPayload {
  conteudoId:     string;
  title:          string;
  video_url?:     string;
  privacy_level?: "public" | "friends" | "private";
  duration_secs?: number;
  thumbnail_url?: string;
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

// ─── TikTok Content Posting API helpers ───────────────────────────────────────

const TIKTOK_API_BASE = "https://open.tiktokapis.com/v2";

const PRIVACY_MAP: Record<string, string> = {
  public:  "PUBLIC_TO_EVERYONE",
  friends: "MUTUAL_FOLLOW_FRIENDS",
  private: "SELF_ONLY",
};

async function tiktokCall<T>(
  method: "GET" | "POST",
  path: string,
  token: string,
  body?: Record<string, unknown>,
  fields?: string,
): Promise<T> {
  let url = `${TIKTOK_API_BASE}${path}`;
  if (fields) url = `${url}?fields=${encodeURIComponent(fields)}`;

  const init: RequestInit = {
    method,
    headers: {
      Authorization:  `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  };

  const res  = await fetch(url, init);
  const json = (await res.json()) as Record<string, unknown>;

  const errData = (json["error"] as Record<string, unknown> | undefined);
  if (!res.ok || (errData && errData["code"] !== "ok")) {
    const msg =
      (errData?.["message"] as string | undefined) ??
      (errData?.["code"]    as string | undefined) ??
      res.statusText;
    throw new IntegrationError("tiktok", msg, {
      statusCode: res.status,
      retryable:  res.status >= 500,
    });
  }
  return (json["data"] ?? json) as T;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const tiktokService = {
  async schedulePost(payload: TikTokSchedulePayload): Promise<{ id: string; scheduledAt: string }> {
    if (MOCK_MODE) {
      await delay();
      return { id: `tt-sched-${Date.now()}`, scheduledAt: payload.scheduledAt };
    }

    const conn = getOAuthConnection(["corp_tiktok", "tiktok_business"]);
    if (!conn) throw IntegrationError.notConfigured("tiktok");

    if (!payload.video_url) {
      throw new IntegrationError(
        "tiktok",
        "URL do vídeo é necessária para agendamento no TikTok.",
        { retryable: false },
      );
    }

    const token = conn.access_token!;
    const schedEpoch = Math.floor(new Date(payload.scheduledAt).getTime() / 1000);

    const postInfo: Record<string, unknown> = {
      title:           payload.title,
      privacy_level:   PRIVACY_MAP[payload.privacy_level] ?? "PUBLIC_TO_EVERYONE",
      disable_duet:    false,
      disable_comment: false,
      disable_stitch:  false,
      scheduled_publish_time: schedEpoch,
    };
    if (payload.duration_secs) postInfo["duration"] = payload.duration_secs;

    const result = await tiktokCall<{ publish_id: string }>(
      "POST",
      "/post/publish/video/init/",
      token,
      {
        post_info:   postInfo,
        source_info: { source: "PULL_FROM_URL", video_url: payload.video_url },
      },
    );

    return { id: result.publish_id, scheduledAt: payload.scheduledAt };
  },

  async publishNow(payload: TikTokPublishNowPayload): Promise<{ url: string; external_id: string }> {
    if (MOCK_MODE) {
      await delay();
      const id = `tt-pub-${payload.conteudoId}`;
      return { url: `https://www.tiktok.com/@user/video/${id}`, external_id: id };
    }

    const conn = getOAuthConnection(["corp_tiktok", "tiktok_business"]);
    if (!conn) throw IntegrationError.notConfigured("tiktok");

    if (!payload.video_url) {
      throw new IntegrationError(
        "tiktok",
        "URL do vídeo é necessária para publicação no TikTok. Adicione um vídeo ao conteúdo.",
        { retryable: false },
      );
    }

    const token = conn.access_token!;

    const postInfo: Record<string, unknown> = {
      title:           payload.title,
      privacy_level:   PRIVACY_MAP[payload.privacy_level ?? "public"] ?? "PUBLIC_TO_EVERYONE",
      disable_duet:    false,
      disable_comment: false,
      disable_stitch:  false,
    };
    if (payload.duration_secs) postInfo["duration"] = payload.duration_secs;

    // Step 1: Initiate publish — returns a publish_id (job tracker, NOT a video id)
    const initResult = await tiktokCall<{ publish_id: string }>(
      "POST",
      "/post/publish/video/init/",
      token,
      {
        post_info:   postInfo,
        source_info: { source: "PULL_FROM_URL", video_url: payload.video_url },
      },
    );

    const publishId = initResult.publish_id;

    // Step 2: Poll /post/publish/status/fetch/ until PUBLISH_COMPLETE to get video_id.
    // TikTok processes the video asynchronously; typical latency is a few seconds.
    // We poll up to 8 times with 2 s gaps (≤16 s total).
    let videoId: string | null = null;
    const MAX_POLLS = 8;
    const POLL_INTERVAL_MS = 2000;

    for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

      const statusData = await tiktokCall<{
        status: string;
        video_id?: string;
        fail_reason?: string;
      }>(
        "POST",
        "/post/publish/status/fetch/",
        token,
        { publish_id: publishId },
      );

      if (statusData.status === "PUBLISH_COMPLETE" && statusData.video_id) {
        videoId = statusData.video_id;
        break;
      }

      if (statusData.status === "FAILED") {
        throw new IntegrationError(
          "tiktok",
          `TikTok recusou a publicação: ${statusData.fail_reason ?? "motivo desconhecido"}`,
          { statusCode: 422, retryable: false },
        );
      }
    }

    if (!videoId) {
      // Publish job is still processing after poll timeout — return publish_id as
      // a tracking reference; the video will be available shortly on TikTok.
      return {
        url: `https://www.tiktok.com/creator-center/content`,
        external_id: publishId,
      };
    }

    // Step 3: Fetch the canonical share_url for the now-live video
    const videoData = await tiktokCall<{ videos: Array<{ id: string; share_url: string }> }>(
      "POST",
      "/video/query/",
      token,
      { filters: { video_ids: [videoId] } },
      "id,share_url",
    );

    const shareUrl =
      videoData.videos?.[0]?.share_url ??
      `https://www.tiktok.com/@user/video/${videoId}`;

    return { url: shareUrl, external_id: videoId };
  },

  async getAnalytics(conteudoId: string): Promise<TikTokAnalytics> {
    if (MOCK_MODE) {
      await delay(200);
      return {
        view_count:    Math.floor(Math.random() * 50000 + 1000),
        like_count:    Math.floor(Math.random() * 5000 + 50),
        comment_count: Math.floor(Math.random() * 300),
        share_count:   Math.floor(Math.random() * 1000),
        play_count:    conteudoId ? Math.floor(Math.random() * 80000 + 2000) : 0,
      };
    }

    const conn = getOAuthConnection(["corp_tiktok", "tiktok_business"]);
    if (!conn) throw IntegrationError.notConfigured("tiktok");

    const token = conn.access_token!;

    const data = await tiktokCall<{ videos: Array<{ statistics: Record<string, number> }> }>(
      "POST",
      "/video/query/",
      token,
      { filters: { video_ids: [conteudoId] } },
      "id,statistics",
    );

    const stats = data.videos?.[0]?.statistics ?? {};
    return {
      view_count:    stats["view_count"]    ?? 0,
      like_count:    stats["like_count"]    ?? 0,
      comment_count: stats["comment_count"] ?? 0,
      share_count:   stats["share_count"]   ?? 0,
      play_count:    stats["play_count"]    ?? 0,
    };
  },
};
