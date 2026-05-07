/**
 * MUSIC OS 360 — Typography Tokens
 *
 * Font stack: Plus Jakarta Sans (body) + IBM Plex Mono (code/analytics)
 * Both already loaded via Google Fonts in index.html.
 */

export const FONT_FAMILY = {
  sans:  '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif',
  mono:  '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
} as const;

export const FONT_WEIGHT = {
  regular:   400,
  medium:    500,
  semibold:  600,
  bold:      700,
  extrabold: 800,
} as const;

/**
 * Type scale — semantic roles.
 * Values are Tailwind class strings for consistent application.
 */
export const TYPE_SCALE = {
  /** Hero titles — landing, empty states */
  display: "text-4xl font-bold tracking-tight leading-none",
  /** Page headings — H1 level */
  heading: "text-2xl font-semibold tracking-tight leading-snug",
  /** Section/card headings — H2 level */
  title:   "text-lg font-semibold leading-snug",
  /** Sub-section labels — H3 level */
  subtitle:"text-sm font-semibold uppercase tracking-wider text-muted-foreground",
  /** Body text — default */
  body:    "text-sm font-normal leading-relaxed",
  /** Supporting / secondary text */
  caption: "text-xs font-normal text-muted-foreground leading-normal",
  /** Numeric/data display — uses IBM Plex Mono */
  analytics:"font-mono text-xl font-medium tabular-nums tracking-tight",
  /** Small metric label */
  metric:  "font-mono text-sm font-medium tabular-nums",
  /** Code / ISRC / identifiers */
  code:    "font-mono text-xs",
} as const;

export type TypeScaleKey = keyof typeof TYPE_SCALE;
