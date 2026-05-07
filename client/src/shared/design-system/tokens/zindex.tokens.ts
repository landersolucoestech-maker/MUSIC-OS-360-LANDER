/**
 * MUSIC OS 360 — Z-Index Tokens
 *
 * Layering model — never use arbitrary z values outside this scale.
 */

export const Z_INDEX = {
  /** Base content */
  base:       0,
  /** Slightly elevated — sticky table headers */
  raised:     1,
  /** Dropdown menus, tooltips */
  dropdown:   100,
  /** Sticky sidebar / nav */
  sticky:     200,
  /** Fixed header / overlay anchors */
  fixed:      300,
  /** Modal backdrop */
  backdrop:   400,
  /** Modal / dialog content */
  modal:      500,
  /** Popover layered above modal */
  popover:    600,
  /** Toast notifications */
  toast:      700,
  /** Command palette — highest interactive layer */
  command:    800,
  /** Debug / dev overlays */
  debug:      999,
} as const;

export type ZIndexKey = keyof typeof Z_INDEX;

/** Tailwind class aliases */
export const Z_CLASS = {
  dropdown: "z-[100]",
  sticky:   "z-[200]",
  fixed:    "z-[300]",
  backdrop: "z-[400]",
  modal:    "z-[500]",
  popover:  "z-[600]",
  toast:    "z-[700]",
  command:  "z-[800]",
} as const;
