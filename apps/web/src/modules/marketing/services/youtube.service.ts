import { MOCK_MODE } from "@/shared/lib/env";
import { IntegrationError } from "@/shared/lib/errors";
import { getOAuthConnection } from "./platform-tokens";

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

/**
 * Payload for immediate publishing.
 *
 * video_url is required for real YouTube publishing — the YouTube Data API v3
 * requires the actual video bytes to be uploaded (resumable upload).
 * This service uses the PULL_FROM_URL approach via a resumable upload session:
 * it fetches the video from video_url and streams it to YouTube.
 *
 * Note: large video uploads should be proxied through the backend upload service
 * (apps/api) to avoid browser memory limits and CORS restrictions.
 * For now, this implementation initiates the resumable session and performs
 * a best-effort single-chunk upload for smaller files.
 */
export interface YouTubePublishNowPayload {
  conteudoId:     string;
  title:          string;
  description?:   string;
  tags?:          string[];
  privacy_status?: "public" | "unlisted" | "private";
  video_url?:     string;
  thumbnail_url?: string;
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

// ─── YouTube Data API v3 helpers ──────────────────────────────────────────────

const YT_API_BASE = "https://www.googleapis.com/youtube/v3";
const YT_UPLOAD_BASE = "https://www.googleapis.com/upload/youtube/v3";

async function ytCall<T>(
  method: "GET" | "POST",
  path: string,
  token: string,
  params?: Record<string, string>,
  body?: Record<string, unknown>,
): Promise<T> {
  const qs = params
    ? "?" + new URLSearchParams(params).toString()
    : "";
  const url = `${YT_API_BASE}${path}${qs}`;

  const init: RequestInit = {
    method,
    headers: {
      Authorization:  `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  };

  const res  = await fetch(url, init);
  const json = (await res.json()) as Record<string, unknown>;

  if (!res.ok) {
    const errObj = (json["error"] as Record<string, unknown> | undefined);
    const msg    =
      (errObj?.["message"] as string | undefined) ??
      ((errObj?.["errors"] as Array<Record<string, string>> | undefined)?.[0]?.["message"]) ??
      res.statusText;
    throw new IntegrationError("youtube", msg, {
      statusCode: res.status,
      retryable:  res.status >= 500,
    });
  }
  return json as T;
}

/**
 * Initiates a YouTube resumable upload session and returns the session URL.
 * The caller is responsible for uploading the video bytes to the returned URL.
 */
async function initiateResumableUpload(
  token: string,
  metadata: Record<string, unknown>,
  contentType = "video/*",
): Promise<string> {
  const res = await fetch(
    `${YT_UPLOAD_BASE}/videos?uploadType=resumable&part=snippet,status`,
    {
      method: "POST",
      headers: {
        Authorization:            `Bearer ${token}`,
        "Content-Type":           "application/json",
        "X-Upload-Content-Type":  contentType,
      },
      body: JSON.stringify(metadata),
    },
  );

  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const errObj = (json["error"] as Record<string, unknown> | undefined);
    const msg    = (errObj?.["message"] as string | undefined) ?? res.statusText;
    throw new IntegrationError("youtube", msg, { statusCode: res.status, retryable: res.status >= 500 });
  }

  const location = res.headers.get("Location");
  if (!location) {
    throw new IntegrationError(
      "youtube",
      "Sessão de upload não iniciada — YouTube não retornou URL de upload.",
      { retryable: true },
    );
  }
  return location;
}

/**
 * Uploads video bytes from a URL via the YouTube resumable upload session.
 * Fetches the video from videoUrl and uploads it in a single PUT request.
 *
 * Limitation: this works for videos reachable via CORS-permissive URLs.
 * For large videos or private storage URLs, proxy through the backend service.
 */
async function uploadVideoFromUrl(
  uploadSessionUrl: string,
  videoUrl: string,
): Promise<{ id: string }> {
  let videoRes: Response;
  try {
    videoRes = await fetch(videoUrl);
  } catch {
    throw new IntegrationError(
      "youtube",
      `Não foi possível buscar o vídeo em "${videoUrl}". Use um URL acessível publicamente ou publique via o serviço de backend.`,
      { retryable: false },
    );
  }

  if (!videoRes.ok) {
    throw new IntegrationError(
      "youtube",
      `Erro ao buscar o vídeo (HTTP ${videoRes.status}). Verifique o URL do vídeo.`,
      { retryable: false },
    );
  }

  const contentType = videoRes.headers.get("Content-Type") ?? "video/mp4";
  const videoBlob   = await videoRes.blob();

  const uploadRes = await fetch(uploadSessionUrl, {
    method:  "PUT",
    headers: { "Content-Type": contentType },
    body:    videoBlob,
  });

  const json = (await uploadRes.json()) as Record<string, unknown>;

  if (!uploadRes.ok) {
    const errObj = (json["error"] as Record<string, unknown> | undefined);
    const msg    = (errObj?.["message"] as string | undefined) ?? uploadRes.statusText;
    throw new IntegrationError("youtube", msg, {
      statusCode: uploadRes.status,
      retryable:  uploadRes.status >= 500,
    });
  }

  return { id: json["id"] as string };
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const youtubeService = {
  async schedulePost(payload: YouTubeSchedulePayload): Promise<{ id: string; scheduledAt: string }> {
    if (MOCK_MODE) {
      await delay();
      return { id: `yt-sched-${Date.now()}`, scheduledAt: payload.scheduledAt };
    }

    const conn = getOAuthConnection(["corp_youtube", "youtube_business"]);
    if (!conn) throw IntegrationError.notConfigured("youtube");

    if (!payload.video_url) {
      throw new IntegrationError(
        "youtube",
        "URL do vídeo é necessária para agendamento no YouTube.",
        { retryable: false },
      );
    }

    const token = conn.access_token!;
    const metadata = {
      snippet: {
        title:       payload.title,
        description: payload.description ?? "",
        tags:        payload.tags ?? [],
      },
      status: {
        privacyStatus: "private",
        publishAt:     payload.scheduledAt,
        selfDeclaredMadeForKids: false,
      },
    };

    const uploadUrl = await initiateResumableUpload(token, metadata);
    const result    = await uploadVideoFromUrl(uploadUrl, payload.video_url);

    return { id: result.id, scheduledAt: payload.scheduledAt };
  },

  async publishNow(payload: YouTubePublishNowPayload): Promise<{ url: string; external_id: string }> {
    if (MOCK_MODE) {
      await delay();
      const id = `yt-pub-${payload.conteudoId}`;
      return { url: `https://www.youtube.com/watch?v=${id}`, external_id: id };
    }

    const conn = getOAuthConnection(["corp_youtube", "youtube_business"]);
    if (!conn) throw IntegrationError.notConfigured("youtube");

    if (!payload.video_url) {
      throw new IntegrationError(
        "youtube",
        "URL do vídeo é necessária para publicação no YouTube. Adicione um vídeo ao conteúdo.",
        { retryable: false },
      );
    }

    const token = conn.access_token!;
    const metadata = {
      snippet: {
        title:       payload.title,
        description: payload.description ?? "",
        tags:        payload.tags ?? [],
      },
      status: {
        privacyStatus: payload.privacy_status ?? "public",
        selfDeclaredMadeForKids: false,
      },
    };

    const uploadUrl = await initiateResumableUpload(token, metadata);
    const result    = await uploadVideoFromUrl(uploadUrl, payload.video_url);

    return {
      url:         `https://www.youtube.com/watch?v=${result.id}`,
      external_id: result.id,
    };
  },

  async getAnalytics(conteudoId: string): Promise<YouTubeAnalytics> {
    if (MOCK_MODE) {
      await delay(200);
      return {
        view_count:          Math.floor(Math.random() * 100000 + 500),
        like_count:          Math.floor(Math.random() * 8000 + 100),
        comment_count:       Math.floor(Math.random() * 500),
        subscriber_gained:   Math.floor(Math.random() * 200),
        watch_time_minutes:  conteudoId ? Math.floor(Math.random() * 50000 + 1000) : 0,
      };
    }

    const conn = getOAuthConnection(["corp_youtube", "youtube_business"]);
    if (!conn) throw IntegrationError.notConfigured("youtube");

    const token = conn.access_token!;

    const data = await ytCall<{ items: Array<{ statistics: Record<string, string> }> }>(
      "GET",
      "/videos",
      token,
      { part: "statistics", id: conteudoId },
    );

    const stats = data.items?.[0]?.statistics ?? {};
    return {
      view_count:         parseInt(stats["viewCount"]     ?? "0", 10),
      like_count:         parseInt(stats["likeCount"]     ?? "0", 10),
      comment_count:      parseInt(stats["commentCount"]  ?? "0", 10),
      subscriber_gained:  0,
      watch_time_minutes: 0,
    };
  },
};
