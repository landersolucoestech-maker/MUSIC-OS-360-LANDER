import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Checkbox } from "@/shared/ui/checkbox";
import { Input } from "@/shared/ui/input";
import { Download, CheckCircle2, RefreshCw, FileText, Table2, FileJson, File } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type { ExportFormat } from "../types";

const FORMAT_CONFIG: Record<ExportFormat, { label: string; icon: React.ComponentType<{ className?: string }>; description: string }> = {
  csv:  { label: "CSV",         icon: Table2,    description: "Compatível com Excel, Google Sheets" },
  xlsx: { label: "Excel (XLSX)",icon: Table2,    description: "Planilha formatada com fórmulas" },
  pdf:  { label: "PDF",         icon: File,      description: "Relatório imprimível" },
  json: { label: "JSON",        icon: FileJson,  description: "Para integrações e APIs" },
};

const MODULE_COLUMNS: Record<string, { key: string; label: string }[]> = {
  "Catálogo": [
    { key: "titulo", label: "Título" },
    { key: "compositor", label: "Compositor" },
    { key: "isrc", label: "ISRC" },
    { key: "iswc", label: "ISWC" },
    { key: "genero", label: "Gênero" },
    { key: "cod_ecad", label: "Cód. ECAD" },
    { key: "cod_abramus", label: "Cód. ABRAMUS" },
    { key: "status", label: "Status" },
  ],
  "Artistas": [
    { key: "nome_artistico", label: "Nome Artístico" },
    { key: "nome_completo", label: "Nome Completo" },
    { key: "cpf", label: "CPF" },
    { key: "email", label: "E-mail" },
    { key: "genero_musical", label: "Gênero Musical" },
    { key: "status", label: "Status" },
  ],
  "Contratos": [
    { key: "numero", label: "Número" },
    { key: "artista", label: "Artista" },
    { key: "tipo", label: "Tipo" },
    { key: "vigencia_inicio", label: "Início Vigência" },
    { key: "vigencia_fim", label: "Fim Vigência" },
    { key: "status", label: "Status" },
    { key: "valor", label: "Valor" },
  ],
  "Financeiro": [
    { key: "data", label: "Data" },
    { key: "descricao", label: "Descrição" },
    { key: "categoria", label: "Categoria" },
    { key: "valor", label: "Valor" },
    { key: "tipo", label: "Tipo (Receita/Despesa)" },
    { key: "status", label: "Status" },
  ],
};
const MODULE_OPTIONS = Object.keys(MODULE_COLUMNS);

type Step = "config" | "exporting" | "done";

interface ExportEngineProps {
  open: boolean;
  onClose: () => void;
  defaultModule?: string;
}

export function ExportEngine({ open, onClose, defaultModule = "Catálogo" }: ExportEngineProps) {
  const [step, setStep] = useState<Step>("config");
  const [format, setFormat] = useState<ExportFormat>("xlsx");
  const [module, setModule] = useState(defaultModule);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedCols, setSelectedCols] = useState<Set<string>>(
    new Set(MODULE_COLUMNS[defaultModule]?.map(c => c.key) ?? [])
  );
  const [progress, setProgress] = useState(0);
  const [filename, setFilename] = useState("");

  function handleModuleChange(m: string) {
    setModule(m);
    setSelectedCols(new Set(MODULE_COLUMNS[m]?.map(c => c.key) ?? []));
  }

  function toggleCol(key: string) {
    setSelectedCols(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleAll() {
    const cols = MODULE_COLUMNS[module] ?? [];
    if (selectedCols.size === cols.length) setSelectedCols(new Set());
    else setSelectedCols(new Set(cols.map(c => c.key)));
  }

  function startExport() {
    setStep("exporting");
    setProgress(0);
    const ts = new Date().toISOString().slice(0, 10);
    setFilename(`${module.toLowerCase().replace(/\s/g, "_")}_${ts}.${format}`);
    let p = 0;
    const timer = setInterval(() => {
      p += Math.floor(Math.random() * 25) + 15;
      if (p >= 100) {
        p = 100;
        clearInterval(timer);
        setProgress(100);
        setTimeout(() => setStep("done"), 400);
      }
      setProgress(p);
    }, 150);
  }

  function triggerDownload() {
    const dummy = new Blob(["MUSIC OS 360 — Export\n(mock data)"], { type: "text/plain" });
    const url = URL.createObjectURL(dummy);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleClose() {
    setStep("config");
    setProgress(0);
    setFilename("");
    onClose();
  }

  const cols = MODULE_COLUMNS[module] ?? [];
  const allSelected = selectedCols.size === cols.length;

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-4 w-4 text-primary" />
            Central de Exportação
          </DialogTitle>
        </DialogHeader>

        {step === "config" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium mb-1.5">Módulo</p>
                <Select value={module} onValueChange={handleModuleChange}>
                  <SelectTrigger className="h-9 text-sm" data-testid="export-module-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODULE_OPTIONS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-xs font-medium mb-1.5">Formato</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {(Object.entries(FORMAT_CONFIG) as [ExportFormat, typeof FORMAT_CONFIG[ExportFormat]][]).map(([k, v]) => {
                    const Icon = v.icon;
                    return (
                      <button
                        key={k}
                        onClick={() => setFormat(k)}
                        className={cn(
                          "flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs border transition-colors",
                          format === k
                            ? "border-primary bg-primary/10 text-primary font-medium"
                            : "border-border bg-card text-muted-foreground hover:text-foreground"
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium mb-1.5">Período — De</p>
                <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9 text-xs" />
              </div>
              <div>
                <p className="text-xs font-medium mb-1.5">Período — Até</p>
                <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-9 text-xs" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium">Colunas a exportar</p>
                <button onClick={toggleAll} className="text-xs text-primary hover:underline">
                  {allSelected ? "Desmarcar todos" : "Selecionar todos"}
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 rounded-lg border border-border bg-card">
                {cols.map(c => (
                  <label key={c.key} className="flex items-center gap-2 cursor-pointer select-none">
                    <Checkbox
                      checked={selectedCols.has(c.key)}
                      onCheckedChange={() => toggleCol(c.key)}
                      data-testid={`export-col-${c.key}`}
                    />
                    <span className="text-xs">{c.label}</span>
                  </label>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{selectedCols.size} de {cols.length} colunas selecionadas</p>
            </div>

            <div className="flex justify-between gap-3">
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button onClick={startExport} disabled={selectedCols.size === 0} data-testid="export-start-btn">
                <Download className="h-3.5 w-3.5 mr-1.5" /> Exportar
              </Button>
            </div>
          </div>
        )}

        {step === "exporting" && (
          <div className="space-y-6 py-6">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 mx-auto mb-3 text-primary animate-spin" />
              <p className="text-sm font-medium">Gerando exportação...</p>
              <p className="text-xs text-muted-foreground mt-1">{module} · {FORMAT_CONFIG[format].label}</p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progresso</span>
                <span className="font-mono">{progress}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
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
                <span className="text-xs text-muted-foreground font-mono">{filename}</span>
              </div>
              <Badge className="bg-success/15 text-success border-success/30 border text-xs">{FORMAT_CONFIG[format].label}</Badge>
            </div>
            <div className="flex justify-between gap-3">
              <Button variant="outline" onClick={() => setStep("config")}>Nova exportação</Button>
              <Button onClick={triggerDownload} data-testid="export-download-btn">
                <Download className="h-3.5 w-3.5 mr-1.5" /> Baixar arquivo
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
