/**
 * MUSIC OS 360 — Component Variant Governance
 *
 * Defines canonical variant configurations for base UI components.
 * These extend shadcn/Radix defaults without overriding them.
 * Use these as the reference when building new components.
 */

// ─── Button variants ───────────────────────────────────────────────────────────

export const BUTTON_VARIANT = {
  /** Primary action — solid blue */
  primary:   "bg-primary text-primary-foreground hover:brightness-105 active:brightness-95 shadow-sm",
  /** Secondary action — outlined */
  secondary: "border border-border bg-card text-foreground hover:bg-muted/60 active:bg-muted",
  /** Ghost — no background until hover */
  ghost:     "text-foreground hover:bg-muted/60 active:bg-muted",
  /** Destructive — critical actions */
  destructive:"bg-destructive text-destructive-foreground hover:brightness-105 active:brightness-95",
  /** Link — underline on hover */
  link:      "text-primary underline-offset-4 hover:underline p-0 h-auto",
} as const;

export const BUTTON_SIZE = {
  xs:  "h-7  px-2.5 text-xs  rounded-sm",
  sm:  "h-8  px-3   text-xs  rounded-md",
  md:  "h-9  px-4   text-sm  rounded-md",
  lg:  "h-10 px-5   text-sm  rounded-md",
  xl:  "h-11 px-6   text-base rounded-md",
  icon:"h-9  w-9            rounded-md",
} as const;

// ─── Input variants ────────────────────────────────────────────────────────────

export const INPUT_VARIANT = {
  default:  "border border-input bg-background text-sm rounded-md px-3 h-9 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
  error:    "border border-destructive bg-background text-sm rounded-md px-3 h-9 focus-visible:ring-2 focus-visible:ring-destructive focus-visible:outline-none",
  disabled: "border border-input bg-muted text-muted-foreground text-sm rounded-md px-3 h-9 cursor-not-allowed opacity-60",
} as const;

// ─── Dialog / modal governance ─────────────────────────────────────────────────

export const DIALOG_SIZE = {
  /** Confirmation dialogs, small alerts */
  xs:   "max-w-sm",
  /** Default modal */
  sm:   "max-w-md",
  /** Form modals — standard */
  md:   "max-w-2xl",
  /** Large form / detail modals */
  lg:   "max-w-3xl",
  /** Wide content — tables, previews */
  xl:   "max-w-5xl",
  /** Full-bleed */
  full: "max-w-[90vw]",
} as const;

// ─── Table configuration ───────────────────────────────────────────────────────

export const TABLE_CONFIG = {
  /** Rows per page options */
  pageSizeOptions: [10, 20, 50, 100] as const,
  /** Default rows per page */
  defaultPageSize: 20,
  /** Minimum column width */
  minColWidth: 80,
} as const;

// ─── Drawer configuration ──────────────────────────────────────────────────────

export const DRAWER_SIZE = {
  sm:   "w-[320px]",
  md:   "w-[480px]",
  lg:   "w-[640px]",
  xl:   "w-[800px]",
} as const;
