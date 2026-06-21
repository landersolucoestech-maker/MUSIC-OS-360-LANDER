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
  accent?: "primary" | "success" | "warning" | "destructive";
}

const accentMap = {
  primary:     { icon: "bg-primary/8 text-primary border-primary/15",         dot: "bg-primary" },
  success:     { icon: "bg-success/8 text-success border-success/15",         dot: "bg-success" },
  warning:     { icon: "bg-warning/8 text-warning border-warning/15",         dot: "bg-warning" },
  destructive: { icon: "bg-destructive/8 text-destructive border-destructive/15", dot: "bg-destructive" },
};

export function MetricCard({
  title, value, description, trend, icon: Icon, className, accent = "primary",
}: MetricCardProps) {
  const isPositive = trend && trend.value >= 0;
  const colors = accentMap[accent];

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Left: label + value */}
          <div className="flex-1 min-w-0 space-y-1.5">
            <p className={cn(
              "text-sm font-medium text-muted-foreground leading-none",
            )}>
              {title}
            </p>
            <p className={cn(
              "text-2xl font-bold tabular-nums tracking-tight text-foreground leading-none",
            )}>
              {value}
            </p>
            {description && (
              <p className="text-xs text-muted-foreground leading-snug">
                {description}
              </p>
            )}
          </div>

          {/* Right: icon */}
          {Icon && (
            <div className={cn(
              "rounded-lg p-2.5 border shrink-0",
              colors.icon,
            )}>
              <Icon className="h-[15px] w-[15px]" />
            </div>
          )}
        </div>

        {/* Trend */}
        {trend && (
          <div className="mt-3 flex items-center gap-1.5 pt-3 border-t border-border/50">
            <div className={cn(
              "flex items-center gap-1",
              isPositive ? "text-success" : "text-destructive",
            )}>
              {isPositive
                ? <TrendingUp className="h-3 w-3" />
                : <TrendingDown className="h-3 w-3" />}
              <span className="text-[11px] font-semibold font-sans tabular-nums">
                {isPositive ? "+" : ""}{trend.value}%
              </span>
            </div>
            {trend.label && (
              <span className="text-[11px] text-muted-foreground">{trend.label}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
