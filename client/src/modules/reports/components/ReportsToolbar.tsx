import { useState } from "react";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Search, RefreshCw, Upload, Download, X } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface ReportsToolbarProps {
  search?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  dateFrom?: string;
  onDateFromChange?: (v: string) => void;
  dateTo?: string;
  onDateToChange?: (v: string) => void;
  periodOptions?: { value: string; label: string }[];
  period?: string;
  onPeriodChange?: (v: string) => void;
  onRefresh?: () => void;
  onImport?: () => void;
  onExport?: () => void;
  exportDisabled?: boolean;
  importDisabled?: boolean;
  isRefreshing?: boolean;
  extra?: React.ReactNode;
  className?: string;
}

export function ReportsToolbar({
  search,
  onSearchChange,
  searchPlaceholder = "Buscar...",
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  periodOptions,
  period,
  onPeriodChange,
  onRefresh,
  onImport,
  onExport,
  exportDisabled,
  importDisabled,
  isRefreshing,
  extra,
  className,
}: ReportsToolbarProps) {
  const hasFilters = !!(search || dateFrom || dateTo || (period && period !== "all"));

  function clearFilters() {
    onSearchChange?.("");
    onDateFromChange?.("");
    onDateToChange?.("");
    onPeriodChange?.("all");
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {onSearchChange && (
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search ?? ""}
            onChange={e => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-9 h-9 bg-card border-border"
            data-testid="reports-toolbar-search"
          />
        </div>
      )}

      {periodOptions && onPeriodChange && (
        <Select value={period ?? "all"} onValueChange={onPeriodChange}>
          <SelectTrigger className="w-36 h-9 text-xs bg-card border-border" data-testid="reports-toolbar-period">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            {periodOptions.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {onDateFromChange && (
        <Input
          type="date"
          value={dateFrom ?? ""}
          onChange={e => onDateFromChange(e.target.value)}
          className="w-36 h-9 text-xs bg-card border-border"
          data-testid="reports-toolbar-date-from"
        />
      )}

      {onDateToChange && (
        <Input
          type="date"
          value={dateTo ?? ""}
          onChange={e => onDateToChange(e.target.value)}
          className="w-36 h-9 text-xs bg-card border-border"
          data-testid="reports-toolbar-date-to"
        />
      )}

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 px-2 text-muted-foreground hover:text-foreground" data-testid="reports-toolbar-clear">
          <X className="h-3.5 w-3.5 mr-1" /> Limpar
        </Button>
      )}

      {extra && <div className="flex items-center gap-2">{extra}</div>}

      <div className="flex items-center gap-2 ml-auto">
        {onRefresh && (
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={isRefreshing} className="h-9" data-testid="reports-toolbar-refresh">
            <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
          </Button>
        )}
        {onImport && (
          <Button variant="outline" size="sm" onClick={onImport} disabled={importDisabled} className="h-9" data-testid="reports-toolbar-import">
            <Upload className="h-3.5 w-3.5 mr-1.5" /> Importar
          </Button>
        )}
        {onExport && (
          <Button size="sm" onClick={onExport} disabled={exportDisabled} className="h-9" data-testid="reports-toolbar-export">
            <Download className="h-3.5 w-3.5 mr-1.5" /> Exportar
          </Button>
        )}
      </div>
    </div>
  );
}
