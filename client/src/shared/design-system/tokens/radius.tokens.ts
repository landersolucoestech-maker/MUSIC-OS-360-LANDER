/**
 * MUSIC OS 360 — Border Radius Tokens
 *
 * Maps to CSS --radius variable and Tailwind's borderRadius config.
 * Enterprise target: subtle rounding, not pill-shaped bubbles.
 */

export const RADIUS = {
  none:  "0",
  xs:    "0.125rem",  // 2px  — separators, fine details
  sm:    "0.25rem",   // 4px  — badges, chips (rounded-sm)
  md:    "0.375rem",  // 6px  — calc(var(--radius) - 2px)
  DEFAULT:"0.5rem",   // 8px  — buttons, inputs, cards (rounded-lg via --radius)
  lg:    "0.5rem",    // 8px  — var(--radius)
  xl:    "0.75rem",   // 12px — modals, sheets
  "2xl": "1rem",      // 16px — large panels
  "3xl": "1.5rem",    // 24px — full-bleed surfaces
  full:  "9999px",    // pill — avatars, status dots
} as const;

/** Tailwind class aliases */
export const RADIUS_CLASS = {
  badge:   "rounded-sm",
  button:  "rounded-md",
  input:   "rounded-md",
  card:    "rounded-lg",
  modal:   "rounded-xl",
  avatar:  "rounded-full",
  chip:    "rounded-full",
} as const;
