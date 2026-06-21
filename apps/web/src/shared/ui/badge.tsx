import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/shared/lib/utils";

/**
 * Badge — fonte ÚNICA de estilização de badges/tags/chips/status do app.
 *
 * Apenas 5 variants canônicos (success | info | warning | danger | neutral),
 * com paleta padrão e contraste garantido (fundo claro → texto escuro).
 * Nenhuma tela deve aplicar classes de cor de badge manualmente — sempre passar
 * por aqui (via `variant`) ou pelo resolver semântico `StatusBadge`.
 *
 * Os nomes legados (default/secondary/destructive/outline/muted) são mantidos
 * como aliases dos 5 canônicos para não quebrar chamadas existentes.
 */
const badgeVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md border border-transparent px-2 py-0.5 text-xs font-medium leading-none transition-colors",
  {
    variants: {
      variant: {
        // ── 5 variants canônicos ──────────────────────────────────────────
        success: "bg-green-100 text-green-800",
        info: "bg-blue-100 text-blue-800",
        warning: "bg-yellow-100 text-yellow-800",
        danger: "bg-red-100 text-red-800",
        neutral: "bg-slate-100 text-slate-800",
        // ── Aliases legados (mapeados aos canônicos) ──────────────────────
        destructive: "bg-red-100 text-red-800",
        default: "bg-slate-100 text-slate-800",
        secondary: "bg-slate-100 text-slate-800",
        outline: "bg-slate-100 text-slate-800",
        muted: "bg-slate-100 text-slate-800",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

/** Os 5 variants canônicos permitidos para badges/status. */
export type BadgeVariant = "success" | "info" | "warning" | "danger" | "neutral";

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(badgeVariants({ variant }), className)}
        {...props}
      />
    );
  },
);
Badge.displayName = "Badge";

export { Badge, badgeVariants };
