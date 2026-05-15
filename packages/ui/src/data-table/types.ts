import type { ReactNode } from "react";

export interface DataTableColumn<T = Record<string, unknown>> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => ReactNode;
  className?: string;
  sortable?: boolean;
  width?: string;
}

export interface DataTableProps<T = Record<string, unknown>> {
  data: T[];
  columns: DataTableColumn<T>[];
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  className?: string;
  "data-testid"?: string;
}
