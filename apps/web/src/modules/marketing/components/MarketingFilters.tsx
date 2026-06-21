/**
 * Standard filter bar: a search box plus any number of select filters.
 * Select filters use the ALL_FILTER sentinel for the "no filter" option
 * (Radix Select disallows empty-string item values).
 */

import { Search } from "lucide-react";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";

export const ALL_FILTER = "__all__";

export interface SelectFilterConfig {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  allLabel?: string;
  options: { value: string; label: string }[];
}

interface MarketingFiltersProps {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: SelectFilterConfig[];
}

export function MarketingFilters({
  search,
  onSearchChange,
  searchPlaceholder = "Pesquisar...",
  filters = [],
}: MarketingFiltersProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      {onSearchChange && (
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search ?? ""}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-8 h-8 text-sm"
          />
        </div>
      )}
      {filters.map((filter, index) => (
        <Select key={index} value={filter.value} onValueChange={filter.onChange}>
          <SelectTrigger className="h-8 text-sm w-auto min-w-[140px] shrink-0">
            <SelectValue placeholder={filter.placeholder} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER}>{filter.allLabel ?? "Todos"}</SelectItem>
            {filter.options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
    </div>
  );
}
