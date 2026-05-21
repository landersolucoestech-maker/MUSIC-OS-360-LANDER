import { startOfDay, addHours, format, isSameDay, isToday } from "date-fns";
import { SchedulerEventCard } from "@/modules/events/components/SchedulerEventCard";
import type { AgendaEvent } from "@/modules/events/components/types";

const DEFAULT_HOURS = [
  "08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00","21:00",
];

interface SchedulerDayViewProps {
  day: Date;
  events: AgendaEvent[];
  onSlotClick?: (date: Date, hour: string) => void;
  onView?: (event: AgendaEvent) => void;
  onEdit?: (event: AgendaEvent) => void;
  onDelete?: (event: AgendaEvent) => void;
}

export function SchedulerDayView({ day, events, onSlotClick, onView, onEdit, onDelete }: SchedulerDayViewProps) {
  const dayStart = startOfDay(day);
  const dayEvents = events.filter((event) => isSameDay(event.startDate, day));
  const eventsByHour = DEFAULT_HOURS.reduce<Record<string, AgendaEvent[]>>((acc, hour) => {
    acc[hour] = dayEvents.filter((event) => format(event.startDate, "HH:mm") === hour);
    return acc;
  }, {});

  const allDayEvents = dayEvents.filter((event) => event.allDay || format(event.startDate, "HH:mm") === "00:00");

  return (
    <div className="overflow-x-auto rounded-[32px] border border-border/20 bg-background/90 shadow-sm">
      <div className="min-w-[720px]">
        {allDayEvents.length > 0 && (
          <div className="grid grid-cols-[120px_1fr] border-b border-border/20 bg-background/95">
            <div className="flex items-center justify-end pr-4 text-[10px] font-semibold uppercase tracking-[0.26em] text-muted-foreground">Dia inteiro</div>
            <div className="p-3 space-y-2">
              {allDayEvents.map((event) => (
                <SchedulerEventCard key={event.id} event={event} compact onClick={onEdit} />
              ))}
            </div>
          </div>
        )}

        <div className="overflow-y-auto" style={{ minHeight: 520 }}>
          {DEFAULT_HOURS.map((hour) => (
            <div key={hour} className="grid grid-cols-[120px_1fr] border-b border-border/15">
              <div className="flex items-start justify-end pr-4 pt-3 text-[11px] font-mono text-muted-foreground/70">{hour}</div>
              <div className="min-h-[80px] border-l border-border/15 p-3 transition-colors hover:bg-muted/10" onClick={() => onSlotClick?.(addHours(dayStart, parseInt(hour.slice(0, 2), 10)), hour)}>
                {eventsByHour[hour]?.length ? (
                  <div className="space-y-2">
                    {eventsByHour[hour].map((event) => (
                      <SchedulerEventCard key={event.id} event={event} compact onClick={onView} onEdit={onEdit} onDelete={onDelete} />
                    ))}
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-border/20 bg-background/50 text-[11px] text-muted-foreground/40">
                    <span>Adicionar</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
