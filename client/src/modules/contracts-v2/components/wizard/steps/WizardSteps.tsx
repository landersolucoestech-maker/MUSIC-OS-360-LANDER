/**
 * modules/contracts-v2/components/wizard/steps/WizardSteps.tsx
 *
 * Todos os 7 steps do DocumentWizard:
 *  Step 1 — template   : escolha do modelo
 *  Step 2 — variables  : preenchimento das variáveis
 *  Step 3 — signers    : adicionar signatários
 *  Step 4 — preview    : pré-visualização do HTML renderizado
 *  Step 5 — review     : revisão final
 *  Step 6 — send       : confirmação de envio
 *  Step 7 — done       : conclusão
 */

import { useState } from "react";
import { CheckCircle2, Plus, Trash2, User, Mail, FileText, AlertCircle } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent } from "@/shared/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Skeleton } from "@/shared/ui/skeleton";
import { useDocumentTemplates } from "../../../hooks/useDocumentEngine";
import type {
  WizardState,
  DocumentTemplate,
  SignerRole,
  TemplateVariable,
} from "../../../types";
import {
  TEMPLATE_CATEGORY_LABEL,
  SIGNER_ROLE_LABEL,
  WIZARD_STEP_LABEL,
} from "../../../types";

// ─── Shared types ─────────────────────────────────────────────────────────────

interface StepProps {
  state:    WizardState;
  onChange: (patch: Partial<WizardState>) => void;
}

// ─── Step 1 — Template ────────────────────────────────────────────────────────

export function StepTemplate({ state, onChange }: StepProps) {
  const { data: templates = [], isLoading } = useDocumentTemplates();
  const [search, setSearch] = useState("");

  const filtered = templates.filter(
    (t) =>
      t.is_active &&
      (t.name.toLowerCase().includes(search.toLowerCase()) ||
        TEMPLATE_CATEGORY_LABEL[t.category].toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">Escolha o modelo de contrato</h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          Seleccione o template que será a base do documento.
        </p>
      </div>

      <Input
        placeholder="Pesquisar modelos…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-8 text-sm"
        data-testid="wizard-search-template"
      />

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p>Nenhum modelo encontrado.</p>
        </div>
      ) : (
        <div className="grid gap-2 max-h-[360px] overflow-y-auto pr-1">
          {filtered.map((t) => (
            <button
              key={t.id}
              type="button"
              data-testid={`wizard-template-${t.id}`}
              onClick={() =>
                onChange({
                  template: t,
                  variables: Object.fromEntries(
                    t.variables.map((v) => [v.key, v.defaultValue ?? ""]),
                  ),
                  title: t.name,
                  signers: t.signer_roles.map((role, idx) => ({
                    role,
                    name:   "",
                    email:  "",
                    anchor: `[ASSIN_${role.toUpperCase()}]`,
                  })),
                })
              }
              className={`w-full text-left rounded-lg border p-3 transition-all hover:border-primary/60 ${
                state.template?.id === t.id
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border bg-card"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{t.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {t.description ?? "Sem descrição."}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <Badge variant="secondary" className="text-[10px]">
                    {TEMPLATE_CATEGORY_LABEL[t.category]}
                  </Badge>
                  {state.template?.id === t.id && (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  )}
                </div>
              </div>
              <div className="flex gap-1 mt-2 flex-wrap">
                {t.signer_roles.map((r) => (
                  <Badge key={r} variant="outline" className="text-[10px] font-normal">
                    {SIGNER_ROLE_LABEL[r]}
                  </Badge>
                ))}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Step 2 — Variables ───────────────────────────────────────────────────────

export function StepVariables({ state, onChange }: StepProps) {
  const template = state.template;

  if (!template) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Seleccione um modelo no passo anterior.</AlertDescription>
      </Alert>
    );
  }

  const vars: TemplateVariable[] = template.variables;

  if (vars.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-30 text-green-600" />
        <p>Este modelo não tem variáveis a preencher.</p>
      </div>
    );
  }

  const handleVar = (key: string, value: string) => {
    onChange({ variables: { ...state.variables, [key]: value } });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">Preencher variáveis do contrato</h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          Os valores serão substituídos automaticamente no documento.
        </p>
      </div>

      <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
        {vars.map((v) => (
          <div key={v.key} className="space-y-1">
            <Label htmlFor={`var-${v.key}`} className="text-sm font-medium">
              {v.label}
              {v.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {v.helpText && (
              <p className="text-xs text-muted-foreground">{v.helpText}</p>
            )}
            {v.type === "select" && v.options ? (
              <Select
                value={state.variables[v.key] ?? ""}
                onValueChange={(val) => handleVar(v.key, val)}
              >
                <SelectTrigger id={`var-${v.key}`} className="h-8 text-sm" data-testid={`wizard-var-${v.key}`}>
                  <SelectValue placeholder="Seleccionar…" />
                </SelectTrigger>
                <SelectContent>
                  {v.options.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id={`var-${v.key}`}
                type={v.type === "number" ? "number" : v.type === "date" ? "date" : "text"}
                value={state.variables[v.key] ?? ""}
                onChange={(e) => handleVar(v.key, e.target.value)}
                placeholder={v.defaultValue ?? `Inserir ${v.label.toLowerCase()}…`}
                className="h-8 text-sm"
                data-testid={`wizard-var-${v.key}`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Step 3 — Signers ─────────────────────────────────────────────────────────

type SignerDraft = WizardState["signers"][number];

export function StepSigners({ state, onChange }: StepProps) {
  const signers = state.signers;

  const updateSigner = (idx: number, patch: Partial<SignerDraft>) => {
    const updated = signers.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    onChange({ signers: updated });
  };

  const addSigner = () => {
    const DEFAULT_ROLE: SignerRole = "testemunha";
    onChange({
      signers: [
        ...signers,
        { role: DEFAULT_ROLE, name: "", email: "", anchor: `[ASSIN_${DEFAULT_ROLE.toUpperCase()}]` },
      ],
    });
  };

  const removeSigner = (idx: number) => {
    onChange({ signers: signers.filter((_, i) => i !== idx) });
  };

  const ROLE_OPTIONS: SignerRole[] = ["artista", "label", "testemunha", "procurador", "produtor", "advogado"];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">Adicionar signatários</h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          Defina quem vai assinar e em que função.
        </p>
      </div>

      <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
        {signers.map((signer, idx) => (
          <Card key={idx} className="border-border">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Signatário {idx + 1}
                </p>
                {signers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSigner(idx)}
                    className="text-destructive hover:text-destructive/80 transition-colors"
                    data-testid={`wizard-remove-signer-${idx}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Função</Label>
                  <Select
                    value={signer.role}
                    onValueChange={(val) =>
                      updateSigner(idx, { role: val as SignerRole, anchor: `[ASSIN_${val.toUpperCase()}]` })
                    }
                  >
                    <SelectTrigger className="h-7 text-xs" data-testid={`wizard-signer-role-${idx}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((r) => (
                        <SelectItem key={r} value={r} className="text-xs">
                          {SIGNER_ROLE_LABEL[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">CPF (opcional)</Label>
                  <Input
                    placeholder="000.000.000-00"
                    value={signer.cpf ?? ""}
                    onChange={(e) => updateSigner(idx, { cpf: e.target.value })}
                    className="h-7 text-xs"
                    data-testid={`wizard-signer-cpf-${idx}`}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1">
                  <User className="h-3 w-3" /> Nome completo *
                </Label>
                <Input
                  placeholder="Nome do signatário"
                  value={signer.name}
                  onChange={(e) => updateSigner(idx, { name: e.target.value })}
                  className="h-7 text-xs"
                  data-testid={`wizard-signer-name-${idx}`}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1">
                  <Mail className="h-3 w-3" /> E-mail *
                </Label>
                <Input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={signer.email}
                  onChange={(e) => updateSigner(idx, { email: e.target.value })}
                  className="h-7 text-xs"
                  data-testid={`wizard-signer-email-${idx}`}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full gap-1.5 h-8 text-xs"
        onClick={addSigner}
        data-testid="wizard-add-signer"
      >
        <Plus className="h-3.5 w-3.5" /> Adicionar signatário
      </Button>
    </div>
  );
}

// ─── Step 4 — Preview ─────────────────────────────────────────────────────────

export function StepPreview({ state }: StepProps) {
  const template = state.template;
  if (!template) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Nenhum modelo seleccionado.</AlertDescription>
      </Alert>
    );
  }

  // Substituir variáveis no HTML do template
  let rendered = template.content;
  for (const [key, value] of Object.entries(state.variables)) {
    rendered = rendered.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g"), value || `[${key}]`);
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-base font-semibold">Pré-visualização do documento</h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          Verifique o conteúdo antes de continuar.
        </p>
      </div>

      <div
        className="border rounded-lg bg-white dark:bg-slate-950 p-6 max-h-[380px] overflow-y-auto text-sm leading-relaxed font-serif"
        data-testid="wizard-preview-content"
        dangerouslySetInnerHTML={{ __html: rendered }}
      />
    </div>
  );
}

// ─── Step 5 — Review ──────────────────────────────────────────────────────────

export function StepReview({ state, onChange }: StepProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">Revisão final</h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          Confirme todos os dados antes do envio.
        </p>
      </div>

      <div className="space-y-3">
        {/* Title */}
        <div className="space-y-1">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Título do documento
          </Label>
          <Input
            value={state.title}
            onChange={(e) => onChange({ title: e.target.value })}
            className="h-8 text-sm"
            data-testid="wizard-review-title"
          />
        </div>

        {/* Template */}
        <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Modelo</p>
          <p className="text-sm font-medium">{state.template?.name ?? "—"}</p>
          {state.template && (
            <Badge variant="secondary" className="text-[10px]">
              {TEMPLATE_CATEGORY_LABEL[state.template.category]}
            </Badge>
          )}
        </div>

        {/* Variables summary */}
        {Object.keys(state.variables).length > 0 && (
          <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Variáveis ({Object.keys(state.variables).length})
            </p>
            <div className="grid grid-cols-2 gap-1 mt-1">
              {Object.entries(state.variables).map(([k, v]) => (
                <div key={k} className="text-xs">
                  <span className="text-muted-foreground font-mono">{k}:</span>{" "}
                  <span className="font-medium">{v || <span className="text-destructive">vazio</span>}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Signers summary */}
        <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Signatários ({state.signers.length})
          </p>
          {state.signers.map((s, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs">
              <Badge variant="outline" className="text-[10px] font-normal flex-shrink-0">
                {SIGNER_ROLE_LABEL[s.role]}
              </Badge>
              <span className="font-medium truncate">{s.name || <span className="text-destructive">sem nome</span>}</span>
              <span className="text-muted-foreground truncate">{s.email || <span className="text-destructive">sem e-mail</span>}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Step 6 — Send ────────────────────────────────────────────────────────────

export function StepSend({ state }: StepProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">Confirmar envio</h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          O documento será criado e enviado para assinatura.
        </p>
      </div>

      <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800">
        <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <AlertDescription className="text-amber-700 dark:text-amber-300 text-xs">
          <strong>Modo de demonstração.</strong> Configure Autentique ou DocuSign em{" "}
          <a href="/settings/integrations" className="underline font-medium">
            Configurações → Integrações
          </a>{" "}
          para enviar contratos reais.
        </AlertDescription>
      </Alert>

      <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-medium">{state.title}</p>
        </div>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>Modelo: <span className="font-medium text-foreground">{state.template?.name}</span></p>
          <p>Signatários: <span className="font-medium text-foreground">{state.signers.length} pessoas</span></p>
        </div>
        <div className="pt-1">
          {state.signers.map((s, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs py-1 border-t border-border/50 first:border-0">
              <Badge variant="outline" className="text-[10px] font-normal">
                {SIGNER_ROLE_LABEL[s.role]}
              </Badge>
              <span className="font-medium">{s.name}</span>
              <span className="text-muted-foreground ml-auto">{s.email}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Step 7 — Done ────────────────────────────────────────────────────────────

export function StepDone({ state }: StepProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
      <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-950/40 flex items-center justify-center">
        <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
      </div>
      <div>
        <h3 className="text-base font-semibold">Documento criado com sucesso!</h3>
        <p className="text-sm text-muted-foreground mt-1">
          <span className="font-medium">{state.title}</span> foi criado
          {state.step === "done" ? " e enviado para assinatura" : ""}.
        </p>
      </div>
      <p className="text-xs text-muted-foreground max-w-xs">
        Acompanhe o estado das assinaturas na lista de documentos.
      </p>
    </div>
  );
}

// ─── Step labels (re-export para uso no wizard) ───────────────────────────────

export { WIZARD_STEP_LABEL };
