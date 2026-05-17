/**
 * platform-tokens.ts
 *
 * Non-React helper for reading OAuth connection tokens from sessionStorage.
 * Used by platform services (instagram, tiktok, youtube) to detect whether
 * the user has configured a live integration in Settings → Integrations.
 *
 * Token shape is defined by IMarketingOAuthConnection in the shared contract.
 * The hook useMarketingOAuth is the write-side; this is the read-side for
 * service-layer code that cannot call React hooks.
 *
 * ─── "Not configured" vs "API rejected" ──────────────────────────────────────
 *
 * The services that consume this helper distinguish two error states:
 *
 *   • IntegrationError.notConfigured()  → getOAuthConnection() returned null
 *     (user never went through Settings → Integrations for this platform)
 *
 *   • IntegrationError(platform, msg, { statusCode })  → the platform API
 *     returned an HTTP error (token invalid/expired → 401, quota → 429, etc.)
 *
 * Any non-empty `access_token` stored in sessionStorage means the user has
 * explicitly connected the integration from Settings.  Whether that token is
 * still valid is the platform API's responsibility to report.  We do not
 * second-guess token validity here — that would conflate the two error states.
 *
 * In MOCK_MODE services short-circuit before reaching token checks and return
 * synthetic mock data — so the token value is never evaluated by real API paths.
 *
 * When the real OAuth callback page (task #24) is implemented it will send a
 * genuine platform-issued token via postMessage.  Until then, the demo popup
 * (OAuthPopupPage.tsx) emits a synthetic token for UI testing; using that token
 * in production will yield a 401 from the platform API — correctly surfaced as
 * "API rejected", not "not configured".
 */

import type {
  IMarketingOAuthConnection,
  MarketingPlatformId,
} from "@/shared/integrations/contracts/marketing.contract";

const STORAGE_KEY = "musicos360_marketing_oauth_connections";

type ConnectionMap = Partial<Record<MarketingPlatformId, IMarketingOAuthConnection>>;

function loadConnections(): ConnectionMap {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ConnectionMap) : {};
  } catch {
    return {};
  }
}

/**
 * Returns the first active connection that has a usable `access_token` for any
 * of the given platform IDs, or null if none is found.
 *
 * A connection is "usable" when:
 *   - `connected === true`
 *   - `access_token` is present and non-empty
 *
 * Token validity is NOT checked here — the caller's platform API will return a
 * 401 if the token is invalid or expired, which surfaces as IntegrationError
 * with statusCode 401 ("API rejected"), correctly distinguished from null here
 * ("not configured").
 *
 * Services pass platform aliases in priority order, e.g.:
 *   instagram → ["corp_instagram", "meta_business"]
 *   tiktok    → ["corp_tiktok",    "tiktok_business"]
 *   youtube   → ["corp_youtube",   "youtube_business"]
 */
export function getOAuthConnection(
  platforms: MarketingPlatformId[],
): IMarketingOAuthConnection | null {
  const connections = loadConnections();
  for (const p of platforms) {
    const conn = connections[p];
    if (conn?.connected && conn.access_token) return conn;
  }
  return null;
}

/**
 * Convenience: returns true if any of the platform IDs has a live, usable connection.
 */
export function isPlatformConnected(platforms: MarketingPlatformId[]): boolean {
  return getOAuthConnection(platforms) !== null;
}
