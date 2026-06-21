import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { ListSectionHeader } from "@/shared/components/ListSectionHeader";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { Upload, FileText, CheckCircle2, XCircle, AlertTriangle, RefreshCw, ChevronRight } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { toast } from "sonner";
import { parseCSV } from "@/shared/lib/csv";
import type { ImportFormat, ImportError } from "../types";
import { useExportRegistry, deriveColumns, fieldLabel, resolveImportKey, importFieldValue, isInternalField } from "./export-registry";

const FORMAT_LABELS: Record<string, string> = {
  csv: "CSV",
  xlsx: "Excel (XLSX)",
  json: "JSON",
};

const IGNORE = "__ignore";

type Step = "upload" | "preview" | "mapping" | "importing" | "done";

const STEPS: { key: Step; label: string }[] = [
  { key: "upload", label: "Upload" },
  { key: "preview", label: "Preview" },
  { key: "mapping", label: "Mapeamento" },
  { key: "importing", label: "Importando" },
  { key: "done", label: "Concluído" },
];

interface ImportEngineProps {
  open: boolean;
  onClose: () => void;
  onImported?: (count: number) => void;
  /** Módulo selecionado na tela — o modal abre já apontando para ele. */
  defaultModule?: string;
}

function StepIndicator({ current }: { current: Step }) {
  const idx = STEPS.findIndex((s) => s.key === current);
  return (
    <div className="mb-6 flex items-center gap-1">
      {STEPS.map((s, i) => (
        <div key={s.key} className="flex items-center gap-1">
          <div
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition-colors",
              i < idx ? "bg-success text-success-foreground" : i === idx ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
            )}
          >
            {i < idx ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
          </div>
          <span className={cn("hidden text-[10px] font-medium sm:inline", i === idx ? "text-foreground" : "text-muted-foreground")}>{s.label}</span>
          {i < STEPS.length - 1 && <ChevronRight className="mx-0.5 h-3 w-3 text-muted-foreground/40" />}
        </div>
      ))}
    </div>
  );
}

function coerce(value: string): unknown {
  if (value === "") return "";
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}

export function ImportEngine({ open, onClose, onImported, defaultModule }: ImportEngineProps) {
  const registry = useExportRegistry();
  const [step, setStep] = useState<Step>("upload");
  const [format, setFormat] = useState<ImportFormat>("csv");
  const [module, setModule] = useState<string>(defaultModule ?? "");

  // Abre apontando para o módulo selecionado na tela (sincroniza ao reabrir).
  useEffect(() => {
    if (open && defaultModule) setModule(defaultModule);
  }, [open, defaultModule]);

  const current = useMemo(() => registry.find((m) => m.key === module) ?? registry[0], [registry, module]);
  const activeKey = current?.key ?? "";
  const moduleFields = useMemo(() => deriveColumns(current?.records ?? []).map((c) => c.key), [current]);

  const [filename, setFilename] = useState("");
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState<ImportError[]>([]);
  const [importedCount, setImportedCount] = useState(0);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  // Mapeamento padrão: rótulo pt-BR do arquivo → chave do campo do MÓDULO destino
  // (round-trip). "Observações" → observacoes/notes conforme o módulo.
  useEffect(() => {
    setMapping(Object.fromEntries(headers.map((h) => [h, resolveImportKey(h, moduleFields)])));
  }, [headers, activeKey, moduleFields]);

  async function ingest(file: File) {
    setFilename(file.name);
    try {
      let parsed: Record<string, string>[];
      if (/\.json$/i.test(file.name)) {
        const json = JSON.parse(await file.text());
        parsed = (Array.isArray(json) ? json : [json]).map((o: Record<string, unknown>) => {
          const obj: Record<string, string> = {};
          for (const [k, v] of Object.entries(o)) obj[k] = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
          return obj;
        });
      } else {
        parsed = await parseCSV(file);
      }
      if (parsed.length === 0) {
        toast.error("Arquivo sem registros.");
        return;
      }
      // Cabeçalhos = união das chaves de todas as linhas.
      const headerSet = new Set<string>();
      parsed.forEach((r) => Object.keys(r).forEach((k) => headerSet.add(k)));
      setRows(parsed);
      setHeaders(Array.from(headerSet));
      setStep("preview");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível ler o arquivo.");
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) void ingest(f);
  }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) void ingest(f);
  }

  function buildRecord(row: Record<string, string>): Record<string, unknown> {
    const rec: Record<string, unknown> = {};
    for (const h of headers) {
      const target = mapping[h] ?? resolveImportKey(h, moduleFields);
      // Ignora colunas marcadas e identificadores internos do sistema.
      if (target === IGNORE || isInternalField(target)) continue;
      rec[target] = importFieldValue(target, coerce(row[h] ?? ""));
    }
    return rec;
  }

  async function startImport() {
    if (!current?.create) {
      toast.error("Importação não disponível para este módulo.");
      return;
    }
    setStep("importing");
    setProgress(0);
    const errs: ImportError[] = [];
    let ok = 0;
    for (let i = 0; i < rows.length; i++) {
      const rec = buildRecord(rows[i]);
      const hasData = Object.values(rec).some((v) => v !== "" && v != null);
      if (!hasData) {
        errs.push({ row: i + 2, field: "(linha)", message: "Linha vazia — ignorada", value: "" });
      } else {
        try {
          await current.create(rec);
          ok++;
        } catch (e) {
          errs.push({ row: i + 2, field: "(persistência)", message: e instanceof Error ? e.message : "Falha ao importar", value: "" });
        }
      }
      setProgress(Math.round(((i + 1) / rows.length) * 100));
    }
    setImportedCount(ok);
    setErrors(errs.slice(0, 50));
    setStep("done");
  }

  function reset() {
    setStep("upload");
    setFilename("");
    setProgress(0);
    setErrors([]);
    setImportedCount(0);
    setRows([]);
    setHeaders([]);
    setMapping({});
  }

  function handleClose() {
    reset();
    onClose();
  }
  function handleFinish() {
    onImported?.(importedCount);
    handleClose();
  }

  const unmappedKnown = useMemo(
    () => headers.filter((h) => mapping[h] && mapping[h] !== IGNORE && !moduleFields.includes(mapping[h])),
    [headers, mapping, moduleFields],
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-primary" />
            Importação de Dados
          </DialogTitle>
        </DialogHeader>

        <StepIndicator current={step} />

        {step === "upload" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="mb-1.5 text-xs font-medium">Módulo destino</p>
                <Select value={activeKey} onValueChange={setModule}>
                  <SelectTrigger className="h-9 text-sm" data-testid="import-module-select">
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
                <Select value={format} onValueChange={(v) => setFormat(v as ImportFormat)}>
                  <SelectTrigger className="h-9 text-sm" data-testid="import-format-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["csv", "xlsx", "json"] as ImportFormat[]).map((k) => (
                      <SelectItem key={k} value={k}>{FORMAT_LABELS[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {current && !current.create && (
              <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Este módulo é somente leitura (exportação). Importação ainda não disponível.
              </div>
            )}

            <div
              className="cursor-pointer rounded-xl border-2 border-dashed border-border p-10 text-center transition-colors hover:border-primary/50 hover:bg-primary/5"
              onClick={() => fileRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              data-testid="import-dropzone"
            >
              <Upload className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">Arraste o arquivo ou clique para selecionar</p>
              <p className="mt-1 text-xs text-muted-foreground">Formatos suportados: CSV, XLSX, JSON</p>
            </div>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.json" className="hidden" onChange={handleFileSelect} />

            {moduleFields.length > 0 && (
              <div className="rounded-lg border border-border bg-card p-3">
                <p className="text-xs font-medium">Campos do módulo ({moduleFields.length})</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {moduleFields.slice(0, 24).map((f) => (
                    <Badge key={f} variant="neutral" className="text-[10px]">{fieldLabel(f)}</Badge>
                  ))}
                  {moduleFields.length > 24 && <span className="text-[10px] text-muted-foreground">+{moduleFields.length - 24}</span>}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-3">
              <FileText className="h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{filename}</p>
                <p className="text-xs text-muted-foreground">{activeKey} · {headers.length} colunas · {rows.length} registros</p>
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium">Pré-visualização (5 primeiras linhas)</p>
              <div className="overflow-x-auto rounded-lg border border-border">
                <ListSectionHeader
                  title="Pré-visualização da Importação"
                  count={rows.length}
                  description="Confira as primeiras linhas e colunas detectadas antes do mapeamento"
                  className="px-4 pt-4"
                />
                <Table>
                  <TableHeader>
                    <TableRow>
                      {headers.map((h) => <TableHead key={h} className="text-xs font-medium">{h}</TableHead>)}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.slice(0, 5).map((row, i) => (
                      <TableRow key={i}>
                        {headers.map((h, j) => (
                          <TableCell key={j} className={cn("py-2 font-sans text-xs", !row[h] && "italic text-muted-foreground")}>{row[h] || "—"}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
            <div className="flex justify-between gap-3">
              <Button variant="outline" onClick={() => setStep("upload")}>Voltar</Button>
              <Button onClick={() => setStep("mapping")} data-testid="import-next-mapping">Próximo — Mapeamento</Button>
            </div>
          </div>
        )}

        {step === "mapping" && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Confirme o destino de cada coluna do arquivo. Por padrão, cada coluna é mapeada para o campo de mesmo nome.
            </p>
            {unmappedKnown.length > 0 && (
              <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-warning" />
                Colunas marcadas em destino que não constam nos registros atuais serão criadas como campos novos.
              </p>
            )}
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {headers.map((col) => (
                <div key={col} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                  <span className="w-32 shrink-0 truncate font-sans text-xs text-muted-foreground" title={col}>{col}</span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <Select value={mapping[col] ?? col} onValueChange={(v) => setMapping((m) => ({ ...m, [col]: v }))}>
                    <SelectTrigger className="h-8 flex-1 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {!moduleFields.includes(col) && <SelectItem value={col}>{fieldLabel(col)} (manter)</SelectItem>}
                      {moduleFields.map((f) => <SelectItem key={f} value={f}>{fieldLabel(f)}</SelectItem>)}
                      <SelectItem value={IGNORE}>— Ignorar coluna —</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div className="flex justify-between gap-3">
              <Button variant="outline" onClick={() => setStep("preview")}>Voltar</Button>
              <Button onClick={startImport} disabled={!current?.create} data-testid="import-start-btn">Iniciar Importação</Button>
            </div>
          </div>
        )}

        {step === "importing" && (
          <div className="space-y-6 py-4">
            <div className="text-center">
              <RefreshCw className="mx-auto mb-3 h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Importando {filename}...</p>
              <p className="mt-1 text-xs text-muted-foreground">Módulo: {activeKey}</p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progresso</span>
                <span className="font-sans">{progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all duration-200" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-2 py-4">
              <CheckCircle2 className="h-10 w-10 text-success" />
              <p className="text-base font-semibold">{importedCount} registro(s) importado(s)</p>
              <p className="text-xs text-muted-foreground">{activeKey} · {filename}</p>
            </div>
            {errors.length > 0 && (
              <div className="space-y-2">
                <p className="flex items-center gap-1.5 text-xs font-medium text-warning">
                  <AlertTriangle className="h-3.5 w-3.5" /> {errors.length} ocorrência(s)
                </p>
                <div className="max-h-48 space-y-2 overflow-y-auto">
                  {errors.map((e, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-md border border-warning/20 bg-warning/10 p-2.5">
                      <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
                      <div className="text-xs">
                        <span className="text-muted-foreground">Linha {e.row} · <code className="font-sans">{e.field}</code> — </span>
                        <span>{e.message}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={reset}>Nova importação</Button>
              <Button onClick={handleFinish} data-testid="import-finish-btn">Concluir</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
