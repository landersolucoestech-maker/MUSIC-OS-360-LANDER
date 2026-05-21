import { SchedulerTimeGrid } from "@/modules/events/components/SchedulerTimeGrid";
import type { AgendaEvent } from "@/modules/events/components/types";

interface SchedulerWeekViewProps {
  weekStart: Date;
  events: AgendaEvent[];
  onSlotClick?: (date: Date, hour: string) => void;
  onView?: (event: AgendaEvent) => void;
  onEdit?: (event: AgendaEvent) => void;
  onDelete?: (event: AgendaEvent) => void;
}

export function SchedulerWeekView({ weekStart, events, onSlotClick, onView, onEdit, onDelete }: SchedulerWeekViewProps) {
  return (
    <div className="space-y-4">
      <SchedulerTimeGrid
        weekStart={weekStart}
        events={events}
        onSlotClick={onSlotClick}
        onView={onView}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  );
}
