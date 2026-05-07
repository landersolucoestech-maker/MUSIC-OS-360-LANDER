/**
 * MUSIC OS 360 — Theme Configuration
 *
 * Maps design tokens to semantic roles for light and dark themes.
 * CSS vars in index.css are the runtime values.
 * This file documents the intent and provides typed references.
 */

export type ThemeMode = "light" | "dark" | "system";

export const THEME_MODES: ThemeMode[] = ["light", "dark", "system"];

/** Semantic color role map — maps role → CSS variable name */
export const THEME_ROLES = {
  // Surfaces
  background:    "--background",
  card:          "--card",
  surface1:      "--surface-1",
  surface2:      "--surface-2",
  surface3:      "--surface-3",
  popover:       "--popover",

  // Text
  foreground:    "--foreground",
  cardFg:        "--card-foreground",
  mutedFg:       "--muted-foreground",

  // Interactive
  primary:       "--primary",
  primaryFg:     "--primary-foreground",
  secondary:     "--secondary",
  secondaryFg:   "--secondary-foreground",
  accent:        "--accent",
  accentFg:      "--accent-foreground",
  muted:         "--muted",

  // Semantic
  success:       "--success",
  successFg:     "--success-foreground",
  warning:       "--warning",
  warningFg:     "--warning-foreground",
  destructive:   "--destructive",
  destructiveFg: "--destructive-foreground",
  info:          "--info",
  infoFg:        "--info-foreground",

  // Structure
  border:        "--border",
  input:         "--input",
  ring:          "--ring",
  radius:        "--radius",
} as const;

export type ThemeRole = keyof typeof THEME_ROLES;

/** Resolve a CSS custom property to its current computed value */
export function resolveCSSVar(varName: string): string {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
}

/** Get computed HSL string for a theme role */
export function themeColor(role: ThemeRole): string {
  const varName = THEME_ROLES[role];
  const value = resolveCSSVar(varName);
  return value ? `hsl(${value})` : "";
}
