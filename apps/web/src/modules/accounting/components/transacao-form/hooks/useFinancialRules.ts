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
} from "@/modules/accounting/components/transacao-form/rules/financial-form-rules";

interface Projeto { id: string; artista_id?: string | null; titulo: string }
interface Evento  { id: string; artista_id?: string | null; titulo: string; data_inicio?: string | null }

export interface FinancialRulesResult extends FinancialFormRules {
  categorias:          { value: string; label: string }[];
  subcategorias:       { value: string; label: string }[];
  itensInvestimento:   { value: string; label: string }[];
  projetosFiltrados:   Projeto[];
  eventosFiltrados:    Evento[];
  valorParcela:        string | null;
}

interface UseFinancialRulesOptions {
  formData:  TransacaoFormData;
  projetos:  Projeto[];
  eventos:   Evento[];
}

export function useFinancialRules({
  formData,
  projetos,
  eventos,
}: UseFinancialRulesOptions): FinancialRulesResult {
  const rules = useMemo(() => computeFinancialRules(formData), [formData]);

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

  const projetosFiltrados = useMemo(
    () => formData.artistaVinculado
      ? projetos.filter(p => p.artista_id != null && p.artista_id === formData.artistaVinculado)
      : [],
    [formData.artistaVinculado, projetos],
  );

  const eventosFiltrados = useMemo(
    () => formData.artistaVinculado
      ? eventos.filter(e => e.artista_id != null && e.artista_id === formData.artistaVinculado)
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
    projetosFiltrados,
    eventosFiltrados,
    valorParcela,
  };
}
