import { Button } from "@/shared/ui/button";
import { Plus } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick?: () => void;
  };
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  const buttonLabel = action?.label || actionLabel;
  const buttonOnClick = action?.onClick || onAction;

  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-16 text-center",
      className
    )}>
      <div className="rounded-xl bg-muted/60 border border-border p-5 mb-5">
        <Icon className="h-7 w-7 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1.5">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs leading-relaxed mb-5">
        {description}
      </p>
      {buttonLabel && buttonOnClick && (
        <Button size="sm" onClick={buttonOnClick}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          {buttonLabel}
        </Button>
      )}
    </div>
  );
}
