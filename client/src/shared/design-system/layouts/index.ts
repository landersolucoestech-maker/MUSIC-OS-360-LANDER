/**
 * MUSIC OS 360 — Layout Governance
 *
 * Container widths, breakpoints, grid rules, sidebar sizing.
 * Use these constants in layout components.
 */

// ─── Breakpoints ──────────────────────────────────────────────────────────────

export const BREAKPOINT = {
  sm:  640,   // px — mobile landscape
  md:  768,   // px — tablet
  lg:  1024,  // px — laptop
  xl:  1280,  // px — desktop
  "2xl": 1400, // px — wide desktop
} as const;

// ─── Container widths ─────────────────────────────────────────────────────────

export const CONTAINER = {
  /** Page content max-width */
  page:    "max-w-[1400px]",
  /** Main content area (with sidebar) */
  content: "max-w-[1200px]",
  /** Forms, detail panels */
  form:    "max-w-[720px]",
  /** Compact dialogs */
  dialog:  "max-w-[540px]",
  /** Wide dialog / sheet */
  sheet:   "max-w-[840px]",
} as const;

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export const SIDEBAR = {
  /** Expanded sidebar width */
  width:        "16rem",   // 256px — matches shadcn sidebar default
  /** Collapsed / icon-only width */
  widthIcon:    "3.5rem",  // 56px
  /** Mobile drawer width */
  widthMobile:  "18rem",   // 288px
} as const;

// ─── Dashboard grid ───────────────────────────────────────────────────────────

export const GRID = {
  /** KPI metric row — 4 cards */
  kpiRow:    "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4",
  /** Standard content grid — 3 columns */
  content3:  "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4",
  /** Wide content grid — 2 columns */
  content2:  "grid grid-cols-1 lg:grid-cols-2 gap-4",
  /** Full-width single column */
  full:      "grid grid-cols-1 gap-4",
  /** Detail + sidebar split */
  detail:    "grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6",
} as const;

// ─── Content density ──────────────────────────────────────────────────────────

export const DENSITY = {
  /** Compact — dense tables, sidebars */
  compact: {
    padding:  "px-3 py-1.5",
    gap:      "gap-2",
    text:     "text-xs",
  },
  /** Default — standard UI */
  default: {
    padding:  "px-4 py-3",
    gap:      "gap-3",
    text:     "text-sm",
  },
  /** Comfortable — dashboards, empty states */
  comfortable: {
    padding:  "px-6 py-4",
    gap:      "gap-4",
    text:     "text-sm",
  },
} as const;
