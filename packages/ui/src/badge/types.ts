export type StatusVariant =
  | "default"
  | "success"
  | "warning"
  | "destructive"
  | "info"
  | "outline"
  | "muted";

export interface StatusBadgeProps {
  label: string;
  variant?: StatusVariant;
  className?: string;
  "data-testid"?: string;
}
