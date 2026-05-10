import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Upload, FileText, CheckCircle2, XCircle, AlertTriangle, RefreshCw, ChevronRight } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type { ImportFormat, ImportStatus, ImportError } from "../types";

const FORMAT_LABELS: Record<ImportFormat, string> = {
  csv:  "CSV",
  xlsx: "Excel (XLSX)",
  json: "JSON",
  xml:  "XML",
  ofx:  "OFX — Open Financial Exchange",
};

const MODULE_FORMATS: Partial<Record<string, ImportFormat[]>> = {
  Financeiro: ["ofx", "csv", "xlsx"],
};

const DEFAULT_FORMATS: ImportFormat[] = ["csv", "xlsx", "json", "xml"];

const MODULE_OPTIONS = ["Catálogo", "Artistas", "Contratos", "Financeiro", "Lançamentos", "Leads", "Marketing"];

type Step = "upload" | "preview" | "mapping" | "importing" | "done";

const STEPS: { key: Step; label: string }[] = [
  { key: "upload",    label: "Upload"     },
  { key: "preview",   label: "Preview"    },
  { key: "mapping",   label: "Mapeamento" },
  { key: "importing", label: "Importando" },
  { key: "done",      label: "Concluído"  },
];

const MOCK_PREVIEW_ROWS = [
  ["titulo", "compositor", "isrc", "genero", "cod_ecad"],
  ["Noite de Luz", "Vitória Lunar", "BRMSC2500001", "Samba", "ECAD-0001-VL"],
  ["Beira do Rio", "Grupo Raiz Nordestina", "BRMSC2500002", "Forró", "ECAD-0002-RN"],
  ["Amor de Interior", "Ana Beatriz Santos", "BRMSC2500003", "Sertanejo", ""],
];

interface ImportEngineProps {
  open: boolean;
  onClose: () => void;
  onImported?: (count: number) => void;
}

function StepIndicator({ current }: { current: Step }) {
  const idx = STEPS.findIndex(s => s.key === current);
  return (
    <div className="flex items-center gap-1 mb-6">
      {STEPS.map((s, i) => (
        <div key={s.key} className="flex items-center gap-1">
          <div className={cn(
            "flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold transition-colors",
            i < idx ? "bg-success text-success-foreground" :
            i === idx ? "bg-primary text-primary-foreground" :
            "bg-muted text-muted-foreground"
          )}>
            {i < idx ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
          </div>
          <span className={cn("text-[10px] font-medium hidden sm:inline", i === idx ? "text-foreground" : "text-muted-foreground")}>
            {s.label}
          </span>
          {i < STEPS.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground/40 mx-0.5" />}
        </div>
      ))}
    </div>
  );
}

export function ImportEngine({ open, onClose, onImported }: ImportEngineProps) {
  const [step, setStep] = useState<Step>("upload");
  const [format, setFormat] = useState<ImportFormat>("csv");
  const [module, setModule] = useState("Catálogo");

  const availableFormats = MODULE_FORMATS[module] ?? DEFAULT_FORMATS;

  function handleModuleChange(m: string) {
    setModule(m);
    const formats = MODULE_FORMATS[m] ?? DEFAULT_FORMATS;
    if (!formats.includes(format)) {
      setFormat(formats[0]);
    }
  }
  const [filename, setFilename] = useState("");
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState<ImportError[]>([]);
  const [importedCount, setImportedCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFilename(f.name);
    setStep("preview");
  }

  function handleDropZoneClick() {
    fileRef.current?.click();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    setFilename(f.name);
    setStep("preview");
  }

  function goMapping() { setStep("mapping"); }

  function startImport() {
    setStep("importing");
    setProgress(0);
    setErrors([]);
    let p = 0;
    const timer = setInterval(() => {
      p += Math.floor(Math.random() * 18) + 8;
      if (p >= 100) {
        p = 100;
        clearInterval(timer);
        const count = MOCK_PREVIEW_ROWS.length - 1;
        setImportedCount(count);
        setErrors([{ row: 3, field: "cod_ecad", message: "Campo vazio — obra importada sem código ECAD", value: "" }]);
        setProgress(100);
        setTimeout(() => setStep("done"), 500);
      }
      setProgress(p);
    }, 180);
  }

  function handleClose() {
    setStep("upload");
    setFilename("");
    setProgress(0);
    setErrors([]);
    onClose();
  }

  function handleFinish() {
    onImported?.(importedCount);
    handleClose();
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-primary" />
            Central de Importação
          </DialogTitle>
        </DialogHeader>

        <StepIndicator current={step} />

        {step === "upload" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium mb-1.5">Módulo destino</p>
                <Select value={module} onValueChange={handleModuleChange}>
                  <SelectTrigger className="h-9 text-sm" data-testid="import-module-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODULE_OPTIONS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-xs font-medium mb-1.5">Formato</p>
                <Select value={format} onValueChange={v => setFormat(v as ImportFormat)}>
                  <SelectTrigger className="h-9 text-sm" data-testid="import-format-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableFormats.map(k => (
                      <SelectItem key={k} value={k}>{FORMAT_LABELS[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div
              className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
              onClick={handleDropZoneClick}
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              data-testid="import-dropzone"
            >
              <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">Arraste o arquivo ou clique para selecionar</p>
              <p className="text-xs text-muted-foreground mt-1">Formatos suportados: CSV, XLSX, JSON, XML</p>
            </div>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.json,.xml" className="hidden" onChange={handleFileSelect} />
            <div className="flex justify-between gap-3">
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button onClick={() => { setFilename("demo_catalogo.csv"); setStep("preview"); }} data-testid="import-demo-btn">
                Usar arquivo demo
              </Button>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-card border border-border">
              <FileText className="h-4 w-4 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{filename}</p>
                <p className="text-xs text-muted-foreground">{module} · {FORMAT_LABELS[format]} · {MOCK_PREVIEW_ROWS.length - 1} registros</p>
              </div>
              <Badge className="ml-auto shrink-0 bg-success/15 text-success border-success/30 border">Válido</Badge>
            </div>
            <div>
              <p className="text-xs font-medium mb-2">Preview dos dados</p>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      {MOCK_PREVIEW_ROWS[0].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_PREVIEW_ROWS.slice(1).map((row, i) => (
                      <tr key={i} className="border-t border-border/50 hover:bg-muted/20">
                        {row.map((cell, j) => (
                          <td key={j} className={cn("px-3 py-2 font-mono", !cell && "text-muted-foreground italic")}>{cell || "—"}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex justify-between gap-3">
              <Button variant="outline" onClick={() => setStep("upload")}>Voltar</Button>
              <Button onClick={goMapping} data-testid="import-next-mapping">Próximo — Mapeamento</Button>
            </div>
          </div>
        )}

        {step === "mapping" && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">Confirme o mapeamento das colunas do arquivo para os campos do sistema.</p>
            <div className="space-y-2">
              {MOCK_PREVIEW_ROWS[0].map(col => (
                <div key={col} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
                  <span className="text-xs font-mono text-muted-foreground w-32 shrink-0">{col}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <Select defaultValue={col}>
                    <SelectTrigger className="h-8 text-xs flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MOCK_PREVIEW_ROWS[0].map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                      <SelectItem value="__ignore">— Ignorar coluna —</SelectItem>
                    </SelectContent>
                  </Select>
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                </div>
              ))}
            </div>
            <div className="flex justify-between gap-3">
              <Button variant="outline" onClick={() => setStep("preview")}>Voltar</Button>
              <Button onClick={startImport} data-testid="import-start-btn">Iniciar Importação</Button>
            </div>
          </div>
        )}

        {step === "importing" && (
          <div className="space-y-6 py-4">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 mx-auto mb-3 text-primary animate-spin" />
              <p className="text-sm font-medium">Importando {filename}...</p>
              <p className="text-xs text-muted-foreground mt-1">Módulo: {module}</p>
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
              <p className="text-base font-semibold">{importedCount} registros importados</p>
              <p className="text-xs text-muted-foreground">{module} · {filename}</p>
            </div>
            {errors.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium flex items-center gap-1.5 text-warning">
                  <AlertTriangle className="h-3.5 w-3.5" /> {errors.length} aviso{errors.length > 1 ? "s" : ""}
                </p>
                {errors.map((e, i) => (
                  <div key={i} className="flex items-start gap-2 p-2.5 rounded-md bg-warning/10 border border-warning/20">
                    <XCircle className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <span className="text-muted-foreground">Linha {e.row} · <code className="font-mono">{e.field}</code> — </span>
                      <span>{e.message}</span>
                      {e.value !== undefined && <span className="text-muted-foreground"> (valor: <code className="font-mono">{e.value || "vazio"}</code>)</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setStep("upload")}>Nova importação</Button>
              <Button onClick={handleFinish} data-testid="import-finish-btn">Concluir</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
