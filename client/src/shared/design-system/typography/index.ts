/**
 * MUSIC OS 360 — Typography Utilities
 *
 * Composable class string helpers for consistent type rendering.
 * All exports are Tailwind class strings — no runtime overhead.
 */

import { TYPE_SCALE, type TypeScaleKey } from "../tokens/typography.tokens";

export { TYPE_SCALE, type TypeScaleKey };

// ─── Composite helpers ─────────────────────────────────────────────────────────

/** Page title — used in PAGE.header */
export const T_PAGE_TITLE    = "text-2xl font-semibold tracking-tight";
/** Card/section heading */
export const T_SECTION_TITLE = "text-base font-semibold";
/** Eyebrow label above a section */
export const T_EYEBROW       = "text-xs font-semibold uppercase tracking-widest text-muted-foreground";
/** Supporting description */
export const T_DESCRIPTION   = "text-sm text-muted-foreground leading-relaxed";
/** Inline code / identifier */
export const T_CODE          = "font-mono text-xs bg-muted px-1.5 py-0.5 rounded-sm";
/** Large numeric KPI */
export const T_KPI           = "font-mono text-3xl font-semibold tabular-nums tracking-tight";
/** Medium numeric value */
export const T_METRIC        = "font-mono text-xl font-semibold tabular-nums";
/** Small numeric value */
export const T_METRIC_SM     = "font-mono text-sm font-medium tabular-nums";
/** Currency / monetary value — positive */
export const T_CURRENCY_POS  = "font-mono text-sm font-medium tabular-nums text-success";
/** Currency / monetary value — negative */
export const T_CURRENCY_NEG  = "font-mono text-sm font-medium tabular-nums text-destructive";
/** Currency / monetary value — neutral */
export const T_CURRENCY      = "font-mono text-sm font-medium tabular-nums";
/** Table cell — primary content */
export const T_CELL          = "text-sm font-medium";
/** Table cell — secondary/muted content */
export const T_CELL_MUTED    = "text-xs text-muted-foreground";
/** Empty state heading */
export const T_EMPTY_HEADING = "text-base font-semibold";
/** Empty state description */
export const T_EMPTY_DESC    = "text-sm text-muted-foreground max-w-sm";

/** Get a type scale class by key */
export function typeClass(key: TypeScaleKey): string {
  return TYPE_SCALE[key];
}
