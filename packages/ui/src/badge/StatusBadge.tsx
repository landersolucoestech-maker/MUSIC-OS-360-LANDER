import type { StatusBadgeProps } from "./types";

const variantClasses: Record<string, string> = {
  default: "bg-primary/10 text-primary border-primary/20",
  success: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
  warning: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
  destructive: "bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400",
  info: "bg-sky-500/10 text-sky-600 border-sky-500/20 dark:text-sky-400",
  outline: "border-border text-muted-foreground",
  muted: "bg-muted text-muted-foreground border-transparent",
};

export function StatusBadge({
  label,
  variant = "default",
  className,
  "data-testid": testId,
}: StatusBadgeProps) {
  return (
    <span
      data-testid={testId}
      className={[
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
        variantClasses[variant] ?? variantClasses.default,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {label}
    </span>
  );
}
