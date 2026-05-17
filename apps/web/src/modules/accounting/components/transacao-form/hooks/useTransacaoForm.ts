import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  TransacaoFormData,
  initialFormData,
} from "@/modules/accounting/lib/transacao-constants";
import { transacaoToFormFields } from "@/modules/accounting/mappers";
import { applyResets } from "@/modules/accounting/components/transacao-form/rules/financial-reset-rules";
import type { FinancialFormRules } from "@/modules/accounting/components/transacao-form/rules/financial-form-rules";
import { useFinancialValidation } from "./useFinancialValidation";
import type { ValidationErrors } from "@/modules/accounting/components/transacao-form/validation/financial-form-validation";

interface UseTransacaoFormOptions {
  open:       boolean;
  mode:       "create" | "edit" | "view";
  transacao?: Record<string, unknown>;
  onClose:    () => void;
}

export interface UseTransacaoFormReturn {
  formData:     TransacaoFormData;
  errors:       ValidationErrors;
  isSubmitting: boolean;
  updateField:  (field: keyof TransacaoFormData, value: string) => void;
  handleSubmit: (e: React.FormEvent, rules: FinancialFormRules) => Promise<void>;
  handleFileUpload:  (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveAnexo: () => void;
}

export function useTransacaoForm({
  open,
  mode,
  transacao,
  onClose,
}: UseTransacaoFormOptions): UseTransacaoFormReturn {
  const [formData, setFormData]         = useState<TransacaoFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Single source of truth for errors — all validation state lives here
  const validation = useFinancialValidation();

  useEffect(() => {
    if (open) {
      setFormData(transacaoToFormFields(transacao ?? null));
    }
    validation.clearAllErrors();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transacao, open]);

  const updateField = useCallback((field: keyof TransacaoFormData, value: string) => {
    setFormData(prev => {
      const resets = applyResets(field, value);
      return { ...prev, [field]: value, ...resets };
    });
    // Clear validation error for the field that just changed
    validation.clearFieldError(field);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = useCallback(async (
    e: React.FormEvent,
    rules: FinancialFormRules,
  ): Promise<void> => {
    e.preventDefault();
    if (mode === "view") return;

    // Delegate validation entirely to useFinancialValidation
    const isValid = validation.validate(formData, rules);
    if (!isValid) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setIsSubmitting(true);
    try {
      let observacaoFinal = formData.observacao || "";
      if (rules.exibirMotivoViagem && formData.motivoViagem) {
        const prefixo = "[MOTIVO VIAGEM]: ";
        if (!observacaoFinal.includes(prefixo)) {
          observacaoFinal = `${prefixo}${formData.motivoViagem}\n${observacaoFinal}`.trim();
        }
      }
      void observacaoFinal;

      await new Promise(resolve => setTimeout(resolve, 500));
      toast.success(mode === "create" ? "Transação criada com sucesso!" : "Transação atualizada com sucesso!");
      onClose();
    } catch {
      toast.error("Erro ao salvar transação. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, mode, onClose]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fakeUrl = URL.createObjectURL(file);
      setFormData(prev => ({ ...prev, anexoUrl: fakeUrl, anexoNome: file.name }));
      toast.success("Arquivo anexado com sucesso!");
    }
  }, []);

  const handleRemoveAnexo = useCallback(() => {
    setFormData(prev => ({ ...prev, anexoUrl: "", anexoNome: "" }));
  }, []);

  return {
    formData,
    errors:       validation.errors,
    isSubmitting,
    updateField,
    handleSubmit,
    handleFileUpload,
    handleRemoveAnexo,
  };
}
