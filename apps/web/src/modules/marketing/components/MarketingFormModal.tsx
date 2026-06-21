/**
 * Declarative create/edit modal.
 *
 * Pages pass a field schema + initial values; this component renders the form,
 * enforces required fields, normalizes values (numbers, arrays) and returns a
 * plain values object on submit. One modal powers every marketing entity form,
 * avoiding bespoke per-entity modals.
 */

import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { DatePickerField } from "@/shared/ui/date-picker-field";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/shared/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "select"
  | "multiselect"
  | "date"
  | "time"
  | "tags";

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  colSpan?: 1 | 2;
  helpText?: string;
  /**
   * Name of the field whose value this field depends on. While the parent is
   * empty the field is disabled; when the parent changes, this field is cleared.
   */
  dependsOn?: string;
  /**
   * Dynamic options derived from the full form values (overrides `options`).
   * Used for dependent selects (e.g. Tipo filtered by Setor) and for selects
   * whose options come from runtime data (e.g. artists/projects/companies).
   */
  computeOptions?: (values: FormValues) => { value: string; label: string }[];
  /** Renders a searchable combobox (cmdk) instead of a plain select. */
  searchable?: boolean;
}

export type FormValues = Record<string, unknown>;

interface MarketingFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  fields: FieldDef[];
  initialValues: FormValues;
  submitLabel?: string;
  submitting?: boolean;
  /** Renders every field disabled and hides the submit action. */
  readOnly?: boolean;
  /** Optional custom content rendered below the fields (e.g. deliverables). */
  extraContent?: ReactNode;
  onSubmit: (values: FormValues) => void;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function asArray(value: unknown): string[] {
  return Array.isArray(value) ? (value as string[]) : [];
}

export function MarketingFormModal({
  open,
  onOpenChange,
  title,
  description,
  fields,
  initialValues,
  submitLabel = "Salvar",
  submitting = false,
  readOnly = false,
  extraContent,
  onSubmit,
}: MarketingFormModalProps) {
  const [values, setValues] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  // Reset form whenever it (re)opens or the target record changes.
  useEffect(() => {
    if (open) {
      setValues(initialValues);
      setErrors({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const setValue = (name: string, value: unknown) => {
    setValues((prev) => {
      const next = { ...prev, [name]: value };
      // Cascade-clear dependents: changing Contexto clears Registro + Setor, and
      // clearing Setor in turn clears Tipo. Repeats until no further field resets.
      const cleared = new Set<string>([name]);
      let changed = true;
      while (changed) {
        changed = false;
        for (const f of fields) {
          if (f.dependsOn && cleared.has(f.dependsOn) && next[f.name] !== "") {
            next[f.name] = "";
            cleared.add(f.name);
            changed = true;
          }
        }
      }
      return next;
    });
    setErrors((prev) => ({ ...prev, [name]: false }));
  };

  const toggleMulti = (name: string, option: string) => {
    const current = asArray(values[name]);
    const next = current.includes(option)
      ? current.filter((v) => v !== option)
      : [...current, option];
    setValue(name, next);
  };

  const handleSubmit = () => {
    if (readOnly) return;
    const nextErrors: Record<string, boolean> = {};
    for (const field of fields) {
      if (!field.required) continue;
      const value = values[field.name];
      const empty =
        value == null ||
        value === "" ||
        (Array.isArray(value) && value.length === 0);
      if (empty) nextErrors[field.name] = true;
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    // Normalize numbers before handing values back.
    const normalized: FormValues = { ...values };
    for (const field of fields) {
      if (field.type === "number") {
        normalized[field.name] = Number(values[field.name] ?? 0);
      }
    }
    onSubmit(normalized);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {fields.map((field) => (
            <div
              key={field.name}
              className={cn("space-y-1.5", field.colSpan === 2 && "sm:col-span-2")}
            >
              <Label className="text-xs font-medium">
                {field.label}
                {field.required && <span className="text-destructive"> *</span>}
              </Label>

              {renderField(field, values, setValue, toggleMulti, readOnly)}

              {field.helpText && (
                <p className="text-[11px] text-muted-foreground">{field.helpText}</p>
              )}
              {errors[field.name] && (
                <p className="text-[11px] text-destructive">Campo obrigatório</p>
              )}
            </div>
          ))}
        </div>

        {extraContent && <div className="mt-5 border-t border-border pt-4">{extraContent}</div>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {readOnly ? "Fechar" : "Cancelar"}
          </Button>
          {!readOnly && (
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Salvando..." : submitLabel}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function renderField(
  field: FieldDef,
  values: FormValues,
  setValue: (name: string, value: unknown) => void,
  toggleMulti: (name: string, option: string) => void,
  readOnly: boolean,
) {
  switch (field.type) {
    case "textarea":
      return (
        <Textarea
          value={asString(values[field.name])}
          onChange={(e) => setValue(field.name, e.target.value)}
          placeholder={field.placeholder}
          rows={3}
          disabled={readOnly}
        />
      );

    case "number":
      return (
        <Input
          type="number"
          value={asString(values[field.name])}
          onChange={(e) => setValue(field.name, e.target.value)}
          placeholder={field.placeholder}
          disabled={readOnly}
        />
      );

    case "date":
      return (
        <DatePickerField
          value={asString(values[field.name])}
          onChange={(iso) => setValue(field.name, iso)}
          disabled={readOnly}
        />
      );

    case "time":
      return (
        <Input
          type="time"
          value={asString(values[field.name])}
          onChange={(e) => setValue(field.name, e.target.value)}
          disabled={readOnly}
        />
      );

    case "tags":
      return (
        <Input
          value={asArray(values[field.name]).join(", ")}
          onChange={(e) =>
            setValue(
              field.name,
              e.target.value
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean),
            )
          }
          placeholder={field.placeholder ?? "Separe por vírgulas"}
          disabled={readOnly}
        />
      );

    case "select": {
      const options = field.computeOptions ? field.computeOptions(values) : field.options ?? [];
      const lockedByDep = field.dependsOn != null && !asString(values[field.dependsOn]);
      const disabled = readOnly || lockedByDep;
      const placeholder = lockedByDep
        ? "Selecione antes a dependência"
        : field.placeholder ?? "Selecione";

      if (field.searchable) {
        return (
          <SearchableSelectField
            value={asString(values[field.name])}
            options={options}
            disabled={disabled}
            placeholder={placeholder}
            onChange={(v) => setValue(field.name, v)}
          />
        );
      }

      return (
        <Select
          value={asString(values[field.name])}
          onValueChange={(v) => setValue(field.name, v)}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    case "multiselect": {
      const selected = asArray(values[field.name]);
      const options = field.options ?? [];
      const selectedLabels = options
        .filter((opt) => selected.includes(opt.value))
        .map((opt) => opt.label);
      const summary =
        selectedLabels.length === 0
          ? field.placeholder ?? "Selecione"
          : selectedLabels.length <= 2
            ? selectedLabels.join(", ")
            : `${selectedLabels.length} selecionados`;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              disabled={readOnly}
              className={cn(
                "flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1",
                "text-left text-sm transition-colors hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selectedLabels.length === 0 && "text-muted-foreground",
                readOnly && "cursor-not-allowed opacity-50",
              )}
            >
              <span className="min-w-0 truncate">{summary}</span>
              <span className="ml-2 text-xs text-muted-foreground">⌄</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-72 w-64 overflow-y-auto">
            {options.map((opt) => (
              <DropdownMenuCheckboxItem
                key={opt.value}
                checked={selected.includes(opt.value)}
                onCheckedChange={() => toggleMulti(field.name, opt.value)}
                onSelect={(event) => event.preventDefault()}
              >
                {opt.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    case "text":
    default:
      return (
        <Input
          value={asString(values[field.name])}
          onChange={(e) => setValue(field.name, e.target.value)}
          placeholder={field.placeholder}
          disabled={readOnly}
        />
      );
  }
}

/** Single-select searchable combobox (cmdk) for selects with many options. */
function SearchableSelectField({
  value,
  options,
  disabled,
  placeholder,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  disabled?: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2",
            "text-left text-sm transition-colors hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            !selected && "text-muted-foreground",
            disabled && "cursor-not-allowed opacity-50",
          )}
        >
          <span className="min-w-0 truncate">{selected?.label ?? placeholder ?? "Selecione"}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar..." />
          <CommandList>
            <CommandEmpty>Nenhum registro encontrado.</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.label}
                  onSelect={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === opt.value ? "opacity-100" : "opacity-0")} />
                  {opt.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
