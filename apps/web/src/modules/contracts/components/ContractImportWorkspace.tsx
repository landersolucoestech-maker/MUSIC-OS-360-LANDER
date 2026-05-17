import { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Badge } from "@/shared/ui/badge";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { Textarea } from "@/shared/ui/textarea";
import {
  Upload, FileText, Loader2, Sparkles, Save, X, Check,
  Trash2, AlertCircle, RefreshCw, Plus, PencilLine,
  ChevronRight, ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import mammoth from "mammoth";
import type {
  SemanticVariable,
  SemanticParseResult,
  TemplateContratoInsert,
} from "@/modules/contracts/types/contracts.types";
import { parseContractText, applyVariablesToText } from "@/modules/contracts/services/semantic-parser.service";

interface ContractImportWorkspaceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: TemplateContratoInsert) => void;
}

type WorkspacePhase = "upload" | "analyzing" | "review";

function generateId(): string {
  return `sv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ── Variable Card ────────────────────────────────────────────────────────────

interface VariableCardProps {
  variable: SemanticVariable;
  index: number;
  onUpdate: (updates: Partial<SemanticVariable>) => void;
  onRemove: () => void;
}

function VariableCard({ variable, index, onUpdate, onRemove }: VariableCardProps) {
  const [editingPlaceholder, setEditingPlaceholder] = useState(false);
  const [draft, setDraft] = useState(variable.placeholder);

  const commitPlaceholder = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== variable.placeholder) {
      onUpdate({ placeholder: trimmed });
    }
    setEditingPlaceholder(false);
  };

  const isManual = variable.source === "manual";

  return (
    <div
      className={`rounded-lg border p-3 space-y-2 text-sm transition-colors ${
        variable.accepted
          ? "border-border bg-card"
          : "border-border/40 bg-muted/30 opacity-60"
      }`}
      data-testid={`variable-card-${index}`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {isManual ? (
            <span className="flex items-center gap-1 text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 shrink-0">
              <PencilLine className="h-2.5 w-2.5" />
              Manual
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] font-medium text-primary/70 bg-primary/5 border border-primary/15 rounded px-1.5 py-0.5 shrink-0">
              <Sparkles className="h-2.5 w-2.5" />
              IA
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onUpdate({ accepted: !variable.accepted })}
            className={`h-6 w-6 rounded flex items-center justify-center transition-colors ${
              variable.accepted
                ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200"
                : "bg-muted text-muted-foreground hover:bg-muted/80 border border-border"
            }`}
            title={variable.accepted ? "Aceite — clique para rejeitar" : "Rejeitado — clique para aceitar"}
            data-testid={`button-toggle-variable-${index}`}
          >
            <Check className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-border transition-colors"
            title="Remover variável"
            data-testid={`button-remove-variable-${index}`}
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Original text */}
      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Valor original</p>
        {isManual ? (
          <Input
            value={variable.originalText}
            onChange={(e) => {
              const v = e.target.value;
              const updates: Partial<SemanticVariable> = { originalText: v };
              if (!variable.placeholder && v.trim()) {
                const slug = v
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "")
                  .toUpperCase()
                  .replace(/[^A-Z0-9]+/g, "_")
                  .replace(/^_+|_+$/g, "");
                updates.placeholder = slug ? `{{CONTRATO.${slug}}}` : "";
              }
              onUpdate(updates);
            }}
            placeholder='"valor encontrado no contrato"'
            className="h-7 text-xs"
            data-testid={`input-original-text-${index}`}
          />
        ) : (
          <p className="font-mono text-xs bg-muted/50 rounded px-2 py-1 text-foreground/80 break-all">
            {variable.originalText}
          </p>
        )}
      </div>

      {/* Context */}
      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Contexto detectado</p>
        <p className="text-xs text-muted-foreground leading-snug">{variable.context || variable.inferredEntity}</p>
      </div>

      {/* Placeholder */}
      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Placeholder</p>
        {editingPlaceholder ? (
          <div className="flex gap-1">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitPlaceholder}
              onKeyDown={(e) => { if (e.key === "Enter") commitPlaceholder(); if (e.key === "Escape") { setDraft(variable.placeholder); setEditingPlaceholder(false); } }}
              className="h-7 text-xs font-mono"
              autoFocus
              data-testid={`input-placeholder-${index}`}
            />
            <button
              type="button"
              onClick={commitPlaceholder}
              className="h-7 w-7 rounded flex items-center justify-center bg-primary text-primary-foreground shrink-0"
            >
              <Check className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => { setDraft(variable.placeholder); setEditingPlaceholder(true); }}
            className="w-full text-left font-mono text-xs bg-primary/5 border border-primary/20 text-primary rounded px-2 py-1 hover:bg-primary/10 transition-colors break-all"
            data-testid={`button-edit-placeholder-${index}`}
          >
            {variable.placeholder || <span className="text-muted-foreground italic">clique para definir</span>}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Upload Zone ──────────────────────────────────────────────────────────────

interface UploadZoneProps {
  onText: (text: string, filename: string) => void;
  rawText: string;
  onRawTextChange: (t: string) => void;
}

function UploadZone({ onText, rawText, onRawTextChange }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "docx" || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const buf = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer: buf });
      onText(result.value, file.name);
    } else if (ext === "txt" || file.type === "text/plain") {
      const text = await file.text();
      onText(text, file.name);
    } else if (ext === "pdf" || file.type === "application/pdf") {
      toast.info("PDF detectado", { description: "Cole o texto do contrato na área abaixo — extração directa de PDF não está disponível neste ambiente." });
    } else {
      toast.error("Formato não suportado", { description: "Use .docx, .txt ou cole o texto directamente." });
    }
  }, [onText]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  }, [processFile]);

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={`rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 py-10 cursor-pointer transition-colors ${
          dragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/40 hover:bg-muted/30"
        }`}
        data-testid="drop-zone"
      >
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Upload className="h-6 w-6 text-primary" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium">Arraste o contrato ou clique para importar</p>
          <p className="text-xs text-muted-foreground mt-0.5">.DOCX · .TXT · ou cole o texto abaixo</p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".docx,.txt,.pdf"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Paste area */}
      <div className="flex-1 flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Ou cole o texto do contrato directamente:</Label>
        <Textarea
          value={rawText}
          onChange={(e) => onRawTextChange(e.target.value)}
          placeholder="Cole aqui o texto completo do contrato..."
          className="flex-1 resize-none font-mono text-xs min-h-[280px]"
          data-testid="textarea-contract-text"
        />
      </div>
    </div>
  );
}

// ── Document Viewer ──────────────────────────────────────────────────────────

interface DocumentViewerProps {
  text: string;
  variables: SemanticVariable[];
}

function DocumentViewer({ text, variables }: DocumentViewerProps) {
  const preview = applyVariablesToText(text, variables);

  const parts = preview.split(/(\{\{[^}]+\}\})/g);

  return (
    <div className="h-full font-mono text-xs leading-relaxed text-foreground/80 whitespace-pre-wrap break-words">
      {parts.map((part, i) => {
        if (/^\{\{[^}]+\}\}$/.test(part)) {
          return (
            <mark
              key={i}
              className="bg-primary/15 text-primary font-semibold rounded px-0.5 not-italic"
            >
              {part}
            </mark>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </div>
  );
}

// ── Main Workspace ───────────────────────────────────────────────────────────

export function ContractImportWorkspace({ open, onOpenChange, onSave }: ContractImportWorkspaceProps) {
  const [phase, setPhase] = useState<WorkspacePhase>("upload");
  const [rawText, setRawText] = useState("");
  const [fileName, setFileName] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [parseResult, setParseResult] = useState<SemanticParseResult | null>(null);
  const [variables, setVariables] = useState<SemanticVariable[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const variablesEndRef = useRef<HTMLDivElement>(null);

  const reset = () => {
    setPhase("upload");
    setRawText("");
    setFileName("");
    setTemplateName("");
    setParseResult(null);
    setVariables([]);
    setIsSaving(false);
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const handleFileText = (text: string, name: string) => {
    setRawText(text);
    setFileName(name);
    if (!templateName) {
      setTemplateName(name.replace(/\.[^.]+$/, ""));
    }
  };

  const handleAnalyze = async () => {
    const text = rawText.trim();
    if (!text) {
      toast.error("Nenhum texto para analisar", { description: "Importe um ficheiro ou cole o texto do contrato." });
      return;
    }

    setPhase("analyzing");
    try {
      const result = await parseContractText(text);
      setParseResult(result);
      setVariables(result.variables);
      setPhase("review");

      if (result.variables.length === 0) {
        toast.info("Análise concluída", { description: "Nenhuma variável detectada. Pode adicionar variáveis manualmente." });
      } else {
        toast.success(`${result.variables.length} variáveis detectadas`, {
          description: result.clauseTypes.length > 0
            ? `Cláusulas: ${result.clauseTypes.join(", ")}`
            : undefined,
        });
      }
    } catch (err) {
      setPhase("upload");
      toast.error("Erro na análise", {
        description: err instanceof Error ? err.message : "Tente novamente.",
      });
    }
  };

  const handleReanalyze = async () => {
    setPhase("analyzing");
    setVariables([]);
    setParseResult(null);
    try {
      const result = await parseContractText(rawText);
      setParseResult(result);
      setVariables(result.variables);
      setPhase("review");
      toast.success(`${result.variables.length} variáveis detectadas`);
    } catch (err) {
      setPhase("review");
      toast.error("Erro na análise", {
        description: err instanceof Error ? err.message : "Tente novamente.",
      });
    }
  };

  const handleUpdateVariable = (id: string, updates: Partial<SemanticVariable>) => {
    setVariables((prev) => prev.map((v) => (v.id === id ? { ...v, ...updates } : v)));
  };

  const handleRemoveVariable = (id: string) => {
    setVariables((prev) => prev.filter((v) => v.id !== id));
  };

  const handleAddManualVariable = () => {
    const newVar: SemanticVariable = {
      id: generateId(),
      originalText: "",
      context: "Variável criada manualmente",
      inferredEntity: "Dado dinâmico",
      placeholder: "",
      accepted: true,
      source: "manual",
    };
    setVariables((prev) => [...prev, newVar]);
    setTimeout(() => {
      variablesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 50);
  };

  const handleSave = () => {
    const name = templateName.trim();
    if (!name) {
      toast.error("Nome obrigatório", { description: "Dê um nome ao template antes de guardar." });
      return;
    }
    if (!rawText.trim()) {
      toast.error("Sem conteúdo", { description: "O template não tem texto." });
      return;
    }

    setIsSaving(true);

    const acceptedVars = variables.filter((v) => v.accepted && v.placeholder);
    const finalText = applyVariablesToText(rawText, variables);

    const manifest = {
      variables: acceptedVars,
      clauseTypes: parseResult?.clauseTypes ?? [],
      generatedAt: new Date().toISOString(),
    };

    const data: TemplateContratoInsert = {
      nome: name,
      tipo_servico: "semantico",
      conteudo: finalText,
      descricao: parseResult?.clauseTypes.length
        ? `Cláusulas: ${parseResult.clauseTypes.join(", ")}`
        : null,
      ativo: true,
      variables_manifest: JSON.stringify(manifest),
    };

    onSave(data);
    toast.success("Template guardado", { description: `"${name}" foi criado com ${acceptedVars.length} variáveis.` });
    handleClose();
    setIsSaving(false);
  };

  const acceptedCount = variables.filter((v) => v.accepted).length;
  const clauseTypes = parseResult?.clauseTypes ?? [];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-none w-screen h-screen m-0 p-0 rounded-none flex flex-col gap-0">

        {/* ── Header bar ────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-5 py-3 border-b bg-background shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="h-8 w-8 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            data-testid="button-close-workspace"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Contract Intelligence Engine</span>
          </div>

          <div className="flex-1 max-w-sm ml-4">
            <Input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Nome do template..."
              className="h-8 text-sm"
              data-testid="input-template-name"
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            {phase === "review" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReanalyze}
                disabled={phase === ("analyzing" as WorkspacePhase)}
                className="gap-1.5 h-8 text-xs"
                data-testid="button-reanalyze"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Reanalisar
              </Button>
            )}
            {phase !== "upload" && (
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving || phase === "analyzing"}
                className="gap-1.5 h-8 text-xs"
                data-testid="button-save-template"
              >
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Guardar Template
              </Button>
            )}
          </div>
        </div>

        {/* ── Body (3-pane) ──────────────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── LEFT / CENTER — Document zone ──────────────────────────── */}
          <div className="flex-1 flex flex-col overflow-hidden border-r">

            {/* Sub-header */}
            <div className="flex items-center justify-between gap-3 px-5 py-2.5 border-b bg-muted/30 shrink-0">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileText className="h-3.5 w-3.5" />
                {fileName ? (
                  <span className="font-medium text-foreground">{fileName}</span>
                ) : (
                  <span>Documento</span>
                )}
              </div>
              {phase === "upload" && rawText.trim() && (
                <Button
                  size="sm"
                  onClick={handleAnalyze}
                  className="gap-1.5 h-7 text-xs"
                  data-testid="button-analyze"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Analisar com IA
                </Button>
              )}
              {phase === "review" && (
                <button
                  type="button"
                  onClick={() => { setPhase("upload"); setParseResult(null); setVariables([]); }}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  <X className="h-3 w-3" />
                  Limpar análise
                </button>
              )}
            </div>

            <ScrollArea className="flex-1">
              <div className="p-5">
                {phase === "upload" ? (
                  <UploadZone
                    onText={handleFileText}
                    rawText={rawText}
                    onRawTextChange={setRawText}
                  />
                ) : phase === "analyzing" ? (
                  <div className="flex flex-col items-center justify-center gap-4 py-24">
                    <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                      <Sparkles className="h-7 w-7 text-primary animate-pulse" />
                    </div>
                    <div className="text-center space-y-1">
                      <p className="text-sm font-medium">A analisar semanticamente o documento</p>
                      <p className="text-xs text-muted-foreground">Identificando entidades, cláusulas e variáveis dinâmicas...</p>
                    </div>
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                ) : (
                  <DocumentViewer text={rawText} variables={variables} />
                )}
              </div>
            </ScrollArea>

            {/* Bottom: Analyze CTA (only in upload phase when text exists) */}
            {phase === "upload" && rawText.trim() && (
              <div className="shrink-0 border-t px-5 py-3 bg-background">
                <Button
                  onClick={handleAnalyze}
                  className="w-full gap-2"
                  data-testid="button-analyze-bottom"
                >
                  <Sparkles className="h-4 w-4" />
                  Analisar Contrato com IA
                </Button>
              </div>
            )}
          </div>

          {/* ── RIGHT — Variables panel ─────────────────────────────────── */}
          <div className="w-[400px] shrink-0 flex flex-col overflow-hidden bg-background">

            {/* Panel header */}
            <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold">Variáveis</span>
                {phase === "review" && variables.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                    {acceptedCount}/{variables.length}
                  </Badge>
                )}
              </div>
              {phase === "review" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddManualVariable}
                  className="h-6 text-[10px] px-2 gap-1"
                  data-testid="button-add-manual-variable"
                >
                  <Plus className="h-3 w-3" />
                  Adicionar
                </Button>
              )}
            </div>

            {/* Clause type chips */}
            {phase === "review" && clauseTypes.length > 0 && (
              <div className="px-4 py-2 border-b flex flex-wrap gap-1.5 shrink-0">
                {clauseTypes.map((ct) => (
                  <Badge key={ct} variant="outline" className="text-[10px] h-5">
                    {ct}
                  </Badge>
                ))}
              </div>
            )}

            {/* Variables list */}
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-2.5">
                {phase === "upload" && (
                  <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                      <ChevronRight className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Importe um contrato e clique em<br />
                      <strong className="text-foreground">Analisar com IA</strong> para detectar<br />
                      as variáveis automaticamente
                    </p>
                  </div>
                )}

                {phase === "analyzing" && (
                  <div className="flex flex-col items-center justify-center gap-3 py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <p className="text-xs text-muted-foreground text-center">
                      A IA está a identificar<br />todos os dados dinâmicos...
                    </p>
                  </div>
                )}

                {phase === "review" && variables.length === 0 && (
                  <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                    <AlertCircle className="h-8 w-8 text-muted-foreground/50" />
                    <p className="text-xs text-muted-foreground">
                      Nenhuma variável detectada.<br />
                      Adicione variáveis manualmente.
                    </p>
                  </div>
                )}

                {phase === "review" && variables.map((v, i) => (
                  <VariableCard
                    key={v.id}
                    variable={v}
                    index={i}
                    onUpdate={(updates) => handleUpdateVariable(v.id, updates)}
                    onRemove={() => handleRemoveVariable(v.id)}
                  />
                ))}

                <div ref={variablesEndRef} />
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
