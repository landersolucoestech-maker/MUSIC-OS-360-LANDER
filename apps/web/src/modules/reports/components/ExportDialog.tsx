/**
 * modules/reports/components/ExportDialog.tsx  ·  FASE 2.5
 * UI de exportação 100% dirigida pelo contrato do backend (sem hardcode).
 */
import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { Input } from "@/shared/ui/input";
import { Download, Loader2 } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useReportExport } from "../hooks/useReports";
import type { ExportFormat, ReportEntityDefinition } from "../services/reports-api";

const FORMATS: { key: ExportFormat; label: string }[] = [
  { key: "csv", label: "CSV" },
  { key: "xlsx", label: "Excel (XLSX)" },
  { key: "json", label: "JSON" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  definition: ReportEntityDefinition | null;
  /** label pt-BR de uma coluna (vindo do backend). */
  labelOf: (column: string) => string;
}

export function ExportDialog({ open, onClose, definition, labelOf }: Props) {
  const [format, setFormat] = useState<ExportFormat>("xlsx");
  const [deselected, setDeselected] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sort, setSort] = useState("");
  const [order, setOrder] = useState<"ASC" | "DESC">("DESC");
  const exp = useReportExport();

  if (!definition) return null;
  const cols = definition.exportableColumns;
  const selected = cols.filter((c) => !deselected.has(c));

  function toggle(col: string) {
    setDeselected((prev) => {
      const next = new Set(prev);
      next.has(col) ? next.delete(col) : next.add(col);
      return next;
    });
  }

  function run() {
    exp.mutate(
      {
        entity: definition!.tableName,
        params: {
          format,
          columns: selected,
          filters,
          sort: sort || undefined,
          order,
          pageSize: 1000,
        },
      },
      {
        onSuccess: () => { toast.success("Exportação concluída."); onClose(); },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Falha na exportação."),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto" data-testid="export-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-4 w-4 text-primary" /> Exportar {definition.entityName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <p className="mb-1.5 text-xs font-medium">Formato</p>
            <div className="flex gap-1.5">
              {FORMATS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFormat(f.key)}
                  data-testid={`export-format-${f.key}`}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-xs",
                    format === f.key ? "border-primary bg-primary/10 font-medium text-primary" : "border-border text-muted-foreground",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {definition.filterableColumns.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-medium">Filtros</p>
              <div className="grid grid-cols-2 gap-2">
                {definition.filterableColumns.map((c) => (
                  <Input
                    key={c}
                    placeholder={labelOf(c)}
                    value={filters[c] ?? ""}
                    onChange={(e) => setFilters((p) => ({ ...p, [c]: e.target.value }))}
                    data-testid={`export-filter-${c}`}
                    className="h-8 text-xs"
                  />
                ))}
              </div>
            </div>
          )}

          {definition.sortableColumns.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-medium">Ordenar por</p>
              <div className="flex gap-2">
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  data-testid="export-sort"
                  className="h-8 flex-1 rounded-md border border-border bg-card px-2 text-xs"
                >
                  <option value="">—</option>
                  {definition.sortableColumns.map((c) => <option key={c} value={c}>{labelOf(c)}</option>)}
                </select>
                <select value={order} onChange={(e) => setOrder(e.target.value as "ASC" | "DESC")} className="h-8 rounded-md border border-border bg-card px-2 text-xs">
                  <option value="DESC">↓</option>
                  <option value="ASC">↑</option>
                </select>
              </div>
            </div>
          )}

          <div>
            <p className="mb-1.5 text-xs font-medium">Colunas ({selected.length}/{cols.length})</p>
            <div className="grid max-h-56 grid-cols-2 gap-2 overflow-y-auto rounded-lg border border-border p-3 sm:grid-cols-3">
              {cols.map((c) => (
                <label key={c} className="flex cursor-pointer items-center gap-2">
                  <Checkbox checked={!deselected.has(c)} onCheckedChange={() => toggle(c)} data-testid={`export-col-${c}`} />
                  <span className="truncate text-xs">{labelOf(c)}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={run} disabled={selected.length === 0 || exp.isPending} data-testid="export-run">
              {exp.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-1.5 h-3.5 w-3.5" />}
              Exportar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
