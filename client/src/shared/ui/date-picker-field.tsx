import { useState } from "react";
import { format, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Calendar } from "@/shared/ui/calendar";
import { cn } from "@/shared/lib/utils";

interface DatePickerFieldProps {
  value: string;
  onChange: (iso: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  "data-testid"?: string;
}

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

  return (
    <Popover open={open && !disabled} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          data-testid={testId}
          className={cn(
            "w-full justify-start text-left font-normal bg-background border-border text-sm h-9",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
          {selected ? (
            <span>{format(selected, "dd/MM/yyyy", { locale: ptBR })}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            if (date) {
              onChange(format(date, "yyyy-MM-dd"));
              setOpen(false);
            }
          }}
          initialFocus
          locale={ptBR}
        />
      </PopoverContent>
    </Popover>
  );
}
