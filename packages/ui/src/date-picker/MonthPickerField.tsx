import { useState } from "react";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import type { MonthPickerFieldProps } from "./types";

const MONTHS_PT = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

export function MonthPickerField({
  value,
  onChange,
  disabled,
  placeholder = "Selecione o mês",
  className,
  "data-testid": testId,
}: MonthPickerFieldProps) {
  const [open, setOpen] = useState(false);

  const parsed = value && /^\d{4}-\d{2}$/.test(value) ? value : null;
  const selYear  = parsed ? parseInt(parsed.split("-")[0]) : null;
  const selMonth = parsed ? parseInt(parsed.split("-")[1]) - 1 : null;

  const [navYear, setNavYear] = useState<number>(selYear ?? new Date().getFullYear());

  const displayLabel = parsed ? `${MONTHS_PT[selMonth!]} ${selYear}` : null;

  const baseButtonClass = [
    "flex h-10 w-full items-center justify-start gap-2 rounded-md border border-input bg-background px-3 py-2",
    "text-sm font-normal transition-colors duration-150",
    "hover:border-border",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
    "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted/40",
    className,
  ].filter(Boolean).join(" ");

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        data-testid={testId}
        onClick={() => {
          if (disabled) return;
          setOpen((prev) => !prev);
          setNavYear(selYear ?? new Date().getFullYear());
        }}
        className={baseButtonClass}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
        {displayLabel ? (
          <span className="text-foreground">{displayLabel}</span>
        ) : (
          <span className="text-muted-foreground/70">{placeholder}</span>
        )}
      </button>

      {open && !disabled && (
        <div className="absolute z-50 mt-1 rounded-md border bg-popover shadow-md p-3 w-[264px]">
          <div className="flex items-center justify-between mb-3 h-9">
            <button
              type="button"
              onClick={() => setNavYear((y) => y - 1)}
              aria-label="Ano anterior"
              className="inline-flex items-center justify-center rounded-md h-7 w-7 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold tabular-nums">{navYear}</span>
            <button
              type="button"
              onClick={() => setNavYear((y) => y + 1)}
              aria-label="Próximo ano"
              className="inline-flex items-center justify-center rounded-md h-7 w-7 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1">
            {MONTHS_PT.map((m, i) => {
              const isSelected = navYear === selYear && i === selMonth;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    const mm = String(i + 1).padStart(2, "0");
                    onChange(`${navYear}-${mm}`);
                    setOpen(false);
                  }}
                  className={[
                    "inline-flex items-center justify-center rounded-md h-8 px-1 text-xs font-medium transition-colors duration-100",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-muted",
                  ].join(" ")}
                >
                  {m.slice(0, 3)}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
