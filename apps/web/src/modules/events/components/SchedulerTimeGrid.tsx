import { useMemo } from "react";
import { addDays, format, isSameDay, startOfDay } from "date-fns";
import { isToday } from "date-fns";
import { SchedulerEventCard } from "@/modules/events/components/SchedulerEventCard";
import type { AgendaEvent } from "@/modules/events/components/types";

const DEFAULT_HOURS = [
  "08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00","21:00",
];

interface SchedulerTimeGridProps {
  weekStart: Date;
  events: AgendaEvent[];
  onSlotClick?: (date: Date, hour: string) => void;
  onView?: (event: AgendaEvent) => void;
  onEdit?: (event: AgendaEvent) => void;
  onDelete?: (event: AgendaEvent) => void;
  hours?: string[];
}

export function SchedulerTimeGrid({
  weekStart,
  events,
  onSlotClick,
  onView,
  onEdit,
  onDelete,
  hours = DEFAULT_HOURS,
}: SchedulerTimeGridProps) {
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart]);

  const eventsBySlot = useMemo(() => {
    const map: Record<number, Record<string, AgendaEvent[]>> = {};
    events.forEach((event) => {
      const dayIndex = days.findIndex((day) => isSameDay(day, event.startDate));
      if (dayIndex === -1) return;
      const slotHour = format(event.startDate, "HH:mm");
      map[dayIndex] ??= {};
      map[dayIndex][slotHour] ??= [];
      map[dayIndex][slotHour].push(event);
    });
    return map;
  }, [days, events]);

  const allDayEvents = useMemo(
    () => events.filter((event) => event.allDay || format(event.startDate, "HH:mm") === "00:00"),
    [events],
  );

  const eventsByDay = useMemo(() => {
    const map: Record<number, AgendaEvent[]> = {};
    allDayEvents.forEach((event) => {
      const dayIndex = days.findIndex((day) => isSameDay(day, event.startDate));
      if (dayIndex === -1) return;
      map[dayIndex] ??= [];
      map[dayIndex].push(event);
    });
    return map;
  }, [allDayEvents, days]);

  return (
    <div className="overflow-x-auto rounded-[32px] border border-border/20 bg-background/90">
      <div className="min-w-[940px]">
        <div className="grid border-b border-border/20" style={{ gridTemplateColumns: "72px repeat(7, minmax(0, 1fr))" }}>
          <div className="h-16 border-r border-border/20 bg-background" />
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className={`h-16 border-r border-border/20 last:border-r-0 px-3 py-3 text-center ${isToday(day) ? "bg-primary/5" : "bg-background"}`}
            >
              <div className="text-[10px] font-semibold  tracking-[0.35em] text-muted-foreground">
                {format(day, "EEE").toUpperCase()}
              </div>
              <div className="mt-2 text-lg font-semibold text-foreground">{format(day, "d")}</div>
              <div className="text-[11px] text-muted-foreground">{format(day, "MMM")}</div>
            </div>
          ))}
        </div>

        {allDayEvents.length > 0 && (
          <div className="grid border-b border-border/20" style={{ gridTemplateColumns: "72px repeat(7, minmax(0, 1fr))" }}>
            <div className="flex items-center justify-center border-r border-border/20 text-[10px] font-semibold  tracking-[0.2em] text-muted-foreground bg-background/95">
              Dia todo
            </div>
            {days.map((day, index) => (
              <div key={day.toISOString()} className="border-r border-border/20 last:border-r-0 p-2 min-h-[52px] space-y-2 bg-background/95">
                {(eventsByDay[index] ?? []).map((event) => (
                  <SchedulerEventCard
                    key={event.id}
                    event={event}
                    compact
                    onClick={onView}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            ))}
          </div>
        )}

        <div className="overflow-y-auto" style={{ minHeight: 520 }}>
          {hours.map((hour) => (
            <div
              key={hour}
              className="grid border-b border-border/15"
              style={{ gridTemplateColumns: "72px repeat(7, minmax(0, 1fr))" }}
            >
              <div className="flex items-start justify-end pr-3 pt-2 border-r border-border/20 bg-background/95">
                <span className="text-[11px] font-sans text-muted-foreground/70">{hour}</span>
              </div>
              {days.map((day, dayIndex) => {
                const items = eventsBySlot[dayIndex]?.[hour] ?? [];
                return (
                  <div
                    key={`${day.toISOString()}-${hour}`}
                    className={`border-r border-border/15 last:border-r-0 min-h-[88px] p-2 transition-colors ${isToday(day) ? "bg-primary/[0.04]" : "bg-background"}`}
                    onClick={() => { if (items.length === 0) onSlotClick?.(day, hour); }}
                  >
                    {items.length > 0 ? (
                      <div className="space-y-2">
                        {items.map((event) => (
                          <SchedulerEventCard
                            key={event.id}
                            event={event}
                            compact
                            onClick={onView}
                            onEdit={onEdit}
                            onDelete={onDelete}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="h-full rounded-2xl border border-dashed border-border/20 bg-background/50 text-center text-[11px] text-muted-foreground/40 opacity-100 transition-all hover:bg-muted/20">
                        <span className="block py-6">+</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
