/**
 * MUSIC OS 360 — UI Patterns
 *
 * Canonical Tailwind class strings for common UI patterns.
 * Import these to ensure visual consistency across modules.
 * All classes use design tokens (CSS vars) — dark mode is automatic.
 */

// ─── Card patterns ────────────────────────────────────────────────────────────

export const CARD = {
  /** Default card — bordered, no shadow */
  base:        "rounded-lg border border-border bg-card",
  /** Interactive card — hover raises border + shadow */
  interactive: "rounded-lg border border-border bg-card transition-[border-color,box-shadow] duration-200 hover:border-primary/25 hover:shadow-md cursor-pointer",
  /** Flat card — muted background, no border */
  flat:        "rounded-lg bg-muted/40",
  /** Glass card — translucent */
  glass:       "rounded-lg border border-border/50 bg-background/80 backdrop-blur-sm",
  /** Metric / KPI card */
  metric:      "rounded-lg border border-border bg-card p-4",
  /** Section panel — inside a page layout */
  panel:       "rounded-xl border border-border bg-card p-6",
} as const;

// ─── Table patterns ───────────────────────────────────────────────────────────

export const TABLE = {
  /** Outer wrapper */
  wrapper:   "rounded-lg border border-border overflow-hidden",
  /** <table> element */
  table:     "w-full text-sm",
  /** <thead> */
  head:      "bg-muted/40 border-b border-border",
  /** <th> */
  th:        "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground",
  /** <tbody> */
  body:      "divide-y divide-border",
  /** <tr> */
  row:       "transition-colors duration-150 hover:bg-muted/50",
  /** <tr> selected */
  rowSelected:"bg-primary/5 hover:bg-primary/8",
  /** <td> */
  td:        "px-4 py-3 text-sm",
  /** <td> for actions column */
  tdActions: "px-4 py-3 text-right",
} as const;

// ─── Form patterns ────────────────────────────────────────────────────────────

export const FORM = {
  /** Form section header */
  sectionHeader: "text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-2 mb-4",
  /** Label */
  label:         "text-sm font-medium leading-none",
  /** Input group (label + input + error) */
  group:         "space-y-1.5",
  /** Helper text */
  helper:        "text-xs text-muted-foreground",
  /** Error text */
  error:         "text-xs text-destructive",
  /** Field row — side-by-side fields */
  row:           "grid grid-cols-2 gap-4",
  /** Full-width field row */
  rowFull:       "grid grid-cols-1 gap-4",
} as const;

// ─── Page layout patterns ──────────────────────────────────────────────────────

export const PAGE = {
  /** Top-level page wrapper */
  wrapper:      "flex flex-col gap-6 p-4 md:p-6 min-h-0",
  /** Page header row — title + actions */
  header:       "flex items-center justify-between gap-4",
  /** Page title */
  title:        "text-2xl font-semibold tracking-tight",
  /** Subtitle / breadcrumb */
  subtitle:     "text-sm text-muted-foreground",
  /** Action bar (filter + buttons) */
  toolbar:      "flex items-center gap-2 flex-wrap",
  /** Empty state container */
  empty:        "flex flex-col items-center justify-center gap-4 py-16 text-center",
  /** Empty state icon wrapper */
  emptyIcon:    "rounded-full bg-muted p-4",
} as const;

// ─── Badge patterns ────────────────────────────────────────────────────────────

export const BADGE = {
  base:        "inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium border",
  success:     "bg-success/10 text-success border-success/20",
  warning:     "bg-warning/10 text-warning border-warning/20",
  destructive: "bg-destructive/10 text-destructive border-destructive/20",
  info:        "bg-primary/10 text-primary border-primary/20",
  neutral:     "bg-muted text-muted-foreground border-border",
  outline:     "bg-transparent text-foreground border-border",
} as const;

// ─── Stat / KPI patterns ───────────────────────────────────────────────────────

export const STAT = {
  /** Outer card */
  card:        "rounded-lg border border-border bg-card p-4",
  /** Metric value — uses IBM Plex Mono */
  value:       "font-mono text-2xl font-semibold tabular-nums tracking-tight",
  /** Positive delta */
  deltaUp:     "text-xs font-medium text-success",
  /** Negative delta */
  deltaDown:   "text-xs font-medium text-destructive",
  /** Neutral delta */
  deltaNeutral:"text-xs font-medium text-muted-foreground",
  /** Stat label */
  label:       "text-xs text-muted-foreground",
} as const;

// ─── Section divider patterns ──────────────────────────────────────────────────

export const SECTION = {
  /** Horizontal divider with label */
  divider:     "relative flex items-center gap-3 py-2",
  /** Divider label text */
  dividerText: "text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap",
  /** Divider line */
  dividerLine: "flex-1 border-t border-border",
} as const;
