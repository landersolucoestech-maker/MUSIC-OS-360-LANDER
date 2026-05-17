import { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Badge } from "@/shared/ui/badge";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { Textarea } from "@/shared/ui/textarea";
import { Separator } from "@/shared/ui/separator";
import {
  Upload, FileText, Loader2, Sparkles, Save, X, Check,
  Edit2, Trash2, AlertCircle, ChevronRight, FileSearch,
} from "lucide-react";
import { toast } from "sonner";
import mammoth from "mammoth";
import type {
  SemanticVariable,
  SemanticParseResult,
  SemanticClauseType,
  SemanticTemplateManifest,
  TemplateContratoInsert,
} from "@/modules/contracts/types/contracts.types";
import { parseContractText, applyVariablesToText } from "@/modules/contracts/services/semantic-parser.service";

const CLAUSE_TYPE_LABELS: Record<SemanticClauseType, string> = {
  financeira: "Financeira",
  autoral: "Autoral",
  royalties: "Royalties",
  exclusividade: "Exclusividade",
  confidencialidade: "Confidencialidade",
  inadimplencia: "Inadimplência",
  distribuicao_digital: "Distribuição Digital",
  licenciamento: "Licenciamento",
  rescisao: "Rescisão",
  assinatura: "Assinatura",
  prazo: "Prazo",
  objeto: "Objeto",
};

const CLAUSE_TYPE_COLORS: Record<SemanticClauseType, string> = {
  financeira: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  autoral: "bg-purple-500/10 text-purple-700 border-purple-500/20",
  royalties: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  exclusividade: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  confidencialidade: "bg-slate-500/10 text-slate-700 border-slate-500/20",
  inadimplencia: "bg-red-500/10 text-red-700 border-red-500/20",
  distribuicao_digital: "bg-cyan-500/10 text-cyan-700 border-cyan-500/20",
  licenciamento: "bg-indigo-500/10 text-indigo-700 border-indigo-500/20",
  rescisao: "bg-orange-500/10 text-orange-700 border-orange-500/20",
  assinatura: "bg-teal-500/10 text-teal-700 border-teal-500/20",
  prazo: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  objeto: "bg-sky-500/10 text-sky-700 border-sky-500/20",
};

interface ContractImportWorkspaceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: TemplateContratoInsert) => void;
}

type Step = "import" | "analyzing" | "review" | "naming";

function highlightVariablesInText(
  text: string,
  variables: SemanticVariable[],
  activeId: string | null,
) {
  if (!text || variables.length === 0)
    return <span className="whitespace-pre-wrap text-sm leading-relaxed">{text}</span>;

  const accepted = variables.filter((v) => v.accepted);
  if (accepted.length === 0)
    return <span className="whitespace-pre-wrap text-sm leading-relaxed">{text}</span>;

  const sorted = [...accepted].sort((a, b) => b.originalText.length - a.originalText.length);
  const pattern = sorted
    .map((v) => v.originalText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const regex = new RegExp(`(${pattern})`, "g");
  const parts = text.split(regex);

  return (
    <span className="whitespace-pre-wrap text-sm leading-relaxed">
      {parts.map((part, i) => {
        const match = accepted.find((v) => v.originalText === part);
        if (!match) return <span key={i}>{part}</span>;
        const isActive = match.id === activeId;
        return (
          <mark
            key={i}
            id={`highlight-${match.id}`}
            className={`rounded px-0.5 transition-colors ${
              isActive
                ? "bg-primary/30 text-primary outline outline-1 outline-primary"
                : "bg-primary/10 text-primary cursor-pointer hover:bg-primary/20"
            }`}
            title={match.placeholder}
          >
            {part}
          </mark>
        );
      })}
    </span>
  );
}

function highlightPlaceholdersInText(text: string) {
  if (!text) return <span className="whitespace-pre-wrap text-sm leading-relaxed" />;
  const parts = text.split(/(\{\{[A-Z_]+(?:\.[A-Z_]+)?\}\})/g);
  return (
    <span className="whitespace-pre-wrap text-sm leading-relaxed font-serif">
      {parts.map((part, i) => {
        if (/^\{\{[A-Z_]+(?:\.[A-Z_]+)?\}\}$/.test(part)) {
          return (
            <mark
              key={i}
              className="bg-yellow-200/60 dark:bg-yellow-900/40 px-0.5 rounded font-mono text-xs text-foreground"
              title={part}
            >
              {part}
            </mark>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

function EditableField({
  label,
  value,
  onChange,
  mono,
  validate,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  mono?: boolean;
  validate?: (v: string) => boolean;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && (!validate || validate(trimmed))) {
      onChange(trimmed);
    } else {
      setDraft(value);
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="space-y-0.5">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</span>
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") { setDraft(value); setEditing(false); }
          }}
          className={`h-6 text-[10px] px-1.5 py-0 ${mono ? "font-mono" : ""}`}
          placeholder={placeholder}
          autoFocus
        />
      </div>
    );
  }

  return (
    <div
      className="group/field space-y-0.5 cursor-pointer"
      onClick={() => { setDraft(value); setEditing(true); }}
      title={`Clique para editar ${label.toLowerCase()}`}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</span>
        <Edit2 className="h-2.5 w-2.5 text-muted-foreground opacity-0 group-hover/field:opacity-100 transition-opacity" />
      </div>
      <p className={`text-[10px] leading-snug ${mono ? "font-mono text-primary bg-primary/5 rounded px-1.5 py-0.5 truncate" : "text-foreground line-clamp-2"}`}>
        {value}
      </p>
    </div>
  );
}

function VariableCard({
  variable,
  isActive,
  onActivate,
  onToggleAccept,
  onRemove,
  onUpdate,
}: {
  variable: SemanticVariable;
  isActive: boolean;
  onActivate: () => void;
  onToggleAccept: () => void;
  onRemove: () => void;
  onUpdate: (updates: Partial<SemanticVariable>) => void;
}) {
  const validatePlaceholder = (v: string) => /^\{\{[A-Z_]+\.[A-Z_]+\}\}$/.test(v);

  return (
    <div
      className={`rounded-lg border p-3 space-y-2.5 transition-colors cursor-pointer ${
        isActive
          ? "border-primary/50 bg-primary/5"
          : variable.accepted
          ? "border-border bg-card hover:border-primary/30"
          : "border-border bg-muted/30 opacity-60"
      }`}
      onClick={onActivate}
      data-testid={`variable-card-${variable.id}`}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <ChevronRight
            className={`h-3 w-3 shrink-0 transition-transform ${
              isActive ? "text-primary rotate-90" : "text-muted-foreground"
            }`}
          />
          <span className="text-[10px] text-muted-foreground font-medium truncate">
            Variável detectada
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={onToggleAccept}
            className={`h-5 w-5 rounded flex items-center justify-center transition-colors ${
              variable.accepted
                ? "bg-primary/10 text-primary hover:bg-primary/20"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
            title={variable.accepted ? "Remover da substituição" : "Incluir na substituição"}
            data-testid={`toggle-variable-${variable.id}`}
          >
            <Check className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Remover variável"
            data-testid={`remove-variable-${variable.id}`}
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      <Separator />

      {/* Editable fields */}
      <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
        <EditableField
          label="Texto original"
          value={variable.originalText}
          onChange={(v) => onUpdate({ originalText: v })}
          placeholder={`"valor encontrado no contrato"`}
        />
        <EditableField
          label="Tipo de dado"
          value={variable.inferredEntity}
          onChange={(v) => onUpdate({ inferredEntity: v })}
          placeholder="Ex: Valor monetário — Pagamento"
        />
        <EditableField
          label="Contexto jurídico"
          value={variable.context}
          onChange={(v) => onUpdate({ context: v })}
          placeholder="Descreva o contexto desta variável..."
        />
        <EditableField
          label="Placeholder"
          value={variable.placeholder}
          onChange={(v) => onUpdate({ placeholder: v })}
          validate={validatePlaceholder}
          mono
          placeholder="{{NAMESPACE.CAMPO}}"
        />
      </div>
    </div>
  );
}

export function ContractImportWorkspace({
  open,
  onOpenChange,
  onSave,
}: ContractImportWorkspaceProps) {
  const [step, setStep] = useState<Step>("import");
  const [rawText, setRawText] = useState("");
  const [parseResult, setParseResult] = useState<SemanticParseResult | null>(null);
  const [variables, setVariables] = useState<SemanticVariable[]>([]);
  const [activeVariableId, setActiveVariableId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateDesc, setTemplateDesc] = useState("");
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<"original" | "template">("original");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

    if (ext === "docx" || ext === "doc") {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const arrayBuffer = ev.target?.result as ArrayBuffer;
          const result = await mammoth.extractRawText({ arrayBuffer });
          const text = result.value.trim();
          if (!text) {
            toast.error("Não foi possível extrair texto deste arquivo. Tente copiar e colar o conteúdo manualmente.");
            return;
          }
          setRawText(text);
          setAnalyzeError(null);
          toast.success(`Arquivo "${file.name}" carregado — ${text.length.toLocaleString("pt-BR")} caracteres extraídos.`);
        } catch {
          toast.error("Erro ao extrair texto do arquivo Word. Tente copiar e colar o conteúdo manualmente.");
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const content = ev.target?.result as string;
        setRawText(content ?? "");
        setAnalyzeError(null);
        toast.success(`Arquivo "${file.name}" carregado.`);
      };
      reader.onerror = () => {
        toast.error("Erro ao ler o arquivo. Tente copiar e colar o conteúdo.");
      };
      reader.readAsText(file, "UTF-8");
    }
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!rawText.trim()) {
      toast.error("Cole ou carregue o texto do contrato antes de analisar.");
      return;
    }
    setStep("analyzing");
    setAnalyzeError(null);
    try {
      const result = await parseContractText(rawText);
      setParseResult(result);
      setVariables(result.variables);
      setStep("review");
      if (result.variables.length === 0) {
        toast.warning("Nenhuma variável detectada. Verifique se o documento contém dados dinâmicos.");
      } else {
        toast.success(`${result.variables.length} variáveis detectadas.`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao analisar o contrato.";
      setAnalyzeError(msg);
      setStep("import");
      toast.error(msg);
    }
  }, [rawText]);

  const handleActivateVariable = useCallback((id: string) => {
    setActiveVariableId(id);
    const el = document.getElementById(`highlight-${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const handleToggleAccept = useCallback((id: string) => {
    setVariables((prev) => prev.map((v) => (v.id === id ? { ...v, accepted: !v.accepted } : v)));
  }, []);

  const handleRemove = useCallback(
    (id: string) => {
      setVariables((prev) => prev.filter((v) => v.id !== id));
      if (activeVariableId === id) setActiveVariableId(null);
    },
    [activeVariableId],
  );

  const handleUpdateVariable = useCallback((id: string, updates: Partial<SemanticVariable>) => {
    setVariables((prev) => prev.map((v) => (v.id === id ? { ...v, ...updates } : v)));
  }, []);

  const handleGenerateTemplate = useCallback(() => {
    const accepted = variables.filter((v) => v.accepted);
    if (accepted.length === 0) {
      toast.error("Aceite ao menos uma variável antes de gerar o template.");
      return;
    }
    setStep("naming");
  }, [variables]);

  const handleSave = useCallback(() => {
    if (!templateName.trim()) {
      toast.error("Dê um nome ao template.");
      return;
    }

    const accepted = variables.filter((v) => v.accepted);
    const generatedContent = applyVariablesToText(rawText, accepted);

    const manifest: SemanticTemplateManifest = {
      variables: accepted,
      clauseTypes: parseResult?.clauseTypes ?? [],
      generatedAt: new Date().toISOString(),
    };

    const data: TemplateContratoInsert = {
      nome: templateName.trim(),
      tipo_servico: "semantico",
      conteudo: generatedContent,
      descricao: templateDesc.trim() || null,
      ativo: true,
      variables_manifest: JSON.stringify(manifest),
    };

    onSave(data);
    onOpenChange(false);
    resetState();
    toast.success("Template gerado e salvo com sucesso!");
  }, [templateName, templateDesc, variables, rawText, parseResult, onSave, onOpenChange]);

  const resetState = useCallback(() => {
    setStep("import");
    setRawText("");
    setParseResult(null);
    setVariables([]);
    setActiveVariableId(null);
    setTemplateName("");
    setTemplateDesc("");
    setAnalyzeError(null);
    setPreviewMode("original");
  }, []);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    resetState();
  }, [onOpenChange, resetState]);

  const acceptedCount = variables.filter((v) => v.accepted).length;
  const totalCount = variables.length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[95vw] w-[1400px] h-[92vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileSearch className="h-4 w-4 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-base">Contract Intelligence Engine</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {step === "import" && "Importe o contrato para análise semântica"}
                  {step === "analyzing" && "Analisando semanticamente o documento..."}
                  {step === "review" &&
                    `${totalCount} variáveis detectadas — ${acceptedCount} aceitas — clique em qualquer campo para editar`}
                  {step === "naming" && "Nomeie e salve o template"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {step === "import" && (
                <Button
                  onClick={handleAnalyze}
                  disabled={!rawText.trim()}
                  className="gap-2"
                  data-testid="button-analyze-contract"
                >
                  <Sparkles className="h-4 w-4" />
                  Analisar Contrato
                </Button>
              )}
              {step === "review" && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setStep("import")}
                    className="gap-2"
                    data-testid="button-back-import"
                  >
                    Voltar
                  </Button>
                  <Button
                    onClick={handleGenerateTemplate}
                    disabled={acceptedCount === 0}
                    className="gap-2"
                    data-testid="button-generate-template"
                  >
                    <Save className="h-4 w-4" />
                    Gerar Template
                  </Button>
                </>
              )}
              {step === "naming" && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setStep("review")}
                    className="gap-2"
                  >
                    Voltar
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={!templateName.trim()}
                    className="gap-2"
                    data-testid="button-save-template"
                  >
                    <Save className="h-4 w-4" />
                    Salvar Template
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* ── STEP: import / analyzing ── */}
          {(step === "import" || step === "analyzing") && (
            <div className="flex flex-1 min-h-0 flex-col p-6 gap-4 relative">
              <div className="flex items-center gap-4 shrink-0">
                <div
                  className="flex items-center gap-2 cursor-pointer rounded-lg border border-dashed border-border px-4 py-2.5 hover:border-primary/50 hover:bg-primary/5 transition-colors text-sm text-muted-foreground"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="button-upload-file"
                >
                  <Upload className="h-4 w-4" />
                  Carregar arquivo (.txt, .doc, .docx)
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.text,.doc,.docx"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <span className="text-xs text-muted-foreground">ou cole o texto abaixo</span>
              </div>

              {analyzeError && (
                <div className="shrink-0 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-xs text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{analyzeError}</span>
                </div>
              )}

              <Textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={`Cole aqui o texto completo do contrato...

Exemplo:
CONTRATO DE PRESTAÇÃO DE SERVIÇOS MUSICAIS

CONTRATANTE: Lander Produtora Musical Ltda, CNPJ 00.000.000/0001-00...
CONTRATADO: João da Silva, CPF 000.000.000-00...

CLÁUSULA 1ª — DO OBJETO
O presente contrato tem por objeto a prestação de serviços musicais...

CLÁUSULA 2ª — DA REMUNERAÇÃO
O CONTRATANTE pagará ao CONTRATADO o valor de R$ 5.000,00...`}
                className="flex-1 min-h-0 resize-none font-mono text-sm"
                disabled={step === "analyzing"}
                data-testid="textarea-contract-text"
              />

              {step === "analyzing" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg gap-4">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Loader2 className="h-6 w-6 text-primary animate-spin" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Analisando semanticamente...</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Detectando entidades, valores dinâmicos e contextos jurídicos
                      </p>
                    </div>
                    <div className="flex gap-1.5 mt-1">
                      {["Entidades", "Financeiro", "Cláusulas", "Variáveis"].map((label) => (
                        <Badge key={label} variant="outline" className="text-[10px] animate-pulse">
                          {label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── STEP: review ── */}
          {step === "review" && (
            <div className="flex flex-1 min-h-0 overflow-hidden">
              {/* Left: document with highlights */}
              <div className="flex flex-col flex-1 min-w-0 border-r border-border">
                <div className="px-4 py-2.5 border-b border-border shrink-0 flex items-center justify-between gap-3">
                  {/* Toggle: Original / Template */}
                  <div className="flex items-center rounded-md border border-border overflow-hidden shrink-0">
                    <button
                      type="button"
                      onClick={() => setPreviewMode("original")}
                      className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium transition-colors ${
                        previewMode === "original"
                          ? "bg-primary text-primary-foreground"
                          : "bg-transparent text-muted-foreground hover:bg-muted"
                      }`}
                      data-testid="toggle-preview-original"
                    >
                      <FileText className="h-3 w-3" />
                      Original
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewMode("template")}
                      className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium transition-colors ${
                        previewMode === "template"
                          ? "bg-primary text-primary-foreground"
                          : "bg-transparent text-muted-foreground hover:bg-muted"
                      }`}
                      data-testid="toggle-preview-template"
                    >
                      <Sparkles className="h-3 w-3" />
                      Template
                    </button>
                  </div>

                  {/* Clause type badges */}
                  {parseResult && parseResult.clauseTypes.length > 0 && (
                    <div className="flex flex-wrap gap-1 min-w-0">
                      {parseResult.clauseTypes.slice(0, 5).map((ct) => (
                        <span
                          key={ct}
                          className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${CLAUSE_TYPE_COLORS[ct]}`}
                        >
                          {CLAUSE_TYPE_LABELS[ct]}
                        </span>
                      ))}
                      {parseResult.clauseTypes.length > 5 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded border text-muted-foreground border-border">
                          +{parseResult.clauseTypes.length - 5}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <ScrollArea className="flex-1">
                  <div className="px-6 py-4 min-h-full" data-testid="contract-editor">
                    {previewMode === "original"
                      ? highlightVariablesInText(rawText, variables, activeVariableId)
                      : highlightPlaceholdersInText(applyVariablesToText(rawText, variables))}
                  </div>
                </ScrollArea>

                {previewMode === "template" && (
                  <div className="px-4 py-2 border-t border-border shrink-0 flex items-center gap-1.5">
                    <mark className="bg-yellow-200/60 dark:bg-yellow-900/40 px-0.5 rounded font-mono text-[10px] text-foreground">
                      {"{{PLACEHOLDER}}"}
                    </mark>
                    <span className="text-[10px] text-muted-foreground">
                      = variável aceite · será substituída pelo valor real em cada contrato gerado
                    </span>
                  </div>
                )}
              </div>

              {/* Right: variable panel */}
              <div className="w-80 xl:w-[420px] shrink-0 flex flex-col min-h-0">
                <div className="px-4 py-2.5 border-b border-border shrink-0 flex items-center justify-between">
                  <span className="text-xs font-medium">Variáveis Detectadas</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {acceptedCount}/{totalCount}
                    </span>
                    {acceptedCount < totalCount && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-[10px]"
                        onClick={() =>
                          setVariables((prev) => prev.map((v) => ({ ...v, accepted: true })))
                        }
                        data-testid="button-accept-all"
                      >
                        Aceitar todas
                      </Button>
                    )}
                  </div>
                </div>

                <ScrollArea className="flex-1">
                  <div className="p-3 space-y-2">
                    {variables.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
                        <AlertCircle className="h-6 w-6 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Nenhuma variável detectada</p>
                        <p className="text-xs text-muted-foreground">
                          Tente um documento com mais dados dinâmicos
                        </p>
                      </div>
                    ) : (
                      variables.map((v) => (
                        <VariableCard
                          key={v.id}
                          variable={v}
                          isActive={v.id === activeVariableId}
                          onActivate={() => handleActivateVariable(v.id)}
                          onToggleAccept={() => handleToggleAccept(v.id)}
                          onRemove={() => handleRemove(v.id)}
                          onUpdate={(updates) => handleUpdateVariable(v.id, updates)}
                        />
                      ))
                    )}
                  </div>
                </ScrollArea>

                <div className="p-3 border-t border-border shrink-0">
                  <div className="rounded-lg bg-muted/50 px-3 py-2 space-y-1">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                      Como usar
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <mark className="bg-primary/10 text-primary rounded px-1 font-mono text-[10px]">
                        valor
                      </mark>
                      <span>texto substituído por placeholder</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Clique em qualquer campo da variável para editar antes de salvar
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP: naming ── */}
          {step === "naming" && (
            <div className="flex flex-1 min-h-0 items-start justify-center p-8">
              <div className="w-full max-w-lg space-y-6">
                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <p className="text-sm font-medium">Template pronto para salvar</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline" className="text-xs">
                      {acceptedCount} variáveis aceitas
                    </Badge>
                    {parseResult?.clauseTypes.slice(0, 4).map((ct) => (
                      <span
                        key={ct}
                        className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${CLAUSE_TYPE_COLORS[ct]}`}
                      >
                        {CLAUSE_TYPE_LABELS[ct]}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {rawText.length.toLocaleString("pt-BR")} caracteres →{" "}
                    {applyVariablesToText(
                      rawText,
                      variables.filter((v) => v.accepted),
                    ).length.toLocaleString("pt-BR")}{" "}
                    no template
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="template-name">Nome do Template *</Label>
                    <Input
                      id="template-name"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="Ex: Contrato de Agenciamento Artístico"
                      autoFocus
                      data-testid="input-template-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="template-desc">Descrição</Label>
                    <Textarea
                      id="template-desc"
                      value={templateDesc}
                      onChange={(e) => setTemplateDesc(e.target.value)}
                      placeholder="Descreva o uso e contexto deste template..."
                      rows={3}
                      data-testid="input-template-desc"
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-border p-3 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Variáveis que serão substituídas
                  </p>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {variables
                      .filter((v) => v.accepted)
                      .map((v) => (
                        <div key={v.id} className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground flex-1 truncate">
                            "{v.originalText}"
                          </span>
                          <X className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="font-mono text-primary shrink-0">{v.placeholder}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
