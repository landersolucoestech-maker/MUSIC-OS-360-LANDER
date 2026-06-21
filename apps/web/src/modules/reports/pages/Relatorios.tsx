/**
 * modules/reports/pages/Relatorios.tsx  ·  FASE 2.5
 *
 * Central de Relatórios — consome EXCLUSIVAMENTE a API (GET /reports/entities,
 * GET /reports/definitions). Sem lista fixa, sem mock, sem registry/contrato/
 * label no frontend. O backend é a única fonte da verdade.
 */
import { useMemo, useState } from "react";
import { MainLayout } from "@/shared/components/MainLayout";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Upload, Download, AlertTriangle, Loader2, Database } from "lucide-react";
import { useReportEntities, useReportDefinitions } from "../hooks/useReports";
import { ExportDialog } from "../components/ExportDialog";
import { ImportDialog } from "../components/ImportDialog";
import type { ReportEntityDefinition } from "../services/reports-api";

export default function Relatorios() {
  const entitiesQ = useReportEntities();
  const definitionsQ = useReportDefinitions();
  const [selected, setSelected] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const defByTable = useMemo(() => {
    const m = new Map<string, ReportEntityDefinition>();
    for (const d of definitionsQ.data ?? []) m.set(d.tableName, d);
    return m;
  }, [definitionsQ.data]);

  const reportable = useMemo(
    () => (entitiesQ.data?.entities ?? []).filter((e) => e.reportable),
    [entitiesQ.data],
  );

  const selectedDef = selected ? defByTable.get(selected) ?? null : null;
  const labelOf = useMemo(() => {
    const ent = entitiesQ.data?.entities.find((e) => e.tableName === selected);
    const map = new Map(ent?.columns.map((c) => [c.name, c.label]) ?? []);
    return (col: string) => map.get(col) ?? col;
  }, [entitiesQ.data, selected]);

  const loading = entitiesQ.isLoading || definitionsQ.isLoading;
  const error = entitiesQ.isError || definitionsQ.isError;

  return (
    <MainLayout title="Relatórios" description="Exportação e importação por entidade — dirigido pelo backend">
      <div className="space-y-6">
        {loading && (
          <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground" data-testid="reports-loading">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando entidades…
          </div>
        )}

        {error && !loading && (
          <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4" data-testid="reports-error">
            <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
            <p className="text-sm text-destructive">Não foi possível carregar as entidades da API.</p>
          </div>
        )}

        {!loading && !error && reportable.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground" data-testid="reports-empty">
            Nenhuma entidade reportável disponível.
          </div>
        )}

        {!loading && !error && reportable.length > 0 && (
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="divide-y divide-border/50">
              {reportable.map((e) => {
                const def = defByTable.get(e.tableName);
                return (
                  <div key={e.tableName} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/20" data-testid={`entity-row-${e.tableName}`}>
                    <div className="p-1.5 rounded-md bg-muted shrink-0">
                      <Database className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground">{e.tableName}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {e.category}
                        {e.risks.length > 0 && <span className="ml-2 text-warning">· {e.risks.join(", ")}</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="sm" variant="outline" className="h-7 text-xs gap-1"
                        disabled={!def?.supportsImport}
                        onClick={() => { setSelected(e.tableName); setImportOpen(true); }}
                        data-testid={`btn-import-${e.tableName}`}
                      >
                        <Upload className="h-3 w-3" /> Importar
                      </Button>
                      <Button
                        size="sm" variant="outline" className="h-7 text-xs gap-1"
                        disabled={!def?.supportsExport}
                        onClick={() => { setSelected(e.tableName); setExportOpen(true); }}
                        data-testid={`btn-export-${e.tableName}`}
                      >
                        <Download className="h-3 w-3" /> Exportar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} definition={selectedDef} labelOf={labelOf} />
      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} definition={selectedDef} />
    </MainLayout>
  );
}
