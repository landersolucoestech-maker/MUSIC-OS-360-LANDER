/**
 * MUSIC OS 360 — Color Tokens
 *
 * Single source of truth for all color decisions.
 * CSS custom properties are defined in index.css.
 * These constants are for JS/TS contexts (charts, inline styles, dynamic values).
 *
 * Target aesthetic: Linear · Stripe · Vercel · Raycast
 */

// ─── Primitive palette ────────────────────────────────────────────────────────

export const COLOR_PRIMITIVE = {
  // Enterprise Blue — primary brand
  blue: {
    50:  "hsl(217 100% 97%)",
    100: "hsl(217 96% 94%)",
    200: "hsl(217 95% 86%)",
    300: "hsl(217 93% 74%)",
    400: "hsl(217 92% 67%)",
    500: "hsl(217 91% 60%)",  // --primary
    600: "hsl(217 87% 50%)",
    700: "hsl(217 83% 40%)",
    800: "hsl(217 79% 30%)",
    900: "hsl(217 75% 20%)",
    950: "hsl(222 47% 11%)",  // --foreground
  },

  // Navy — backgrounds and surfaces
  navy: {
    50:  "hsl(220 14% 96%)",  // --muted (light)
    100: "hsl(220 13% 91%)",  // --border (light)
    200: "hsl(222 20% 82%)",
    300: "hsl(222 30% 60%)",
    400: "hsl(222 40% 40%)",
    500: "hsl(222 47% 20%)",
    600: "hsl(222 47% 14%)",  // --border (dark)
    700: "hsl(222 47% 12%)",  // --muted / --secondary (dark)
    800: "hsl(222 47% 8%)",   // --card (dark)
    900: "hsl(222 47% 5%)",   // --sidebar-background (dark)
    950: "hsl(222 47% 4%)",   // --background (dark)
  },

  // Cyan — secondary accent
  cyan: {
    400: "hsl(189 94% 43%)",
    500: "hsl(189 94% 36%)",
  },

  // Violet — tertiary accent
  violet: {
    400: "hsl(271 81% 65%)",
    500: "hsl(271 91% 58%)",
  },

  // Semantic
  green: {
    500: "hsl(142 76% 36%)",  // --success
    600: "hsl(142 76% 30%)",
  },
  amber: {
    500: "hsl(38 92% 50%)",   // --warning
    600: "hsl(38 92% 44%)",
  },
  red: {
    500: "hsl(0 84% 60%)",    // --destructive (light)
    600: "hsl(0 62% 40%)",    // --destructive (dark)
  },
} as const;

// ─── Semantic tokens ──────────────────────────────────────────────────────────

/** Map to Tailwind utility classes */
export const COLOR_SEMANTIC = {
  primary:     "text-primary",
  success:     "text-success",
  warning:     "text-warning",
  destructive: "text-destructive",
  muted:       "text-muted-foreground",
} as const;

/** Chart / data-vis palette — ordered for categorical sequences */
export const COLOR_CHART = [
  COLOR_PRIMITIVE.blue[500],
  COLOR_PRIMITIVE.violet[400],
  COLOR_PRIMITIVE.cyan[400],
  COLOR_PRIMITIVE.green[500],
  COLOR_PRIMITIVE.amber[500],
  COLOR_PRIMITIVE.blue[300],
  COLOR_PRIMITIVE.violet[500],
] as const;

/** Status color map — used by StatusBadge */
export const COLOR_STATUS = {
  active:      { bg: "bg-success/10",      text: "text-success",      border: "border-success/20" },
  pending:     { bg: "bg-warning/10",      text: "text-warning",      border: "border-warning/20" },
  confirmed:   { bg: "bg-primary/10",      text: "text-primary",      border: "border-primary/20" },
  cancelled:   { bg: "bg-destructive/10",  text: "text-destructive",  border: "border-destructive/20" },
  executed:    { bg: "bg-success/10",      text: "text-success",      border: "border-success/20" },
  registered:  { bg: "bg-success/10",      text: "text-success",      border: "border-success/20" },
  analysis:    { bg: "bg-warning/10",      text: "text-warning",      border: "border-warning/20" },
  rejected:    { bg: "bg-destructive/10",  text: "text-destructive",  border: "border-destructive/20" },
  expired:     { bg: "bg-destructive/10",  text: "text-destructive",  border: "border-destructive/20" },
  negotiation: { bg: "bg-warning/10",      text: "text-warning",      border: "border-warning/20" },
  proposal:    { bg: "bg-primary/10",      text: "text-primary",      border: "border-primary/20" },
  draft:       { bg: "bg-muted",           text: "text-muted-foreground", border: "border-border" },
} as const;

export type StatusKey = keyof typeof COLOR_STATUS;
