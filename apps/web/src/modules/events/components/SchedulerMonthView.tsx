import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, isSameMonth, isSameDay } from "date-fns";
import { SchedulerEventCard } from "@/modules/events/components/SchedulerEventCard";
import type { AgendaEvent } from "@/modules/events/components/types";

const WEEK_DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const HEAD_CELL = "text-[10px] font-semibold tracking-widest text-muted-foreground/60";

interface SchedulerMonthViewProps {
  month: Date;
  events: AgendaEvent[];
  onSlotClick?: (date: Date, hour: string) => void;
  onView?: (event: AgendaEvent) => void;
  onEdit?: (event: AgendaEvent) => void;
  onDelete?: (event: AgendaEvent) => void;
}

export function SchedulerMonthView({ month, events, onSlotClick, onView, onEdit, onDelete }: SchedulerMonthViewProps) {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start, end });

  const itemsForDay = (day: Date) =>
    events.filter((event) => isSameDay(event.startDate, day));

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="grid grid-cols-7 border-b border-border bg-muted/40">
        {WEEK_DAYS.map((day) => (
          <div key={day} className={`px-2 py-1.5 text-center ${HEAD_CELL}`}>
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => {
          const items = itemsForDay(day);
          const inMonth = isSameMonth(day, month);
          const today = isSameDay(day, new Date());

          return (
            <div
              key={day.toISOString()}
              className={`min-h-[92px] space-y-1 border-b border-r border-border/60 p-1.5 transition-colors ${inMonth ? "bg-background hover:bg-muted/20" : "bg-muted/20"}`}
              onClick={() => onSlotClick?.(day, "09:00")}
            >
              <div className="flex items-center justify-between">
                <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-medium ${today ? "text-primary ring-1 ring-primary/50 ring-offset-1 ring-offset-background" : inMonth ? "text-muted-foreground" : "text-muted-foreground/50"}`}>
                  {format(day, "d")}
                </span>
              </div>

              <div className="space-y-1" onClick={(event) => event.stopPropagation()}>
                {items.slice(0, 3).map((event) => (
                  <SchedulerEventCard key={event.id} event={event} compact onClick={onView} onEdit={onEdit} onDelete={onDelete} />
                ))}
                {items.length > 3 ? (
                  <div className="px-1 text-[10px] text-muted-foreground">+{items.length - 3} mais</div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
