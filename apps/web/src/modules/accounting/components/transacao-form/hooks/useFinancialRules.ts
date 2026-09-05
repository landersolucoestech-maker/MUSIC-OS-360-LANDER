import { useMemo } from "react";
import type { TransacaoFormData } from "@/modules/accounting/lib/transacao-constants";
import {
  getCategoriasParaTipoTransacao,
  getSubcategoriasParaCategoria,
  getItensInvestimentoPorCategoria,
} from "@/modules/accounting/lib/transacao-constants";
import {
  computeFinancialRules,
  type FinancialFormRules,
  DISPLAY_RULES,
} from "@/modules/accounting/components/transacao-form/rules/financial-form-rules";
import { getStoredOverrides, buildKey } from "./useRuleOverrides";

interface Evento  { id: string; artist_id?: string | null; title: string; data_inicio?: string | null }

export interface FinancialRulesResult extends FinancialFormRules {
  categorias:          { value: string; label: string }[];
  subcategorias:       { value: string; label: string }[];
  itensInvestimento:   { value: string; label: string }[];
  eventosFiltrados:    Evento[];
  valorParcela:        string | null;
}

interface UseFinancialRulesOptions {
  formData:  TransacaoFormData;
  eventos:   Evento[];
}

export function useFinancialRules({
  formData,
  eventos,
}: UseFinancialRulesOptions): FinancialRulesResult {
  const rules = useMemo(() => {
    const computed = computeFinancialRules(formData);
    const stored   = getStoredOverrides();
    if (Object.keys(stored).length === 0) return computed;

    // Apply stored overrides for matching combination
    const { tipoTransacao, tipoCliente, categoria } = formData;
    const overridden: FinancialFormRules = { ...computed };
    for (const ruleKey of Object.keys(DISPLAY_RULES) as (keyof typeof DISPLAY_RULES)[]) {
      const k = buildKey(tipoTransacao, tipoCliente, categoria, ruleKey);
      if (k in stored) {
        overridden[ruleKey] = stored[k];
      }
    }
    return overridden;
  }, [formData]);

  const categorias = useMemo(
    () => getCategoriasParaTipoTransacao(formData.tipoTransacao, formData.tipoCliente),
    [formData.tipoTransacao, formData.tipoCliente],
  );

  const subcategorias = useMemo(
    () => getSubcategoriasParaCategoria(formData.tipoTransacao, formData.tipoCliente, formData.categoria),
    [formData.tipoTransacao, formData.tipoCliente, formData.categoria],
  );

  const itensInvestimento = useMemo(
    () => getItensInvestimentoPorCategoria(formData.categoria),
    [formData.categoria],
  );

  const eventosFiltrados = useMemo(
    () => formData.artistaVinculado
      ? eventos.filter(e => e.artist_id != null && e.artist_id === formData.artistaVinculado)
      : [],
    [formData.artistaVinculado, eventos],
  );

  const valorParcela = useMemo(() => {
    if (formData.tipoPagamento === "parcelado" && formData.valor && formData.quantidadeParcelas) {
      const v = parseFloat(formData.valor);
      const p = parseInt(formData.quantidadeParcelas);
      if (v > 0 && p >= 2) return (v / p).toFixed(2);
    }
    return null;
  }, [formData.tipoPagamento, formData.valor, formData.quantidadeParcelas]);

  return {
    ...rules,
    categorias,
    subcategorias,
    itensInvestimento,
    eventosFiltrados,
    valorParcela,
  };
}
