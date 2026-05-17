import { format, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type { ConteudoWithRelations } from "@/modules/marketing/hooks/useConteudos";
import { CalendarCard } from "./CalendarCard";

const HOURS = Array.from({ length: 16 }, (_, i) => i + 7);

interface DayCalendarProps {
  day: Date;
  conteudos: ConteudoWithRelations[];
  onEdit: (c: ConteudoWithRelations) => void;
  onDelete: (c: ConteudoWithRelations) => void;
  onSlotClick: (date: Date, hour: string) => void;
}

export function DayCalendar({ day, conteudos, onEdit, onDelete, onSlotClick }: DayCalendarProps) {
  const dayLabel = format(day, "EEEE, d 'de' MMMM", { locale: ptBR });
  const isToday = isSameDay(day, new Date());

  const itemsForHour = (hour: number) =>
    conteudos.filter((c) => {
      try {
        const d = c.data_publicacao ? parseISO(c.data_publicacao) : null;
        if (!d || !isSameDay(d, day)) return false;
        const h = c.horario_publicacao ? parseInt(c.horario_publicacao.split(":")[0], 10) : -1;
        return h === hour;
      } catch {
        return false;
      }
    });

  return (
    <div className="rounded-2xl border border-border/40 overflow-hidden bg-card">
      {/* Day header */}
      <div
        className={cn(
          "px-6 py-3 border-b border-border/30 text-sm font-semibold capitalize",
          isToday ? "bg-primary/10 text-primary" : "bg-muted/30 text-foreground",
        )}
      >
        {dayLabel}
      </div>

      {/* Hour rows */}
      <div className="divide-y divide-border/20">
        {HOURS.map((hour) => {
          const items = itemsForHour(hour);
          const hourStr = `${String(hour).padStart(2, "0")}:00`;

          return (
            <div
              key={hour}
              className="flex min-h-[72px] group"
              onClick={() => items.length === 0 && onSlotClick(day, hourStr)}
            >
              {/* Time label */}
              <div className="w-16 shrink-0 flex items-start justify-end pr-3 pt-2.5">
                <span className="text-xs text-muted-foreground/60 font-mono">{hourStr}</span>
              </div>

              {/* Content slot */}
              <div className="flex-1 px-3 py-2 relative cursor-pointer">
                {items.length > 0 ? (
                  <div className="flex flex-col gap-1.5">
                    {items.map((c) => (
                      <CalendarCard
                        key={c.id}
                        conteudo={c}
                        onEdit={onEdit}
                        onDelete={onDelete}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60 select-none">
                      <Plus className="h-3 w-3" />
                      <span>Adicionar conteúdo</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
