import type { DataTableProps } from "./types";

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  isLoading = false,
  emptyMessage = "Nenhum resultado encontrado.",
  onRowClick,
  className,
  "data-testid": testId,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="rounded-md border overflow-hidden">
        <table className={["w-full text-sm", className].filter(Boolean).join(" ")}>
          <thead>
            <tr className="border-b bg-muted/50">
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className="h-12 px-4 text-left align-middle font-medium text-muted-foreground"
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b">
                {columns.map((col) => (
                  <td key={String(col.key)} className="h-12 px-4">
                    <div className="h-4 rounded bg-muted animate-pulse" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="rounded-md border overflow-hidden">
        <table className={["w-full text-sm", className].filter(Boolean).join(" ")}>
          <thead>
            <tr className="border-b bg-muted/50">
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className="h-12 px-4 text-left align-middle font-medium text-muted-foreground"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                {emptyMessage}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <table
        className={["w-full text-sm", className].filter(Boolean).join(" ")}
        data-testid={testId}
      >
        <thead>
          <tr className="border-b bg-muted/50">
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className={[
                  "h-12 px-4 text-left align-middle font-medium text-muted-foreground",
                  col.className,
                ].filter(Boolean).join(" ")}
                style={col.width ? { width: col.width } : undefined}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, ri) => (
            <tr
              key={ri}
              onClick={() => onRowClick?.(row)}
              className={[
                "border-b transition-colors hover:bg-muted/50",
                onRowClick ? "cursor-pointer" : "",
              ].filter(Boolean).join(" ")}
              data-testid={testId ? `${testId}-row-${ri}` : undefined}
            >
              {columns.map((col) => (
                <td
                  key={String(col.key)}
                  className={["h-12 px-4 align-middle", col.className].filter(Boolean).join(" ")}
                >
                  {col.render
                    ? col.render(row)
                    : String(row[col.key as keyof T] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
