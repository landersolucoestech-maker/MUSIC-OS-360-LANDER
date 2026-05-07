/**
 * MUSIC OS 360 — Shadow & Elevation Tokens
 *
 * Enterprise elevation model: subtle, directional, no color glows.
 * CSS custom properties defined in index.css.
 * Tailwind shadow utilities map to these via config.
 *
 * Elevation model (inspired by Linear/Stripe):
 *   0 — flat (no shadow, only border)
 *   1 — card surface
 *   2 — popover / dropdown
 *   3 — modal / dialog
 *   4 — command palette / toasts
 */

export const SHADOW = {
  none: "none",
  /** Hairline — table rows, list items */
  xs:  "var(--shadow-xs)",
  /** Cards — default surface elevation */
  sm:  "var(--shadow-sm)",
  /** Dropdowns, tooltips */
  md:  "var(--shadow-md)",
  /** Modals, drawers */
  lg:  "var(--shadow-lg)",
  /** Command palette, overlays */
  xl:  "var(--shadow-xl)",
} as const;

/** Semantic elevation aliases → Tailwind classes */
export const ELEVATION = {
  /** No shadow — flat table rows, list items */
  flat:      "shadow-none border border-border",
  /** Default card */
  card:      "shadow-sm border border-border",
  /** Hovered/focused card */
  cardRaised:"shadow-md border border-border",
  /** Popover, dropdown */
  popover:   "shadow-md border border-border",
  /** Modal, dialog */
  modal:     "shadow-lg border border-border/50",
  /** Command palette */
  command:   "shadow-xl border border-border/50",
} as const;
