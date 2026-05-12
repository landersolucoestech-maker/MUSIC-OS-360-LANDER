/**
 * modules/contracts-v2/components/wizard/DocumentWizard.tsx
 *
 * Wizard multi-step de criação de documentos (7 etapas):
 *   1. template   — escolha do modelo
 *   2. variables  — preenchimento das variáveis
 *   3. signers    — definir signatários
 *   4. preview    — pré-visualização do HTML
 *   5. review     — revisão e título final
 *   6. send       — confirmação de envio
 *   7. done       — conclusão
 *
 * Estado gerido localmente; ao concluir, chama onComplete(docId).
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { useCreateDocument } from "../../hooks/useDocumentEngine";
import type { WizardState, WizardStep } from "../../types";
import {
  StepTemplate,
  StepVariables,
  StepSigners,
  StepPreview,
  StepReview,
  StepSend,
  StepDone,
  WIZARD_STEP_LABEL,
} from "./steps/WizardSteps";

// ─── Step order ───────────────────────────────────────────────────────────────

const STEP_ORDER: WizardStep[] = [
  "template",
  "variables",
  "signers",
  "preview",
  "review",
  "send",
  "done",
];

// ─── Validation ───────────────────────────────────────────────────────────────

function validateStep(state: WizardState, step: WizardStep): string | null {
  switch (step) {
    case "template":
      return state.template ? null : "Seleccione um modelo para continuar.";

    case "variables": {
      const required = (state.template?.variables ?? []).filter((v) => v.required);
      const missing  = required.filter((v) => !state.variables[v.key]?.trim());
      return missing.length > 0
        ? `Preencha os campos obrigatórios: ${missing.map((v) => v.label).join(", ")}.`
        : null;
    }

    case "signers": {
      const invalid = state.signers.filter((s) => !s.name.trim() || !s.email.trim());
      if (invalid.length > 0) return "Todos os signatários precisam de nome e e-mail.";
      const badEmail = state.signers.find((s) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email));
      return badEmail ? `E-mail inválido: ${badEmail.email}` : null;
    }

    case "review":
      return state.title.trim() ? null : "O título do documento é obrigatório.";

    default:
      return null;
  }
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current, steps }: { current: WizardStep; steps: WizardStep[] }) {
  const currentIdx = steps.indexOf(current);

  return (
    <div className="flex items-center gap-1 flex-wrap" role="list" aria-label="Progresso do wizard">
      {steps.filter((s) => s !== "done").map((step, idx) => {
        const isDone    = idx < currentIdx;
        const isActive  = step === current;
        return (
          <div key={step} className="flex items-center gap-1" role="listitem">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                isDone
                  ? "bg-primary text-primary-foreground"
                  : isActive
                  ? "bg-primary/15 text-primary border-2 border-primary"
                  : "bg-muted text-muted-foreground"
              }`}
              aria-current={isActive ? "step" : undefined}
            >
              {isDone ? "✓" : idx + 1}
            </div>
            {idx < steps.filter((s) => s !== "done").length - 1 && (
              <div className={`h-px w-4 ${isDone ? "bg-primary" : "bg-border"}`} />
            )}
          </div>
        );
      })}
      <span className="text-xs text-muted-foreground ml-2 font-medium">
        {WIZARD_STEP_LABEL[current]}
      </span>
    </div>
  );
}

// ─── DocumentWizard ───────────────────────────────────────────────────────────

interface DocumentWizardProps {
  onComplete?: (docId: string) => void;
  initialContractId?: string;
  initialTitulo?: string;
  initialArtistaId?: string;
}

export function DocumentWizard({
  onComplete,
  initialContractId,
  initialTitulo,
  initialArtistaId,
}: DocumentWizardProps) {
  const navigate      = useNavigate();
  const createMut     = useCreateDocument();

  const INITIAL_STATE: WizardState = {
    step:        "template",
    template:    undefined,
    variables:   {},
    signers:     [],
    title:       initialTitulo ?? "",
    artista_id:  initialArtistaId,
    contract_id: initialContractId,
  };

  const [state, setState] = useState<WizardState>(INITIAL_STATE);
  const [error, setError] = useState<string | null>(null);

  const currentIdx = STEP_ORDER.indexOf(state.step);
  const isFirst    = currentIdx === 0;
  const isLast     = state.step === "send";
  const isDone     = state.step === "done";

  const patchState = (patch: Partial<WizardState>) => {
    setState((prev) => ({ ...prev, ...patch }));
    setError(null);
  };

  // ── Next ───────────────────────────────────────────────────────────────────

  const handleNext = async () => {
    const validationError = validateStep(state, state.step);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);

    // Último step antes de "done" → criar o documento
    if (state.step === "send") {
      if (!state.template) return;

      try {
        const doc = await createMut.mutateAsync({
          template_id: state.template.id,
          title:       state.title,
          variables:   state.variables,
          signers:     state.signers,
          artista_id:  state.artista_id,
          contract_id: state.contract_id,
        });

        patchState({ step: "done" });
        onComplete?.(doc.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao criar o documento.");
      }
      return;
    }

    const nextStep = STEP_ORDER[currentIdx + 1];
    if (nextStep) patchState({ step: nextStep });
  };

  // ── Back ───────────────────────────────────────────────────────────────────

  const handleBack = () => {
    if (isFirst) {
      navigate("/contratos");
      return;
    }
    const prevStep = STEP_ORDER[currentIdx - 1];
    if (prevStep) patchState({ step: prevStep });
  };

  // ── Render step ────────────────────────────────────────────────────────────

  const stepProps = { state, onChange: patchState };

  const renderStep = () => {
    switch (state.step) {
      case "template":   return <StepTemplate  {...stepProps} />;
      case "variables":  return <StepVariables {...stepProps} />;
      case "signers":    return <StepSigners   {...stepProps} />;
      case "preview":    return <StepPreview   {...stepProps} />;
      case "review":     return <StepReview    {...stepProps} />;
      case "send":       return <StepSend      {...stepProps} />;
      case "done":       return <StepDone      {...stepProps} />;
    }
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6" data-testid="document-wizard">

      {/* Step indicator */}
      {!isDone && (
        <StepIndicator current={state.step} steps={STEP_ORDER} />
      )}

      {/* Step content */}
      <div className="min-h-[320px]">
        {renderStep()}
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2" data-testid="wizard-error">
          {error}
        </p>
      )}

      {/* Navigation */}
      {!isDone && (
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleBack}
            data-testid="wizard-btn-back"
          >
            <ChevronLeft className="h-4 w-4" />
            {isFirst ? "Cancelar" : "Anterior"}
          </Button>

          <Button
            size="sm"
            className="gap-1.5"
            onClick={handleNext}
            disabled={createMut.isPending}
            data-testid="wizard-btn-next"
          >
            {createMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isLast ? "Criar e Enviar" : "Continuar"}
            {!isLast && <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>
      )}

      {/* Done navigation */}
      {isDone && (
        <div className="flex items-center justify-center pt-2 border-t border-border gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setState(INITIAL_STATE)}
            data-testid="wizard-btn-new"
          >
            Criar outro documento
          </Button>
          <Button
            size="sm"
            onClick={() => navigate("/contratos")}
            data-testid="wizard-btn-list"
          >
            Ver contratos
          </Button>
        </div>
      )}
    </div>
  );
}
