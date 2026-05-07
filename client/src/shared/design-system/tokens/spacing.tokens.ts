/**
 * MUSIC OS 360 — Spacing Tokens
 *
 * 4px base unit. Maps to Tailwind spacing scale (1 unit = 4px).
 * Use these constants in JS contexts; prefer Tailwind classes in JSX.
 */

/** Base unit in pixels */
export const SPACING_BASE = 4;

/** Spacing scale (in pixels) */
export const SPACING = {
  0:    0,
  0.5:  2,
  1:    4,
  1.5:  6,
  2:    8,
  2.5:  10,
  3:    12,
  3.5:  14,
  4:    16,
  5:    20,
  6:    24,
  7:    28,
  8:    32,
  9:    36,
  10:   40,
  12:   48,
  14:   56,
  16:   64,
  18:   72,
  20:   80,
  24:   96,
  28:   112,
  32:   128,
} as const;

/** Semantic spacing aliases for consistent layout rhythm */
export const SPACING_SEMANTIC = {
  /** Inline gap within a component (icon + text) */
  componentGap:    "gap-2",
  /** Padding inside a compact element (badge, chip) */
  compactPadding:  "px-2 py-0.5",
  /** Padding inside a standard input/button */
  inputPadding:    "px-3 py-2",
  /** Padding inside a card */
  cardPadding:     "p-4",
  /** Padding inside a large card / panel section */
  panelPadding:    "p-6",
  /** Gap between sibling cards in a grid */
  gridGap:         "gap-4",
  /** Gap between major page sections */
  sectionGap:      "gap-6",
  /** Vertical space between page-level sections */
  pageSpacing:     "space-y-6",
  /** Horizontal page content padding */
  pagePaddingX:    "px-4 md:px-6 lg:px-8",
} as const;
