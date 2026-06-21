/**
 * shared/lib/safe-url.ts
 *
 * XSS guards (CWE-79) for user-controlled URLs bound to `href`/`src`. Blocks
 * dangerous schemes (`javascript:`, `data:text/html`, `vbscript:`, …) that turn
 * a link/image into script execution, while preserving normal http(s)/blob and
 * inline image data URLs.
 */

const SAFE_LINK_SCHEMES = new Set(["http:", "https:", "mailto:"]);
const SAFE_IMAGE_SCHEMES = new Set(["http:", "https:", "blob:"]);

function parse(url: string): URL | null {
  try {
    // Same-origin base so relative URLs resolve safely; absolute schemes keep theirs.
    const base = typeof window !== "undefined" ? window.location.origin : "https://localhost";
    return new URL(url, base);
  } catch {
    return null;
  }
}

/** Returns `url` if it is a safe link scheme (http/https/mailto), else "". */
export function safeLinkHref(url: string | null | undefined): string {
  if (!url) return "";
  const u = parse(url);
  return u && SAFE_LINK_SCHEMES.has(u.protocol) ? url : "";
}

/** Returns `url` if it is a safe image source (http/https/blob or data:image/*), else "". */
export function safeImageSrc(url: string | null | undefined): string {
  if (!url) return "";
  const u = parse(url);
  if (!u) return "";
  if (SAFE_IMAGE_SCHEMES.has(u.protocol)) return url;
  if (u.protocol === "data:" && /^data:image\/(png|jpe?g|gif|webp|avif|svg\+xml);/i.test(url)) {
    // Reject inline SVG (can carry scripts); allow raster image data URLs only.
    return /^data:image\/svg/i.test(url) ? "" : url;
  }
  return "";
}
