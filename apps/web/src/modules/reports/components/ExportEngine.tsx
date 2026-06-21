import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Checkbox } from "@/shared/ui/checkbox";
import { DatePickerField } from "@/shared/ui/date-picker-field";
import { Download, CheckCircle2, FileText, Table2, FileJson, File } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type { ExportFormat } from "../types";
import { useExportRegistry, deriveColumns, cellToString, exportFieldValue } from "./export-registry";

const FORMAT_CONFIG: Record<ExportFormat, { label: string; icon: React.ComponentType<{ className?: string }>; description: string }> = {
  csv:  { label: "CSV",          icon: Table2,   description: "Compatível com Excel, Google Sheets" },
  xlsx: { label: "Excel (XLSX)", icon: Table2,   description: "Planilha formatada" },
  pdf:  { label: "PDF",          icon: File,     description: "Relatório imprimível" },
  json: { label: "JSON",         icon: FileJson, description: "Estrutura completa para integrações" },
};

const DATE_KEYS = ["created_at", "data", "date", "data_emissao", "vigencia_inicio", "publishDate", "publish_date"];

type Step = "config" | "done";

interface ExportEngineProps {
  open: boolean;
  onClose: () => void;
  defaultModule?: string;
}

export function ExportEngine({ open, onClose, defaultModule }: ExportEngineProps) {
  const registry = useExportRegistry();
  const [step, setStep] = useState<Step>("config");
  const [format, setFormat] = useState<ExportFormat>("xlsx");
  const [module, setModule] = useState<string>(defaultModule ?? "");

  // Abre apontando para o módulo selecionado na tela (sincroniza ao reabrir).
  useEffect(() => {
    if (open && defaultModule) setModule(defaultModule);
  }, [open, defaultModule]);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [deselected, setDeselected] = useState<Set<string>>(new Set());
  const [filename, setFilename] = useState("");

  // Módulo atual (fallback para o primeiro elegível).
  const current = useMemo(
    () => registry.find((m) => m.key === module) ?? registry[0],
    [registry, module],
  );
  const activeKey = current?.key ?? "";

  // Colunas derivadas DINAMICAMENTE dos registros reais — sem lista fixa.
  const columns = useMemo(() => deriveColumns(current?.records ?? []), [current]);
  const dateKey = useMemo(() => columns.find((c) => DATE_KEYS.includes(c.key))?.key ?? null, [columns]);

  // Ao trocar de módulo, todas as colunas voltam a ficar selecionadas.
  useEffect(() => {
    setDeselected(new Set());
  }, [activeKey]);

  const selectedCount = columns.length - columns.filter((c) => deselected.has(c.key)).length;
  const allSelected = selectedCount === columns.length && columns.length > 0;

  function toggleCol(key: string) {
    setDeselected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleAll() {
    setDeselected((prev) => (prev.size === columns.length ? new Set() : new Set(columns.map((c) => c.key))));
  }

  const filteredRecords = useMemo(() => {
    const records = current?.records ?? [];
    if (!dateKey || (!dateFrom && !dateTo)) return records;
    return records.filter((r) => {
      const raw = r[dateKey];
      if (raw == null) return true;
      const d = String(raw).slice(0, 10);
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      return true;
    });
  }, [current, dateKey, dateFrom, dateTo]);

  function downloadBlob(content: BlobPart, type: string, name: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function triggerDownload(name: string) {
    const exportCols = columns.filter((c) => !deselected.has(c.key));
    const keys = exportCols.map((c) => c.key);
    // Cabeçalho = rótulo pt-BR (sem campos internos); round-trip via keyForHeader.
    const header = exportCols.map((c) => c.label);
    const data = filteredRecords;
    const body = data.map((item) => keys.map((k) => cellToString(exportFieldValue(k, item[k]))));

    if (format === "json") {
      const json = data.map((item) =>
        Object.fromEntries(exportCols.map((c) => [c.label, exportFieldValue(c.key, item[c.key]) ?? null])),
      );
      downloadBlob(JSON.stringify(json, null, 2), "application/json", name);
    } else if (format === "csv") {
      const ws = XLSX.utils.aoa_to_sheet([header, ...body]);
      downloadBlob("﻿" + XLSX.utils.sheet_to_csv(ws), "text/csv;charset=utf-8", name);
    } else if (format === "pdf") {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF({ orientation: header.length > 6 ? "landscape" : "portrait" });
      doc.text(`MUSIC OS 360 — ${activeKey}`, 14, 16);
      autoTable(doc, { head: [header], body, startY: 22, styles: { fontSize: 7 } });
      doc.save(name);
    } else {
      const ws = XLSX.utils.aoa_to_sheet([header, ...body]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, activeKey.slice(0, 31) || "Export");
      XLSX.writeFile(wb, name);
    }
  }

  async function startExport() {
    if (!current) return;
    const ts = new Date().toISOString().slice(0, 10);
    const name = `${activeKey.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_${ts}.${format}`;
    setFilename(name);
    await triggerDownload(name);
    setStep("done");
  }

  function handleClose() {
    setStep("config");
    setFilename("");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-4 w-4 text-primary" />
            Exportação de Dados
          </DialogTitle>
        </DialogHeader>

        {step === "config" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="mb-1.5 text-xs font-medium">Módulo</p>
                <Select value={activeKey} onValueChange={setModule}>
                  <SelectTrigger className="h-9 text-sm" data-testid="export-module-select">
                    <SelectValue placeholder="Selecione o módulo" />
                  </SelectTrigger>
                  <SelectContent>
                    {registry.map((m) => (
                      <SelectItem key={m.key} value={m.key}>{m.key}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium">Formato</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {(Object.entries(FORMAT_CONFIG) as [ExportFormat, typeof FORMAT_CONFIG[ExportFormat]][]).map(([k, v]) => {
                    const Icon = v.icon;
                    return (
                      <button
                        key={k}
                        onClick={() => setFormat(k)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs transition-colors",
                          format === k ? "border-primary bg-primary/10 font-medium text-primary" : "border-border bg-card text-muted-foreground hover:text-foreground",
                        )}
                        data-testid={`export-format-${k}`}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        {v.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {dateKey && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="mb-1.5 text-xs font-medium">Período — De</p>
                  <DatePickerField value={dateFrom} onChange={setDateFrom} className="h-9 text-xs" />
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-medium">Período — Até</p>
                  <DatePickerField value={dateTo} onChange={setDateTo} className="h-9 text-xs" />
                </div>
              </div>
            )}

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-medium">Colunas a exportar ({columns.length} disponíveis)</p>
                {columns.length > 0 && (
                  <button onClick={toggleAll} className="text-xs text-primary hover:underline">
                    {allSelected ? "Desmarcar todas" : "Selecionar todas"}
                  </button>
                )}
              </div>
              {columns.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border bg-card p-4 text-center text-xs text-muted-foreground">
                  Este módulo não possui registros para derivar as colunas.
                </p>
              ) : (
                <div className="grid max-h-56 grid-cols-2 gap-2 overflow-y-auto rounded-lg border border-border bg-card p-3 sm:grid-cols-3">
                  {columns.map((c) => (
                    <label key={c.key} className="flex cursor-pointer select-none items-center gap-2">
                      <Checkbox
                        checked={!deselected.has(c.key)}
                        onCheckedChange={() => toggleCol(c.key)}
                        data-testid={`export-col-${c.key}`}
                      />
                      <span className="truncate text-xs" title={c.key}>{c.label}</span>
                    </label>
                  ))}
                </div>
              )}
              <p className="mt-1 text-[10px] text-muted-foreground">
                {selectedCount} de {columns.length} colunas • {filteredRecords.length} registro(s)
              </p>
            </div>

            <div className="flex justify-between gap-3">
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button onClick={startExport} disabled={selectedCount === 0 || !current} data-testid="export-start-btn">
                <Download className="mr-1.5 h-3.5 w-3.5" /> Exportar
              </Button>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-2 py-4">
              <CheckCircle2 className="h-10 w-10 text-success" />
              <p className="text-base font-semibold">Exportação concluída</p>
              <div className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-sans text-xs text-muted-foreground">{filename}</span>
              </div>
              <Badge variant="success">{FORMAT_CONFIG[format].label}</Badge>
            </div>
            <div className="flex justify-between gap-3">
              <Button variant="outline" onClick={() => setStep("config")}>Nova exportação</Button>
              <Button onClick={() => triggerDownload(filename)} data-testid="export-download-btn">
                <Download className="mr-1.5 h-3.5 w-3.5" /> Baixar novamente
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
