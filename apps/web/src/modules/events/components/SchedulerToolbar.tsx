import { Button } from "@/shared/ui/button";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { SchedulerFilters } from "@/modules/events/components/SchedulerFilters";
import type { SchedulerViewMode, SchedulerOption, SchedulerViewOption } from "@/modules/events/components/types";

interface SchedulerToolbarProps {
  periodLabel: string;
  currentView: SchedulerViewMode;
  viewOptions: SchedulerViewOption[];
  onViewModeChange: (value: SchedulerViewMode) => void;
  onToday: () => void;
  onPrev: () => void;
  onNext: () => void;
  search: string;
  onSearchChange: (value: string) => void;
  type?: string;
  onTypeChange?: (value: string) => void;
  typeOptions?: SchedulerOption[];
  status?: string;
  onStatusChange?: (value: string) => void;
  statusOptions?: SchedulerOption[];
  extraFilters?: React.ReactNode;
}

export function SchedulerToolbar({
  periodLabel,
  currentView,
  viewOptions,
  onViewModeChange,
  onToday,
  onPrev,
  onNext,
  search,
  onSearchChange,
  type,
  onTypeChange,
  typeOptions,
  status,
  onStatusChange,
  statusOptions,
  extraFilters,
}: SchedulerToolbarProps) {
  return (
    <div className="sticky top-0 z-30 rounded-[28px] border border-border/40 bg-background/95 px-4 py-3 shadow-sm backdrop-blur-sm">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="h-10" onClick={onToday}>
            Hoje
          </Button>
          <Button variant="outline" size="icon" className="h-10 w-10" onClick={onPrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-10 w-10" onClick={onNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-muted/50 px-3 py-2 text-sm font-medium text-foreground">
            <CalendarDays className="h-4 w-4 text-primary" />
            {periodLabel}
          </div>
        </div>

        <div className="flex-1 min-w-[220px]">
          <SchedulerFilters
            search={search}
            onSearchChange={onSearchChange}
            viewMode={currentView}
            onViewModeChange={onViewModeChange}
            viewOptions={viewOptions}
            tipo={type}
            onTipoChange={onTypeChange}
            tipoOptions={typeOptions}
            status={status}
            onStatusChange={onStatusChange}
            statusOptions={statusOptions}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">{extraFilters}</div>
      </div>
    </div>
  );
}
