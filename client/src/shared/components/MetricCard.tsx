import { Card, CardContent } from "@/shared/ui/card";
import { cn } from "@/shared/lib/utils";
import { TrendingDown, TrendingUp } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: {
    value: number;
    label?: string;
  };
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
  /** Optional accent color for the top border or icon */
  accent?: "primary" | "success" | "warning" | "destructive";
}

const accentMap = {
  primary:     { icon: "bg-primary/10 border-primary/20 text-primary",     border: "border-t-primary" },
  success:     { icon: "bg-success/10 border-success/20 text-success",     border: "border-t-success" },
  warning:     { icon: "bg-warning/10 border-warning/20 text-warning",     border: "border-t-warning" },
  destructive: { icon: "bg-destructive/10 border-destructive/20 text-destructive", border: "border-t-destructive" },
};

export function MetricCard({
  title, value, description, trend, icon: Icon, className, accent = "primary",
}: MetricCardProps) {
  const isPositive = trend && trend.value >= 0;
  const colors = accentMap[accent];

  return (
    <Card className={cn(
      "relative overflow-hidden border-t-2",
      colors.border,
      className
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground leading-none mb-2">
              {title}
            </p>
            <p className="text-2xl font-mono font-semibold tabular-nums tracking-tight text-foreground leading-none">
              {value}
            </p>
            {description && (
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{description}</p>
            )}
          </div>
          {Icon && (
            <div className={cn(
              "rounded-lg p-2.5 border shrink-0",
              colors.icon
            )}>
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>
        {trend && (
          <div className="mt-3 flex items-center gap-1.5">
            {isPositive
              ? <TrendingUp className="h-3.5 w-3.5 text-success" />
              : <TrendingDown className="h-3.5 w-3.5 text-destructive" />}
            <span className={cn(
              "text-xs font-semibold font-mono",
              isPositive ? "text-success" : "text-destructive"
            )}>
              {isPositive ? "+" : ""}{trend.value}%
            </span>
            {trend.label && (
              <span className="text-xs text-muted-foreground">{trend.label}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
