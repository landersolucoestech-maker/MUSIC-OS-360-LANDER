/**
 * shared/design-system/tokens/index.ts
 *
 * Design tokens — spacing, colours, typography scales, radius.
 * FASE 12 do BLOCO 09: fonte única de verdade para tokens de design.
 *
 * CSS variables definidas em client/src/index.css.
 * Tailwind config em tailwind.config.ts.
 */

export const tokens = {
  colors: {
    brand:      "hsl(263 70% 50%)",
    brandMuted: "hsl(263 70% 95%)",
    success:    "hsl(142 71% 45%)",
    warning:    "hsl(48 96% 53%)",
    error:      "hsl(0 84% 60%)",
    info:       "hsl(217 91% 60%)",
  },
  spacing: {
    xs:    "0.25rem",  // 4px
    sm:    "0.5rem",   // 8px
    md:    "1rem",     // 16px
    lg:    "1.5rem",   // 24px
    xl:    "2rem",     // 32px
    "2xl": "3rem",     // 48px
  },
  radius: {
    sm: "0.375rem",
    md: "0.5rem",
    lg: "0.75rem",
    xl: "1rem",
  },
  fontSize: {
    xs:    "0.75rem",
    sm:    "0.875rem",
    base:  "1rem",
    lg:    "1.125rem",
    xl:    "1.25rem",
    "2xl": "1.5rem",
    "3xl": "1.875rem",
  },
} as const;

export type ColorToken    = keyof typeof tokens.colors;
export type SpacingToken  = keyof typeof tokens.spacing;
export type RadiusToken   = keyof typeof tokens.radius;
export type FontSizeToken = keyof typeof tokens.fontSize;
