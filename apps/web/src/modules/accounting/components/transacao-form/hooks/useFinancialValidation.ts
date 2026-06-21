import { useState, useCallback } from "react";
import type { TransacaoFormData } from "@/modules/accounting/lib/transacao-constants";
import type { FinancialFormRules } from "@/modules/accounting/components/transacao-form/rules/financial-form-rules";
import {
  validateTransacaoForm,
  type ValidationErrors,
} from "@/modules/accounting/components/transacao-form/validation/financial-form-validation";

export interface UseFinancialValidationReturn {
  errors:          ValidationErrors;
  setErrors:       React.Dispatch<React.SetStateAction<ValidationErrors>>;
  validate:        (formData: TransacaoFormData, rules: FinancialFormRules) => boolean;
  clearFieldError: (field: keyof TransacaoFormData) => void;
  clearFieldErrors: (fields: (keyof TransacaoFormData)[]) => void;
  clearAllErrors:  () => void;
}

export function useFinancialValidation(): UseFinancialValidationReturn {
  const [errors, setErrors] = useState<ValidationErrors>({});

  const validate = useCallback((
    formData: TransacaoFormData,
    rules: FinancialFormRules,
  ): boolean => {
    const newErrors = validateTransacaoForm(formData, rules);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, []);

  const clearFieldError = useCallback((field: keyof TransacaoFormData) => {
    setErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const clearFieldErrors = useCallback((fields: (keyof TransacaoFormData)[]) => {
    if (fields.length === 0) return;

    setErrors(prev => {
      let changed = false;
      const next = { ...prev };

      for (const field of fields) {
        if (next[field]) {
          delete next[field];
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, []);

  const clearAllErrors = useCallback(() => setErrors({}), []);

  return { errors, setErrors, validate, clearFieldError, clearFieldErrors, clearAllErrors };
}
