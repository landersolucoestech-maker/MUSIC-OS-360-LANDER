/**
 * MUSIC OS 360 — Motion Utilities
 *
 * CSS class strings and inline style helpers for transitions and animations.
 * Enterprise-grade motion: purposeful, fast, no gimmicks.
 */

export { DURATION, EASING, TRANSITION, HOVER } from "../tokens/motion.tokens";

// ─── Animation class strings ───────────────────────────────────────────────────

/** Fade in — route transitions, page-level content */
export const ANIM_FADE_IN    = "animate-fade-in";
/** Slide up — lists, card content loading */
export const ANIM_SLIDE_UP   = "animate-slide-up";
/** Scale in — modals, popovers */
export const ANIM_SCALE_IN   = "animate-scale-in";
/** Subtle pulse — loading indicators */
export const ANIM_PULSE      = "animate-pulse-subtle";
/** Shimmer skeleton */
export const ANIM_SHIMMER    = "shimmer";

// ─── Stagger helpers ───────────────────────────────────────────────────────────

/** Stagger delay class for index n (0-based, caps at 5) */
export function staggerClass(index: number): string {
  const n = Math.min(index + 1, 5);
  return `stagger-${n}`;
}

// ─── Reduced motion ────────────────────────────────────────────────────────────

/** Returns true if user prefers reduced motion */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Conditionally apply animation class based on reduced motion preference */
export function safeAnimation(animClass: string): string {
  return prefersReducedMotion() ? "" : animClass;
}

// ─── Modal / Drawer transition config ─────────────────────────────────────────

/** Dialog animation classes — applied via data attributes in shadcn */
export const MODAL_TRANSITION = {
  overlay:  "animate-fade-in",
  content:  "animate-scale-in",
} as const;

export const DRAWER_TRANSITION = {
  overlay:  "animate-fade-in",
  content:  "animate-slide-up",
} as const;
