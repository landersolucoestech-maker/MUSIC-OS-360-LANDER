/**
 * MUSIC OS 360 — Motion Tokens
 *
 * Enterprise motion principles:
 * - Fast and intentional — nothing > 350ms for UI responses
 * - Easing: ease-out for enter, ease-in for exit, ease-in-out for layout shifts
 * - No bounce, no elastic, no gamer effects
 */

export const DURATION = {
  instant:  0,
  fast:     100,  // ms — micro interactions (checkbox, toggle)
  quick:    150,  // ms — button states, hover
  normal:   200,  // ms — dropdowns, tooltips
  moderate: 250,  // ms — slide-up panels, accordion
  slow:     300,  // ms — modal enter
  slower:   350,  // ms — drawer slide
} as const;

export const EASING = {
  enter:    "cubic-bezier(0, 0, 0.2, 1)",   // ease-out — snappy entry
  exit:     "cubic-bezier(0.4, 0, 1, 1)",   // ease-in  — quick dismissal
  inOut:    "cubic-bezier(0.4, 0, 0.2, 1)", // ease-in-out — layout shifts
  spring:   "cubic-bezier(0.34, 1.56, 0.64, 1)", // light spring — reserved for deliberate delight
} as const;

/** Tailwind transition class strings */
export const TRANSITION = {
  /** Immediate micro-interactions */
  fast:    "transition-all duration-100 ease-out",
  /** Default hover/focus states */
  base:    "transition-all duration-200 ease-out",
  /** Color-only transitions (performance) */
  colors:  "transition-colors duration-200 ease-out",
  /** Opacity fades */
  opacity: "transition-opacity duration-200 ease-out",
  /** Border and shadow only */
  surface: "transition-[border-color,box-shadow] duration-200 ease-out",
  /** Layout shifts */
  layout:  "transition-all duration-250 ease-in-out",
  /** Modal/drawer open */
  modal:   "transition-all duration-300 ease-out",
} as const;

/** Hover state classes — enterprise pattern (no glows, no lifts > 1px) */
export const HOVER = {
  /** Subtle border highlight — default interactive card */
  card:    "hover:border-primary/25 hover:shadow-md",
  /** Button surface lift */
  button:  "hover:brightness-105 active:brightness-95 active:scale-[0.99]",
  /** Row highlight — table/list */
  row:     "hover:bg-muted/60",
  /** Link underline */
  link:    "hover:text-primary hover:underline underline-offset-4",
  /** Icon button */
  icon:    "hover:bg-muted hover:text-foreground",
} as const;
