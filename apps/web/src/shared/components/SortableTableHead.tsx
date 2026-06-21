import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type React from "react";

import { cn } from "@/shared/lib/utils";
import { type TableSortDirection, type TableSortState } from "@/shared/lib/table-sort";
import { TableHead } from "@/shared/ui/table";

type SortableTableHeadProps = {
  children: React.ReactNode;
  sortKey: string;
  sortState: TableSortState;
  onSort: (key: string) => void;
  className?: string;
  disabled?: boolean;
  align?: "left" | "center" | "right";
};

const sortLabels: Record<TableSortDirection, string> = {
  asc: "Ordenação crescente",
  desc: "Ordenação decrescente",
};

export function SortableTableHead({
  children,
  sortKey,
  sortState,
  onSort,
  className,
  disabled = false,
  align = "left",
}: SortableTableHeadProps) {
  const active = sortState?.key === sortKey;
  const direction = active ? sortState.direction : undefined;
  const Icon = direction === "asc" ? ArrowUp : direction === "desc" ? ArrowDown : ArrowUpDown;

  if (disabled) {
    return <TableHead className={className} data-no-sort="true">{children}</TableHead>;
  }

  return (
    <TableHead className={className} data-no-sort="true" aria-sort={direction ? (direction === "asc" ? "ascending" : "descending") : "none"}>
      <button
        type="button"
        className={cn(
          "inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-sm text-left font-sans text-xs font-medium leading-4 tracking-normal transition-colors",
          "hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          active && "text-foreground",
          align === "center" && "mx-auto justify-center text-center",
          align === "right" && "ml-auto justify-end text-right",
        )}
        onClick={() => onSort(sortKey)}
        title={direction ? sortLabels[direction] : "Ordenar coluna"}
      >
        <span className="truncate">{children}</span>
        <Icon className={cn("h-3.5 w-3.5 shrink-0", active ? "opacity-100" : "opacity-55")} />
      </button>
    </TableHead>
  );
}
