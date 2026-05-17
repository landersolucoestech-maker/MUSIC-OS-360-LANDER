import { MOCK_MODE } from "@/shared/lib/env";
import { IntegrationError } from "@/shared/lib/errors";
import { getOAuthConnection } from "./platform-tokens";

export interface InstagramSchedulePayload {
  conteudoId:   string;
  caption:      string;
  media_url?:   string;
  media_type?:  "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  hashtags?:    string[];
  location?:    string;
  scheduledAt:  string;
}

/**
 * Payload for immediate publishing. Mirrors InstagramSchedulePayload minus scheduledAt.
 * media_url is required for real publishing (IMAGE/VIDEO/CAROUSEL_ALBUM).
 */
export interface InstagramPublishNowPayload {
  conteudoId:  string;
  caption?:    string;
  media_url?:  string;
  media_type?: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  hashtags?:   string[];
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

// ─── Graph API helpers ────────────────────────────────────────────────────────

const GRAPH_BASE = "https://graph.facebook.com/v18.0";

async function graphCall<T>(
  method: "GET" | "POST",
  path: string,
  token: string,
  params?: Record<string, unknown>,
): Promise<T> {
  let url = `${GRAPH_BASE}${path}`;
  const init: RequestInit = { method, headers: { Authorization: `Bearer ${token}` } };

  if (method === "GET" && params) {
    const qs = new URLSearchParams(
      Object.entries(params).map(([k, v]) => [k, String(v)]),
    ).toString();
    url = `${url}?${qs}`;
  } else if (method === "POST" && params) {
    (init.headers as Record<string, string>)["Content-Type"] = "application/json";
    init.body = JSON.stringify(params);
  }

  const res = await fetch(url, init);
  const json = (await res.json()) as Record<string, unknown>;

  if (!res.ok || json["error"]) {
    const err = json["error"] as Record<string, unknown> | undefined;
    const msg = (err?.["message"] as string | undefined) ?? res.statusText;
    throw new IntegrationError("instagram", msg, {
      statusCode: res.status,
      retryable:  res.status >= 500,
    });
  }
  return json as T;
}

/**
 * Resolves the Instagram Business Account user ID.
 *
 * In production, the stored accountId comes from the real OAuth callback page.
 * When the mock OAuth flow is used (no real callback page yet), accountId will
 * be a placeholder like "IG-CORP-123456". In that case we fall back to fetching
 * the real IG user ID from the Graph API using the access token.
 */
async function resolveIgUserId(token: string, storedAccountId: string): Promise<string> {
  const looksReal = /^\d+$/.test(storedAccountId);
  if (looksReal) return storedAccountId;

  const pages = await graphCall<{ data: Array<{ id: string; instagram_business_account?: { id: string } }> }>(
    "GET",
    "/me/accounts",
    token,
    { fields: "id,instagram_business_account" },
  );

  const igAccount = pages.data?.find((p) => p.instagram_business_account)?.instagram_business_account;
  if (!igAccount?.id) {
    throw new IntegrationError(
      "instagram",
      "Conta de negócios do Instagram não encontrada. Verifique se a conta está ligada ao Meta Business Suite.",
      { retryable: false },
    );
  }
  return igAccount.id;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const instagramService = {
  async schedulePost(payload: InstagramSchedulePayload): Promise<{ id: string; scheduledAt: string }> {
    if (MOCK_MODE) {
      await delay();
      return { id: `ig-sched-${Date.now()}`, scheduledAt: payload.scheduledAt };
    }

    const conn = getOAuthConnection(["corp_instagram", "meta_business"]);
    if (!conn) throw IntegrationError.notConfigured("instagram");

    const token    = conn.access_token!;
    const igUserId = await resolveIgUserId(token, conn.accountId ?? "");

    const caption =
      [payload.caption, ...(payload.hashtags ?? []).map((h) => `#${h}`)].join(" ").trim();

    const mediaType = payload.media_type ?? "IMAGE";
    const containerParams: Record<string, unknown> = { caption };
    if (payload.location) containerParams["location_id"] = payload.location;

    if (mediaType === "VIDEO") {
      containerParams["media_type"] = "REELS";
      if (payload.media_url) containerParams["video_url"] = payload.media_url;
      containerParams["share_to_feed"] = true;
    } else if (mediaType === "CAROUSEL_ALBUM") {
      if (payload.media_url) {
        const child = await graphCall<{ id: string }>(
          "POST",
          `/${igUserId}/media`,
          token,
          { image_url: payload.media_url, is_carousel_item: true },
        );
        containerParams["media_type"] = "CAROUSEL_ALBUM";
        containerParams["children"]   = [child.id];
      }
    } else {
      containerParams["media_type"] = "IMAGE";
      if (payload.media_url) containerParams["image_url"] = payload.media_url;
    }

    const container = await graphCall<{ id: string }>(
      "POST",
      `/${igUserId}/media`,
      token,
      containerParams,
    );

    const result = await graphCall<{ id: string }>(
      "POST",
      `/${igUserId}/media_publish`,
      token,
      {
        creation_id: container.id,
        published:   false,
        scheduled_publish_time: Math.floor(new Date(payload.scheduledAt).getTime() / 1000),
      },
    );

    return { id: result.id, scheduledAt: payload.scheduledAt };
  },

  async publishNow(payload: InstagramPublishNowPayload): Promise<{ url: string; external_id: string }> {
    if (MOCK_MODE) {
      await delay();
      const id = `ig-pub-${payload.conteudoId}`;
      return { url: `https://www.instagram.com/p/${id}/`, external_id: id };
    }

    const conn = getOAuthConnection(["corp_instagram", "meta_business"]);
    if (!conn) throw IntegrationError.notConfigured("instagram");

    if (!payload.media_url) {
      throw new IntegrationError(
        "instagram",
        "URL da mídia é necessária para publicação no Instagram. Adicione uma imagem ou vídeo ao conteúdo.",
        { retryable: false },
      );
    }

    const token    = conn.access_token!;
    const igUserId = await resolveIgUserId(token, conn.accountId ?? "");

    const caption = [
      payload.caption ?? "",
      ...(payload.hashtags ?? []).map((h) => `#${h}`),
    ].join(" ").trim();

    const mediaType = payload.media_type ?? "IMAGE";

    // Build the container params according to the Graph API field requirements for each
    // media type.  Using the wrong URL field (e.g. image_url for a video) causes a 400.
    const containerParams: Record<string, unknown> = { caption };

    if (mediaType === "VIDEO") {
      // Reels / video posts require video_url + media_type
      containerParams["media_type"] = "REELS";
      containerParams["video_url"]  = payload.media_url;
      containerParams["share_to_feed"] = true;
    } else if (mediaType === "CAROUSEL_ALBUM") {
      // For a single media_url, create one child IMAGE container and wrap it in
      // a CAROUSEL_ALBUM.  Real multi-image carousels require children to be
      // created individually (task #24 / publishing service enrichment).
      const child = await graphCall<{ id: string }>(
        "POST",
        `/${igUserId}/media`,
        token,
        { image_url: payload.media_url, is_carousel_item: true },
      );
      containerParams["media_type"] = "CAROUSEL_ALBUM";
      containerParams["children"]   = [child.id];
    } else {
      // Default: IMAGE
      containerParams["media_type"] = "IMAGE";
      containerParams["image_url"]  = payload.media_url;
    }

    const container = await graphCall<{ id: string }>(
      "POST",
      `/${igUserId}/media`,
      token,
      containerParams,
    );

    const result = await graphCall<{ id: string }>(
      "POST",
      `/${igUserId}/media_publish`,
      token,
      { creation_id: container.id },
    );

    const mediaData = await graphCall<{ permalink: string }>(
      "GET",
      `/${result.id}`,
      token,
      { fields: "permalink" },
    );

    return { url: mediaData.permalink, external_id: result.id };
  },

  async getAnalytics(conteudoId: string): Promise<InstagramAnalytics> {
    if (MOCK_MODE) {
      await delay(200);
      return {
        impressions:  Math.floor(Math.random() * 8000 + 500),
        reach:        Math.floor(Math.random() * 5000 + 300),
        likes:        Math.floor(Math.random() * 600 + 10),
        comments:     Math.floor(Math.random() * 80),
        saved:        Math.floor(Math.random() * 200),
        video_views:  conteudoId ? Math.floor(Math.random() * 3000) : undefined,
      };
    }

    const conn = getOAuthConnection(["corp_instagram", "meta_business"]);
    if (!conn) throw IntegrationError.notConfigured("instagram");

    const token = conn.access_token!;

    const METRICS = "impressions,reach,likes,comments,saved,video_views";
    const data = await graphCall<{ data: Array<{ name: string; values: Array<{ value: number }> }> }>(
      "GET",
      `/${conteudoId}/insights`,
      token,
      { metric: METRICS, period: "lifetime" },
    );

    const byName = Object.fromEntries(
      data.data.map((m) => [m.name, m.values[0]?.value ?? 0]),
    );

    return {
      impressions:  byName["impressions"]  ?? 0,
      reach:        byName["reach"]         ?? 0,
      likes:        byName["likes"]         ?? 0,
      comments:     byName["comments"]      ?? 0,
      saved:        byName["saved"]         ?? 0,
      video_views:  byName["video_views"],
    };
  },
};
