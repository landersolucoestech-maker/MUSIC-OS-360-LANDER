import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  TransacaoFormData,
  initialFormData,
} from "@/modules/accounting/lib/transacao-constants";
import { transacaoToFormFields } from "@/modules/accounting/mappers";
import { applyResets } from "@/modules/accounting/components/transacao-form/rules/financial-reset-rules";
import { validateTransacaoForm, type ValidationErrors } from "@/modules/accounting/components/transacao-form/validation/financial-form-validation";
import type { FinancialFormRules } from "@/modules/accounting/components/transacao-form/rules/financial-form-rules";

interface UseTransacaoFormOptions {
  open:          boolean;
  mode:          "create" | "edit" | "view";
  transacao?:    Record<string, unknown>;
  onClose:       () => void;
}

export interface UseTransacaoFormReturn {
  formData:     TransacaoFormData;
  errors:       ValidationErrors;
  isSubmitting: boolean;
  updateField:  (field: keyof TransacaoFormData, value: string) => void;
  validate:     (rules: FinancialFormRules) => boolean;
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
  const [formData, setFormData]       = useState<TransacaoFormData>(initialFormData);
  const [errors, setErrors]           = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setFormData(transacaoToFormFields(transacao ?? null));
    }
    setErrors({});
  }, [transacao, open]);

  const updateField = useCallback((field: keyof TransacaoFormData, value: string) => {
    setFormData(prev => {
      const resets = applyResets(field, value);
      return { ...prev, [field]: value, ...resets };
    });
    setErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const validate = useCallback((rules: FinancialFormRules): boolean => {
    const newErrors = validateTransacaoForm(formData, rules);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback(async (
    e: React.FormEvent,
    rules: FinancialFormRules,
  ): Promise<void> => {
    e.preventDefault();
    if (mode === "view") return;

    if (!validate(rules)) {
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
  }, [formData, mode, validate, onClose]);

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
    errors,
    isSubmitting,
    updateField,
    validate,
    handleSubmit,
    handleFileUpload,
    handleRemoveAnexo,
  };
}
