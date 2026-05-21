import { Plus } from "lucide-react";
import { Button } from "@/shared/ui/button";

interface SchedulerHeaderProps {
  title: string;
  description?: string;
  onCreate?: () => void;
  createLabel?: string;
  extra?: React.ReactNode;
}

export function SchedulerHeader({
  title,
  description,
  onCreate,
  createLabel = "Novo Evento",
  extra,
}: SchedulerHeaderProps) {
  return (
    <div className="mb-4 rounded-[28px] border border-border/30 bg-card/80 px-4 py-4 shadow-sm backdrop-blur-sm sm:px-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Operacional</span>
          </div>
          {description ? (
            <p className="text-sm text-muted-foreground max-w-2xl">{description}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {extra}
          {onCreate ? (
            <Button size="sm" className="h-10 gap-2 rounded-xl bg-primary text-primary-foreground" onClick={onCreate}>
              <Plus className="h-4 w-4" />
              {createLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
