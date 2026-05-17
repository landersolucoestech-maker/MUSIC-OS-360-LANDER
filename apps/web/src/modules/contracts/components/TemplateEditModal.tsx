import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { Badge } from "@/shared/ui/badge";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { Separator } from "@/shared/ui/separator";
import {
  Save,
  Plus,
  Trash2,
  Sparkles,
  FileText,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { toast } from "sonner";
import type {
  TemplateContrato,
  TemplateContratoUpdate,
  SemanticVariable,
  SemanticClauseType,
  SemanticTemplateManifest,
} from "@/modules/contracts/types/contracts.types";

const CLAUSE_TYPE_OPTIONS: SemanticClauseType[] = [
  "financeira", "autoral", "royalties", "exclusividade",
  "confidencialidade", "inadimplencia", "distribuicao_digital",
  "licenciamento", "rescisao", "assinatura", "prazo", "objeto",
];

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

function generateId(): string {
  return `sv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function validatePlaceholder(v: string): boolean {
  return /^\{\{[A-Z_]+\.[A-Z_]+\}\}$/.test(v);
}

function parseManifest(template: TemplateContrato): SemanticTemplateManifest {
  const raw = template["variables_manifest"];
  if (!raw) return { variables: [], clauseTypes: [], generatedAt: "" };
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return parsed as SemanticTemplateManifest;
  } catch {
    return { variables: [], clauseTypes: [], generatedAt: "" };
  }
}

interface VariableRowProps {
  variable: SemanticVariable;
  onChange: (updates: Partial<SemanticVariable>) => void;
  onRemove: () => void;
}

function VariableRow({ variable, onChange, onRemove }: VariableRowProps) {
  const isValid = validatePlaceholder(variable.placeholder);

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {isValid ? (
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
          ) : (
            <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
          )}
          <span className="text-xs font-mono text-primary truncate">{variable.placeholder}</span>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
          title="Remover variável"
          data-testid={`remove-var-${variable.id}`}
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
            Texto original
          </label>
          <Input
            value={variable.originalText}
            onChange={(e) => onChange({ originalText: e.target.value })}
            className="h-7 text-xs"
            placeholder={`"valor no contrato"`}
            data-testid={`input-original-${variable.id}`}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
            Placeholder
          </label>
          <Input
            value={variable.placeholder}
            onChange={(e) => onChange({ placeholder: e.target.value })}
            className={`h-7 text-xs font-mono ${!isValid ? "border-destructive" : ""}`}
            placeholder="{{NAMESPACE.CAMPO}}"
            data-testid={`input-placeholder-${variable.id}`}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
            Tipo de dado
          </label>
          <Input
            value={variable.inferredEntity}
            onChange={(e) => onChange({ inferredEntity: e.target.value })}
            className="h-7 text-xs"
            placeholder="Ex: Valor monetário"
            data-testid={`input-entity-${variable.id}`}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
            Contexto jurídico
          </label>
          <Input
            value={variable.context}
            onChange={(e) => onChange({ context: e.target.value })}
            className="h-7 text-xs"
            placeholder="Contexto da cláusula..."
            data-testid={`input-context-${variable.id}`}
          />
        </div>
      </div>
    </div>
  );
}

interface TemplateEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: TemplateContrato | null;
  onSave: (id: string, data: TemplateContratoUpdate) => void;
}

export function TemplateEditModal({
  open,
  onOpenChange,
  template,
  onSave,
}: TemplateEditModalProps) {
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [variables, setVariables] = useState<SemanticVariable[]>([]);
  const [clauseTypes, setClauseTypes] = useState<SemanticClauseType[]>([]);
  const [activeTab, setActiveTab] = useState<"info" | "variaveis" | "conteudo">("info");

  useEffect(() => {
    if (!template) return;
    const manifest = parseManifest(template);
    setNome(template.nome ?? "");
    setDescricao(template.descricao ?? "");
    setConteudo(template.conteudo ?? "");
    setAtivo(template.ativo ?? true);
    setVariables(manifest.variables ?? []);
    setClauseTypes(manifest.clauseTypes ?? []);
  }, [template]);

  if (!template) return null;

  const isSemantic = template.tipo_servico === "semantico";
  const invalidCount = variables.filter((v) => !validatePlaceholder(v.placeholder)).length;

  const handleUpdateVariable = (id: string, updates: Partial<SemanticVariable>) => {
    setVariables((prev) => prev.map((v) => (v.id === id ? { ...v, ...updates } : v)));
  };

  const handleRemoveVariable = (id: string) => {
    setVariables((prev) => prev.filter((v) => v.id !== id));
  };

  const handleAddVariable = () => {
    const newVar: SemanticVariable = {
      id: generateId(),
      originalText: "",
      context: "",
      inferredEntity: "",
      placeholder: "{{NAMESPACE.CAMPO}}",
      accepted: true,
    };
    setVariables((prev) => [...prev, newVar]);
  };

  const toggleClauseType = (ct: SemanticClauseType) => {
    setClauseTypes((prev) =>
      prev.includes(ct) ? prev.filter((c) => c !== ct) : [...prev, ct],
    );
  };

  const handleSave = () => {
    if (!nome.trim()) {
      toast.error("O nome do template é obrigatório.");
      return;
    }
    if (invalidCount > 0) {
      toast.error(`${invalidCount} variável(is) com placeholder inválido. Corrija antes de salvar.`);
      setActiveTab("variaveis");
      return;
    }

    const manifest: SemanticTemplateManifest = {
      variables,
      clauseTypes,
      generatedAt: template["variables_manifest"]
        ? (parseManifest(template).generatedAt ?? new Date().toISOString())
        : new Date().toISOString(),
    };

    const data: TemplateContratoUpdate = {
      nome: nome.trim(),
      descricao: descricao.trim() || null,
      conteudo: conteudo || null,
      ativo,
      variables_manifest: JSON.stringify(manifest),
    };

    onSave(template.id, data);
    onOpenChange(false);
  };

  const tabs = [
    { id: "info" as const, label: "Informações" },
    { id: "variaveis" as const, label: `Variáveis (${variables.length})` },
    { id: "conteudo" as const, label: "Conteúdo" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-full h-[82vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-0 shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className={`h-7 w-7 rounded-lg flex items-center justify-center ${
                isSemantic ? "bg-primary/10" : "bg-muted"
              }`}
            >
              {isSemantic ? (
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              ) : (
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base truncate">Editar Template</DialogTitle>
              <p className="text-xs text-muted-foreground">{template.nome}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-0 mt-4 border-b border-border">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
                data-testid={`tab-${tab.id}`}
              >
                {tab.label}
                {tab.id === "variaveis" && invalidCount > 0 && (
                  <span className="ml-1.5 h-4 w-4 inline-flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold">
                    !
                  </span>
                )}
              </button>
            ))}
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="px-6 py-5 space-y-5">

              {/* ── TAB: info ── */}
              {activeTab === "info" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-nome">Nome do Template *</Label>
                    <Input
                      id="edit-nome"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Ex: Contrato de Agenciamento Artístico"
                      data-testid="input-edit-nome"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-desc">Descrição</Label>
                    <Textarea
                      id="edit-desc"
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                      placeholder="Descreva o uso e contexto deste template..."
                      rows={3}
                      data-testid="input-edit-desc"
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Status do Template</p>
                      <p className="text-xs text-muted-foreground">
                        Templates ativos ficam disponíveis para uso
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAtivo((v) => !v)}
                      className="flex items-center gap-2 transition-colors"
                      data-testid="toggle-ativo"
                    >
                      {ativo ? (
                        <>
                          <ToggleRight className="h-6 w-6 text-primary" />
                          <Badge variant="default" className="text-xs">Ativo</Badge>
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="h-6 w-6 text-muted-foreground" />
                          <Badge variant="secondary" className="text-xs">Inativo</Badge>
                        </>
                      )}
                    </button>
                  </div>

                  {isSemantic && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Tipos de Cláusula</p>
                        <p className="text-xs text-muted-foreground">
                          Clique para adicionar ou remover tipos detectados neste template
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {CLAUSE_TYPE_OPTIONS.map((ct) => (
                            <button
                              key={ct}
                              type="button"
                              onClick={() => toggleClauseType(ct)}
                              className={`text-[10px] px-2 py-1 rounded border font-medium transition-opacity ${
                                clauseTypes.includes(ct)
                                  ? CLAUSE_TYPE_COLORS[ct]
                                  : "border-border text-muted-foreground opacity-50 hover:opacity-70"
                              }`}
                              data-testid={`clause-type-${ct}`}
                            >
                              {CLAUSE_TYPE_LABELS[ct]}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ── TAB: variaveis ── */}
              {activeTab === "variaveis" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Variáveis Mapeadas</p>
                      <p className="text-xs text-muted-foreground">
                        Edite ou adicione variáveis. O placeholder deve seguir o formato{" "}
                        <span className="font-mono">{"{{NAMESPACE.CAMPO}}"}</span>
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleAddVariable}
                      className="gap-1.5 shrink-0"
                      data-testid="button-add-variable"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Adicionar
                    </Button>
                  </div>

                  {invalidCount > 0 && (
                    <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>
                        {invalidCount} variável(is) com placeholder inválido. Corrija antes de salvar.
                      </span>
                    </div>
                  )}

                  {variables.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-2 text-center rounded-lg border border-dashed border-border">
                      <AlertCircle className="h-6 w-6 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Nenhuma variável mapeada
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleAddVariable}
                        className="gap-1.5 mt-1"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Adicionar primeira variável
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {variables.map((v) => (
                        <VariableRow
                          key={v.id}
                          variable={v}
                          onChange={(updates) => handleUpdateVariable(v.id, updates)}
                          onRemove={() => handleRemoveVariable(v.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB: conteudo ── */}
              {activeTab === "conteudo" && (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">Conteúdo do Template</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Texto do contrato com os placeholders já substituídos.
                      Os valores dinâmicos aparecem como{" "}
                      <span className="font-mono text-primary">{"{{NAMESPACE.CAMPO}}"}</span>
                    </p>
                  </div>
                  <Textarea
                    value={conteudo}
                    onChange={(e) => setConteudo(e.target.value)}
                    placeholder="Conteúdo do template com placeholders..."
                    className="font-mono text-xs min-h-[400px] resize-none"
                    data-testid="textarea-conteudo"
                  />
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-border shrink-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-edit"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!nome.trim()}
            className="gap-2"
            data-testid="button-save-edit"
          >
            <Save className="h-4 w-4" />
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
