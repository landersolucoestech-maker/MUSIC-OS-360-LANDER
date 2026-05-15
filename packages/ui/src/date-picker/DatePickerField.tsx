import { useState } from "react";
import { format, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import type { DatePickerFieldProps } from "./types";

export function DatePickerField({
  value,
  onChange,
  disabled,
  placeholder = "Selecione uma data",
  className,
  "data-testid": testId,
}: DatePickerFieldProps) {
  const [open, setOpen] = useState(false);
  const parsed = value ? parseISO(value) : undefined;
  const selected = parsed && isValid(parsed) ? parsed : undefined;

  const baseClass = [
    "flex h-10 w-full items-center justify-start gap-2 rounded-md border border-input bg-background px-3 py-2",
    "text-sm font-normal transition-colors duration-150",
    "hover:border-border",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
    "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted/40",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        data-testid={testId}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className={baseClass}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
        {selected ? (
          <span className="text-foreground">
            {format(selected, "dd/MM/yyyy", { locale: ptBR })}
          </span>
        ) : (
          <span className="text-muted-foreground/70">{placeholder}</span>
        )}
      </button>

      {open && !disabled && (
        <div className="absolute z-50 mt-1 rounded-md border bg-popover p-0 shadow-md">
          <div className="p-3">
            <DatePickerCalendar
              selected={selected}
              onSelect={(date) => {
                if (date) {
                  onChange(format(date, "yyyy-MM-dd"));
                  setOpen(false);
                }
              }}
              locale={ptBR}
            />
          </div>
        </div>
      )}
    </div>
  );
}

interface CalendarProps {
  selected: Date | undefined;
  onSelect: (date: Date | undefined) => void;
  locale: typeof ptBR;
}

function DatePickerCalendar({ selected, onSelect, locale }: CalendarProps) {
  const [viewDate, setViewDate] = useState(selected ?? new Date());

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const monthLabel = format(viewDate, "MMMM yyyy", { locale });

  const weeks: (number | null)[][] = [];
  let day = 1;
  for (let row = 0; row < 6; row++) {
    const week: (number | null)[] = [];
    for (let col = 0; col < 7; col++) {
      if (row === 0 && col < firstDayOfWeek) {
        week.push(null);
      } else if (day > daysInMonth) {
        week.push(null);
      } else {
        week.push(day++);
      }
    }
    weeks.push(week);
    if (day > daysInMonth) break;
  }

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div className="select-none w-[280px]">
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => setViewDate(new Date(year, month - 1, 1))}
          className="p-1 rounded hover:bg-accent text-muted-foreground"
        >
          ‹
        </button>
        <span className="text-sm font-semibold capitalize">{monthLabel}</span>
        <button
          type="button"
          onClick={() => setViewDate(new Date(year, month + 1, 1))}
          className="p-1 rounded hover:bg-accent text-muted-foreground"
        >
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 text-center mb-1">
        {weekDays.map((d) => (
          <span key={d} className="text-xs font-medium text-muted-foreground py-1">
            {d}
          </span>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 text-center">
          {week.map((d, di) => {
            if (!d) return <span key={di} />;
            const isSelected =
              selected &&
              selected.getFullYear() === year &&
              selected.getMonth() === month &&
              selected.getDate() === d;
            const isToday =
              new Date().getFullYear() === year &&
              new Date().getMonth() === month &&
              new Date().getDate() === d;
            return (
              <button
                key={di}
                type="button"
                onClick={() => onSelect(new Date(year, month, d))}
                className={[
                  "h-8 w-8 mx-auto rounded-full text-sm transition-colors",
                  isSelected
                    ? "bg-primary text-primary-foreground font-semibold"
                    : isToday
                      ? "border border-primary text-primary font-medium hover:bg-accent"
                      : "hover:bg-accent",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {d}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
