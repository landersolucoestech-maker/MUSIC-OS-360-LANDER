import { Check, ChevronDown, LayoutGrid, Search } from "lucide-react";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import type { SchedulerOption, SchedulerViewMode, SchedulerViewOption } from "@/modules/events/components/types";

interface SchedulerFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  viewMode: SchedulerViewMode;
  viewOptions: SchedulerViewOption[];
  onViewModeChange: (value: SchedulerViewMode) => void;
  tipo?: string;
  onTipoChange?: (value: string) => void;
  tipoOptions?: SchedulerOption[];
  status?: string;
  onStatusChange?: (value: string) => void;
  statusOptions?: SchedulerOption[];
}

export function SchedulerFilters({
  search,
  onSearchChange,
  viewMode,
  viewOptions,
  onViewModeChange,
  tipo,
  onTipoChange,
  tipoOptions,
  status,
  onStatusChange,
  statusOptions,
}: SchedulerFiltersProps) {
  const activeTipo = tipoOptions?.find((option) => option.value === tipo) ?? tipoOptions?.[0];
  const activeStatus = statusOptions?.find((option) => option.value === status) ?? statusOptions?.[0];

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[220px]">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-10 pl-10 text-sm bg-muted/60 border-border/40 rounded-2xl"
          placeholder="Buscar evento..."
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 gap-2 rounded-xl text-sm font-medium border-border/60 bg-muted/60 hover:bg-muted">
            <LayoutGrid className="h-4 w-4 text-muted-foreground" />
            {viewOptions.find((option) => option.value === viewMode)?.label ?? "Visualização"}
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44">
          {viewOptions.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => onViewModeChange(option.value)}
              className="flex items-center gap-2 text-sm"
            >
              <span className="flex-1">{option.label}</span>
              {viewMode === option.value && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {tipoOptions && onTipoChange ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-2 rounded-xl text-sm font-medium border-border/60 bg-muted/60 hover:bg-muted">
              {activeTipo?.label ?? "Tipo"}
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            {tipoOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => onTipoChange(option.value)}
                className="flex items-center gap-2 text-sm"
              >
                <span className="flex-1">{option.label}</span>
                {tipo === option.value && <Check className="h-4 w-4 text-primary" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}

      {statusOptions && onStatusChange ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-2 rounded-xl text-sm font-medium border-border/60 bg-muted/60 hover:bg-muted">
              {activeStatus?.label ?? "Status"}
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            {statusOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => onStatusChange(option.value)}
                className="flex items-center gap-2 text-sm"
              >
                {option.dot ? <span className={`h-2.5 w-2.5 rounded-full ${option.dot}`} /> : <span className="h-2.5 w-2.5" />}
                <span className="flex-1">{option.label}</span>
                {status === option.value && <Check className="h-4 w-4 text-primary" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}
