import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, isSameMonth, isSameDay } from "date-fns";
import { Plus } from "lucide-react";
import { SchedulerEventCard } from "@/modules/events/components/SchedulerEventCard";
import type { AgendaEvent } from "@/modules/events/components/types";

const WEEK_DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

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
    <div className="rounded-3xl border border-border/60 overflow-hidden bg-card shadow-sm">
      <div className="grid grid-cols-7 border-b border-border/30 bg-muted/30">
        {WEEK_DAYS.map((day) => (
          <div key={day} className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 divide-x divide-y divide-border/20">
        {days.map((day) => {
          const items = itemsForDay(day);
          const inMonth = isSameMonth(day, month);
          const today = isSameDay(day, new Date());

          return (
            <div
              key={day.toISOString()}
              className={`min-h-[130px] p-3 transition-colors ${inMonth ? "bg-background hover:bg-muted/20" : "bg-muted/10"}`}
              onClick={() => onSlotClick?.(day, "09:00")}
            >
              <div className="flex items-center justify-between">
                <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${today ? "bg-primary text-primary-foreground" : inMonth ? "text-foreground" : "text-muted-foreground/70"}`}>
                  {format(day, "d")}
                </span>
                {inMonth && <Plus className="h-4 w-4 text-muted-foreground/50" />}
              </div>

              <div className="mt-3 space-y-2" onClick={(event) => event.stopPropagation()}>
                {items.slice(0, 2).map((event) => (
                  <SchedulerEventCard key={event.id} event={event} compact onClick={onView} onEdit={onEdit} onDelete={onDelete} />
                ))}
                {items.length > 2 ? (
                  <div className="text-[10px] text-muted-foreground">+{items.length - 2} mais</div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
