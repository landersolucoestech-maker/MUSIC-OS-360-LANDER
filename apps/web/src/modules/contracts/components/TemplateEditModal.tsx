import { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { ScrollArea } from "@/shared/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/shared/ui/sheet";
import {
  Loader2, Sparkles, Save, ArrowLeft, Plus, ChevronDown, ChevronRight, Check, X,
} from "lucide-react";
import { toast } from "sonner";
import type {
  TemplateContrato,
  TemplateContratoUpdate,
  SemanticVariable,
} from "@/modules/contracts/types/contracts.types";
import { parseContractText } from "@/modules/contracts/services/semantic-parser.service";
import { useVariableRegistry } from "@/modules/contracts/hooks/useVariableRegistry";

// ── Regex helpers ──────────────────────────────────────────────────────────

const PLACEHOLDER_REGEX = /\{\{([A-Z][A-Z0-9_]*\.[A-Z][A-Z0-9_]+)\}\}/gi;
const CUSTOM_VAR_REGEX = /^[A-Z][A-Z0-9_]*\.[A-Z][A-Z0-9_]+$/i;

// ── Highlighted preview ───────────────────────────────────────────────────

function HighlightedPreview({ text }: { text: string }) {
  if (!text.trim()) {
    return (
      <p className="text-muted-foreground/50 text-xs italic select-none">
        O preview aparece aqui enquanto escreve…
      </p>
    );
  }
  const parts = text.split(/(\{\{[^}]+\}\})/g);
  return (
    <p className="whitespace-pre-wrap text-sm leading-relaxed font-mono">
      {parts.map((part, i) => {
        if (/^\{\{[^}]+\}\}$/.test(part)) {
          return (
            <span
              key={i}
              className="text-primary bg-primary/10 rounded px-0.5 font-semibold"
            >
              {part}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </p>
  );
}

// ── Registry variable group accordion ─────────────────────────────────────

interface RegistryVarGroupProps {
  label: string;
  vars: import("@/modules/contracts/hooks/useVariableRegistry").RegistryVariable[];
  onInsert: (placeholder: string) => void;
}

function RegistryVarGroup({ label, vars, onInsert }: RegistryVarGroupProps) {
  const [open, setOpen] = useState(true);
  if (vars.length === 0) return null;
  return (
    <div className="mb-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 w-full text-left px-1 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
        data-testid={`button-vargroup-edit-${label}`}
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {label}
      </button>
      {open && (
        <div className="space-y-0.5 pl-1">
          {vars.map((v) => (
            <div
              key={v.id}
              className="flex items-center justify-between group rounded px-1.5 py-1 hover:bg-muted/60 transition-colors"
            >
              <div className="min-w-0">
                <span className="font-mono text-[11px] text-foreground/80 truncate block">
                  {v.placeholder}
                </span>
                {v.name && (
                  <span className="text-[10px] text-muted-foreground truncate block leading-tight">
                    {v.name}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => onInsert(v.placeholder)}
                className="shrink-0 ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-primary hover:text-primary/80"
                title={`Inserir ${v.placeholder}`}
                data-testid={`button-insert-registry-edit-${v.id}`}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── AI suggestion sheet ───────────────────────────────────────────────────

interface AiSuggestion {
  id: string;
  originalText: string;
  placeholder: string;
  accepted: boolean | null;
  occurrenceIndex: number;
}

function replaceNthOccurrence(str: string, search: string, replacement: string, n: number): string {
  let count = 0;
  let pos = 0;
  while (pos < str.length) {
    const found = str.indexOf(search, pos);
    if (found === -1) return str;
    if (count === n) {
      return str.slice(0, found) + replacement + str.slice(found + search.length);
    }
    count++;
    pos = found + search.length;
  }
  return str;
}

interface AiSuggestionsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestions: AiSuggestion[];
  onAccept: (id: string) => void;
  onIgnore: (id: string) => void;
}

function AiSuggestionsSheet({
  open, onOpenChange, suggestions, onAccept, onIgnore,
}: AiSuggestionsSheetProps) {
  const pending = suggestions.filter((s) => s.accepted === null);
  const accepted = suggestions.filter((s) => s.accepted === true);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-96 flex flex-col">
        <SheetHeader className="shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Sugestões da IA
          </SheetTitle>
          <p className="text-xs text-muted-foreground">
            Aceite individualmente as substituições que quiser aplicar ao texto.
          </p>
        </SheetHeader>

        <ScrollArea className="flex-1 mt-4">
          {suggestions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma sugestão encontrada para o texto actual.
            </p>
          ) : (
            <div className="space-y-3 pr-2">
              {pending.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold uppercase text-muted-foreground mb-2">
                    Pendentes ({pending.length})
                  </p>
                  {pending.map((s) => (
                    <div
                      key={s.id}
                      className="rounded-lg border p-3 space-y-2 text-sm"
                      data-testid={`suggestion-card-edit-${s.id}`}
                    >
                      <p className="text-muted-foreground text-xs line-clamp-2 italic">
                        "{s.originalText}"
                      </p>
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">→</span>
                        <span className="font-mono text-xs text-primary bg-primary/5 border border-primary/15 rounded px-1.5 py-0.5">
                          {s.placeholder}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 h-7 text-xs"
                          onClick={() => onAccept(s.id)}
                          data-testid={`button-accept-edit-${s.id}`}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Aceitar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-7 text-xs"
                          onClick={() => onIgnore(s.id)}
                          data-testid={`button-ignore-edit-${s.id}`}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Ignorar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {accepted.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold uppercase text-muted-foreground mb-2">
                    Aceites ({accepted.length})
                  </p>
                  {accepted.map((s) => (
                    <div
                      key={s.id}
                      className="rounded-lg border border-border/40 bg-muted/20 p-2.5 flex items-center gap-2 opacity-60"
                    >
                      <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span className="font-mono text-xs text-primary">{s.placeholder}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

// ── Props ──────────────────────────────────────────────────────────────────

interface TemplateEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: TemplateContrato | null;
  onSave: (id: string, data: TemplateContratoUpdate) => void;
}

// ── Main component ─────────────────────────────────────────────────────────

export function TemplateEditModal({
  open,
  onOpenChange,
  template,
  onSave,
}: TemplateEditModalProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [nome, setNome] = useState("");
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [customVar, setCustomVar] = useState("");

  const [aiLoading, setAiLoading] = useState(false);
  const [aiSheetOpen, setAiSheetOpen] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[]>([]);

  const { variables: registryVars, addVariable } = useVariableRegistry();

  // Populate from template when it changes
  useEffect(() => {
    if (!template) return;
    setNome(template.nome ?? "");
    setText(template.conteudo ?? "");
    setSearch("");
    setCustomVar("");
    setAiSuggestions([]);
    setAiSheetOpen(false);
  }, [template]);

  if (!template) return null;

  // ── Insert at cursor ───────────────────────────────────────────────────

  const insertAtCursor = useCallback((snippet: string) => {
    const el = textareaRef.current;
    if (!el) {
      setText((prev) => prev + snippet);
      return;
    }
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    const next = text.slice(0, start) + snippet + text.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + snippet.length;
      el.setSelectionRange(pos, pos);
    });
  }, [text]);

  // ── Create custom variable ─────────────────────────────────────────────

  function handleCreateCustomVar() {
    const raw = customVar.trim().toUpperCase();
    if (!CUSTOM_VAR_REGEX.test(raw)) {
      toast.error("Formato inválido. Use GRUPO.CAMPO (ex: SHOW.RIDER)");
      return;
    }
    const [group, field] = raw.split(".");
    const placeholder = `{{${raw}}}`;
    addVariable(raw, group, field);
    insertAtCursor(placeholder);
    setCustomVar("");
    toast.success(`${placeholder} criado e inserido`);
  }

  // ── AI suggestions ────────────────────────────────────────────────────

  async function handleAiSuggest() {
    if (!text.trim()) {
      toast.warning("Escreva ou cole texto no editor primeiro");
      return;
    }
    setAiLoading(true);
    try {
      const result = await parseContractText(text);
      const occurrenceCounters = new Map<string, number>();
      const suggestions: AiSuggestion[] = result.variables.map((v: SemanticVariable) => {
        const seen = occurrenceCounters.get(v.originalText) ?? 0;
        occurrenceCounters.set(v.originalText, seen + 1);
        return {
          id: v.id,
          originalText: v.originalText,
          placeholder: v.placeholder,
          accepted: null,
          occurrenceIndex: seen,
        };
      });
      setAiSuggestions(suggestions);
      setAiSheetOpen(true);
      if (suggestions.length === 0) {
        toast.info("A IA não encontrou mais sugestões de variáveis");
      }
    } catch {
      toast.error("Erro ao analisar o texto. Verifique a ligação à API.");
    } finally {
      setAiLoading(false);
    }
  }

  function handleAcceptSuggestion(id: string) {
    const suggestion = aiSuggestions.find((s) => s.id === id);
    if (!suggestion) return;
    const next = replaceNthOccurrence(
      text,
      suggestion.originalText,
      suggestion.placeholder,
      suggestion.occurrenceIndex,
    );
    if (next === text) {
      toast.warning("Texto original não encontrado — pode já ter sido substituído");
    } else {
      setText(next);
    }
    setAiSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, accepted: true } : s)),
    );
  }

  function handleIgnoreSuggestion(id: string) {
    setAiSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, accepted: false } : s)),
    );
  }

  // ── Save ──────────────────────────────────────────────────────────────

  function handleSave() {
    if (!template) return;
    if (!nome.trim()) {
      toast.error("Dê um nome ao template antes de guardar");
      return;
    }
    if (!text.trim()) {
      toast.error("O editor está vazio. Adicione o conteúdo do template.");
      return;
    }
    const placeholders = [
      ...new Set(
        Array.from(text.matchAll(PLACEHOLDER_REGEX)).map((m) => `{{${m[1].toUpperCase()}}}`),
      ),
    ];
    const manifest = { variables: placeholders, generatedAt: new Date().toISOString() };
    onSave(template.id, {
      nome: nome.trim(),
      conteudo: text,
      ativo: template.ativo ?? true,
      descricao: template.descricao ?? null,
      variables_manifest: JSON.stringify(manifest),
    });
    onOpenChange(false);
  }

  // ── Close ─────────────────────────────────────────────────────────────

  function handleClose() {
    setSearch("");
    setCustomVar("");
    setAiSuggestions([]);
    setAiSheetOpen(false);
    onOpenChange(false);
  }

  // ── Registry vars filtered + grouped ──────────────────────────────────

  const filteredRegistryVars = registryVars.filter((v) =>
    !search || v.placeholder.toLowerCase().includes(search.toLowerCase()),
  );

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <DialogContent
          className="max-w-[95vw] w-[1200px] h-[90vh] p-0 gap-0 flex flex-col overflow-hidden"
          data-testid="dialog-template-edit"
        >
          {/* ── Header ── */}
          <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleClose}
              data-testid="button-edit-back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>

            <div className="flex-1 min-w-0">
              <Input
                placeholder="Nome do template…"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="h-8 text-sm font-medium border-none shadow-none focus-visible:ring-0 px-0 bg-transparent"
                data-testid="input-edit-template-name"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAiSuggest}
                disabled={aiLoading}
                data-testid="button-edit-ai-suggest"
              >
                {aiLoading ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                )}
                IA
              </Button>

              <Button
                size="sm"
                onClick={handleSave}
                data-testid="button-save-edit-template"
              >
                <Save className="h-3.5 w-3.5 mr-1.5" />
                Guardar
              </Button>
            </div>
          </div>

          {/* ── Body ── */}
          <div className="flex flex-1 overflow-hidden">
            {/* ── Left: editor + preview ── */}
            <div className="flex flex-col flex-1 overflow-hidden border-r">
              {/* Editor */}
              <div className="flex-1 overflow-hidden flex flex-col p-4 gap-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider shrink-0">
                  Editor
                </Label>
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={
                    "Edite aqui o texto do contrato.\n\n" +
                    "Use {{GRUPO.CAMPO}} para inserir placeholders,\n" +
                    "ou clique [+] no painel de variáveis à direita."
                  }
                  className="flex-1 w-full resize-none rounded-md border bg-background px-3 py-2.5 text-sm font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground/40"
                  data-testid="textarea-edit-contract-editor"
                />
              </div>

              {/* Preview */}
              <div className="shrink-0 border-t max-h-52 overflow-y-auto bg-muted/20 p-4">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">
                  Preview
                </Label>
                <HighlightedPreview text={text} />
              </div>
            </div>

            {/* ── Right: variable panel ── */}
            <div className="w-72 flex flex-col overflow-hidden bg-background">
              {/* Search */}
              <div className="px-3 pt-3 pb-2 shrink-0">
                <Input
                  placeholder="Pesquisar variáveis…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 text-xs"
                  data-testid="input-edit-search-vars"
                />
              </div>

              {/* Variable list — grouped by v.group */}
              <ScrollArea className="flex-1 px-3">
                {filteredRegistryVars.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground/60 italic px-1 py-4 text-center">
                    {search
                      ? "Nenhuma variável encontrada"
                      : "Nenhuma variável criada. Aceda a Contratos → Variáveis para criar."}
                  </p>
                ) : (
                  <div className="pt-1">
                    {Array.from(
                      filteredRegistryVars.reduce((map, v) => {
                        const key = v.group || "Outros";
                        if (!map.has(key)) map.set(key, []);
                        map.get(key)!.push(v);
                        return map;
                      }, new Map<string, typeof filteredRegistryVars>()),
                    ).map(([groupLabel, groupVars]) => (
                      <RegistryVarGroup
                        key={groupLabel}
                        label={groupLabel}
                        vars={groupVars}
                        onInsert={insertAtCursor}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>

              {/* Custom variable creator */}
              <div className="shrink-0 border-t px-3 py-3 space-y-2">
                <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">
                  Nova variável custom
                </Label>
                <div className="flex gap-1.5">
                  <Input
                    placeholder="GRUPO.CAMPO"
                    value={customVar}
                    onChange={(e) => setCustomVar(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleCreateCustomVar(); }}
                    className="h-7 text-xs font-mono"
                    data-testid="input-edit-custom-var"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs shrink-0"
                    onClick={handleCreateCustomVar}
                    data-testid="button-edit-create-custom-var"
                  >
                    Criar
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Ex: SHOW.RIDER · Formato: GRUPO.CAMPO
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI suggestions side sheet */}
      <AiSuggestionsSheet
        open={aiSheetOpen}
        onOpenChange={setAiSheetOpen}
        suggestions={aiSuggestions}
        onAccept={handleAcceptSuggestion}
        onIgnore={handleIgnoreSuggestion}
      />
    </>
  );
}
