import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useNotasFiscais } from "@/modules/accounting/hooks/useNotasFiscais";
import { useClientes } from "@/modules/crm-relationships/hooks/useContacts";
import { useCompanySettings } from "@/modules/settings/hooks/useCompanySettings";
import { parseTipoOperacao, serializeTipoOperacao } from "@/modules/accounting/lib/nota-fiscal-tipo";
import { notaFiscalSchema } from "@/modules/accounting/lib/nota-fiscal-schema";
import { validateNfForm, type NfValidationErrors } from "@/modules/accounting/components/nota-fiscal-form/validation/nf-form-validation";
import { applyResets } from "@/modules/accounting/components/nota-fiscal-form/rules/nf-reset-rules";
import { useNfRules } from "./useNfRules";
import {
  type NfFormData,
  type NfFormRules,
  type TipoOperacaoNF,
  type ItemNota,
  INITIAL_ITEM,
  INITIAL_FORM_DATA,
} from "@/modules/accounting/components/nota-fiscal-form/rules/nf-form-rules";

interface UseNotaFiscalFormOptions {
  open: boolean;
  mode: "create" | "edit" | "view";
  notaFiscal?: any;
  defaultTipoOperacao?: TipoOperacaoNF;
  onClose: () => void;
}

function numberValue(...values: unknown[]): number | null {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const parsed = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export interface UseNotaFiscalFormReturn {
  formData: NfFormData;
  tipoOperacao: TipoOperacaoNF;
  rules: NfFormRules;
  validationErrors: NfValidationErrors;
  isViewMode: boolean;
  isSubmitting: boolean;
  setTipoOperacao: (t: TipoOperacaoNF) => void;
  updateField: <K extends keyof NfFormData>(field: K, value: NfFormData[K]) => void;
  handleClienteChange: (clienteId: string) => void;
  updateItem: (index: number, field: keyof ItemNota, value: any) => void;
  addItem: () => void;
  removeItem: (index: number) => void;
  recalcularTributos: () => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  clientes: any[];
  companySettings: any;
}

export function useNotaFiscalForm({
  open,
  mode,
  notaFiscal,
  defaultTipoOperacao,
  onClose,
}: UseNotaFiscalFormOptions): UseNotaFiscalFormReturn {
  const { addNotaFiscal, updateNotaFiscal } = useNotasFiscais();
  const { clientes } = useClientes();
  const { companySettings } = useCompanySettings();

  const [tipoOperacao, setTipoOperacao] = useState<TipoOperacaoNF>(defaultTipoOperacao ?? "saida");
  const [formData, setFormData] = useState<NfFormData>({ ...INITIAL_FORM_DATA });
  const [validationErrors, setValidationErrors] = useState<NfValidationErrors>({});

  const isViewMode = mode === "view";
  const isSubmitting = addNotaFiscal.isPending || updateNotaFiscal.isPending;
  const rules = useNfRules(tipoOperacao);

  useEffect(() => {
    if (notaFiscal && (mode === "edit" || mode === "view")) {
      const { tipo, observacoesLimpas } = parseTipoOperacao(notaFiscal.observacoes);
      const valorServicos = numberValue(notaFiscal.valor_servicos, notaFiscal.valor, notaFiscal.valor_total) ?? 0;
      const valorLiquido = numberValue(notaFiscal.valor_liquido, notaFiscal.valor_servicos, notaFiscal.valor, notaFiscal.valor_total) ?? 0;
      const descricaoServicos = notaFiscal.descricao_servicos ?? notaFiscal.descricao_servico ?? "";
      const tomadorRazaoSocial = notaFiscal.tomador_razao_social ?? notaFiscal.tomador_nome ?? notaFiscal.clientes?.nome ?? "";
      setTipoOperacao(tipo);
      setFormData({
        ...INITIAL_FORM_DATA,
        ...notaFiscal,
        observacoes: observacoesLimpas,
        tomador_razao_social: tomadorRazaoSocial,
        descricao_servicos: descricaoServicos,
        valor_servicos: valorServicos,
        valor_liquido: valorLiquido,
        data_emissao: notaFiscal.data_emissao ? new Date(notaFiscal.data_emissao) : undefined,
        vencimento: notaFiscal.vencimento
          ? new Date(notaFiscal.vencimento)
          : notaFiscal.data_vencimento
            ? new Date(notaFiscal.data_vencimento)
            : undefined,
        itens: Array.isArray(notaFiscal.itens) && notaFiscal.itens.length > 0
          ? notaFiscal.itens
          : [{ ...INITIAL_ITEM, descricao: descricaoServicos, valor_unitario: valorServicos, valor_total: valorServicos }],
      });
    } else if (!notaFiscal && open) {
      setTipoOperacao(defaultTipoOperacao ?? "saida");
      setFormData({ ...INITIAL_FORM_DATA, data_emissao: new Date(), itens: [{ ...INITIAL_ITEM }] });
    }
    setValidationErrors({});
  }, [notaFiscal, mode, open, defaultTipoOperacao]);

  useEffect(() => {
    if (mode !== "create" || !open || !companySettings) return;
    setFormData((prev) => {
      const isDefault = !prev.codigo_municipio || prev.codigo_municipio === "3550308";
      if (!isDefault) return prev;
      const cidade = (companySettings.cidade || "").toLowerCase();
      return { ...prev, codigo_municipio: cidade.includes("são paulo") ? "3550308" : prev.codigo_municipio };
    });
  }, [companySettings, mode, open]);

  useEffect(() => {
    if (isViewMode) return;
    const valor = Number(formData.valor_servicos) || 0;
    if (valor === 0) return;
    const deducoes = Number(formData.valor_deducoes) || 0;
    const baseCalculo = +(valor - deducoes).toFixed(2);
    const aliquotaIss = Number(formData.aliquota_iss) || 0;
    const valorIss = +(baseCalculo * (aliquotaIss / 100)).toFixed(2);
    const valorPis = +(valor * 0.0065).toFixed(2);
    const valorCofins = +(valor * 0.03).toFixed(2);
    const valorIr = +(valor * 0.015).toFixed(2);
    const valorCsll = +(valor * 0.01).toFixed(2);
    const valorInss = Number(formData.valor_inss) || 0;
    const valorLiquido = +(valor - (formData.iss_retido ? valorIss : 0) - valorPis - valorCofins - valorIr - valorCsll - valorInss).toFixed(2);
    setFormData((prev) => ({
      ...prev,
      base_calculo: baseCalculo,
      valor_iss: valorIss,
      valor_pis: valorPis,
      valor_cofins: valorCofins,
      valor_ir: valorIr,
      valor_csll: valorCsll,
      valor_liquido: valorLiquido,
    }));
  }, [formData.valor_servicos, formData.valor_deducoes, formData.aliquota_iss, formData.iss_retido, formData.valor_inss, isViewMode]);

  const updateField = useCallback(<K extends keyof NfFormData>(field: K, value: NfFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value, ...applyResets(field, value) }));
    setValidationErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const handleClienteChange = useCallback((clienteId: string) => {
    const cliente = clientes.find((item: any) => item.id === clienteId);
    setFormData((prev) => cliente ? ({
      ...prev,
      cliente_id: clienteId,
      tomador_cnpj: cliente.cpf_cnpj || "",
      tomador_razao_social: cliente.nome || "",
      tomador_email: cliente.email || "",
      tomador_endereco: cliente.endereco || cliente.endereco_completo || "",
      tomador_cidade: cliente.cidade || "",
      tomador_uf: cliente.estado || "SP",
      tomador_cep: cliente.cep || "",
    }) : ({ ...prev, cliente_id: clienteId }));
  }, [clientes]);

  const updateItem = useCallback((index: number, field: keyof ItemNota, value: any) => {
    setFormData((prev) => {
      const itens = [...prev.itens];
      itens[index] = { ...itens[index], [field]: value };
      if (field === "quantidade" || field === "valor_unitario") {
        itens[index].valor_total = +((itens[index].quantidade || 0) * (itens[index].valor_unitario || 0)).toFixed(2);
      }
      return { ...prev, itens, valor_servicos: itens.reduce((sum, item) => sum + (item.valor_total || 0), 0) };
    });
  }, []);

  const addItem = useCallback(() => setFormData((prev) => ({ ...prev, itens: [...prev.itens, { ...INITIAL_ITEM }] })), []);
  const removeItem = useCallback((index: number) => setFormData((prev) => {
    if (prev.itens.length === 1) return prev;
    const itens = prev.itens.filter((_, itemIndex) => itemIndex !== index);
    return { ...prev, itens, valor_servicos: itens.reduce((sum, item) => sum + (item.valor_total || 0), 0) };
  }), []);

  const recalcularTributos = useCallback(() => {
    const valor = Number(formData.valor_servicos) || 0;
    const deducoes = Number(formData.valor_deducoes) || 0;
    const baseCalculo = valor - deducoes;
    const valorIss = +(baseCalculo * ((Number(formData.aliquota_iss) || 0) / 100)).toFixed(2);
    const valorPis = +(valor * 0.0065).toFixed(2);
    const valorCofins = +(valor * 0.03).toFixed(2);
    const valorIr = +(valor * 0.015).toFixed(2);
    const valorCsll = +(valor * 0.01).toFixed(2);
    const valorInss = Number(formData.valor_inss) || 0;
    const valorLiquido = +(valor - (formData.iss_retido ? valorIss : 0) - valorPis - valorCofins - valorIr - valorCsll - valorInss).toFixed(2);
    setFormData((prev) => ({ ...prev, base_calculo: baseCalculo, valor_iss: valorIss, valor_pis: valorPis, valor_cofins: valorCofins, valor_ir: valorIr, valor_csll: valorCsll, valor_liquido: valorLiquido }));
    toast.success("Tributos recalculados");
  }, [formData]);

  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    if (mode === "view") return;

    const schemaValidation = notaFiscalSchema.safeParse({
      ...formData,
      numero: formData.numero || "",
      serie: formData.serie || "",
      cliente_id: formData.cliente_id || "",
      data_emissao: formData.data_emissao,
      vencimento: formData.vencimento,
      valor_servicos: Number(formData.valor_servicos) || 0,
      valor_deducoes: Number(formData.valor_deducoes) || 0,
      base_calculo: Number(formData.base_calculo) || 0,
      aliquota_iss: Number(formData.aliquota_iss) || 0,
      valor_iss: Number(formData.valor_iss) || 0,
      valor_pis: Number(formData.valor_pis) || 0,
      valor_cofins: Number(formData.valor_cofins) || 0,
      valor_inss: Number(formData.valor_inss) || 0,
      valor_ir: Number(formData.valor_ir) || 0,
      valor_csll: Number(formData.valor_csll) || 0,
      valor_liquido: Number(formData.valor_liquido) || 0,
    });
    if (!schemaValidation.success) {
      toast.error(schemaValidation.error.errors[0]?.message || "Preencha os campos obrigatórios");
      return;
    }

    const errors = validateNfForm(formData);
    setValidationErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast.error(Object.values(errors)[0] as string);
      return;
    }

    const valorServicos = Number(formData.valor_servicos) || 0;
    const data = {
      numero: formData.numero.trim(),
      serie: formData.serie?.trim() || null,
      tipo_nota: formData.tipo_nota,
      cliente_id: formData.cliente_id || null,
      venda_id: null,
      valor: valorServicos,
      data_emissao: formData.data_emissao ? format(formData.data_emissao, "yyyy-MM-dd") : null,
      vencimento: formData.vencimento ? format(formData.vencimento, "yyyy-MM-dd") : null,
      status: formData.status,
      url_pdf: formData.url_pdf || null,
      observacoes: serializeTipoOperacao(tipoOperacao, formData.observacoes?.trim() || "") || null,
      natureza_operacao: formData.natureza_operacao,
      codigo_servico_municipal: formData.codigo_servico_municipal,
      codigo_municipio: formData.codigo_municipio,
      cfop: formData.cfop,
      descricao_servicos: formData.descricao_servicos,
      tomador_cnpj: formData.tomador_cnpj,
      tomador_razao_social: formData.tomador_razao_social,
      tomador_inscricao_estadual: formData.tomador_inscricao_estadual,
      tomador_inscricao_municipal: formData.tomador_inscricao_municipal || null,
      tomador_email: formData.tomador_email,
      tomador_endereco: formData.tomador_endereco,
      tomador_cidade: formData.tomador_cidade,
      tomador_uf: formData.tomador_uf,
      tomador_cep: formData.tomador_cep,
      valor_servicos: valorServicos,
      valor_deducoes: Number(formData.valor_deducoes) || 0,
      base_calculo: Number(formData.base_calculo) || 0,
      aliquota_iss: Number(formData.aliquota_iss) || 0,
      valor_iss: Number(formData.valor_iss) || 0,
      iss_retido: Boolean(formData.iss_retido),
      valor_pis: Number(formData.valor_pis) || 0,
      valor_cofins: Number(formData.valor_cofins) || 0,
      valor_inss: Number(formData.valor_inss) || 0,
      valor_ir: Number(formData.valor_ir) || 0,
      valor_csll: Number(formData.valor_csll) || 0,
      valor_liquido: numberValue(formData.valor_liquido, formData.valor_servicos) ?? 0,
      forma_pagamento: formData.forma_pagamento,
      condicao_pagamento: formData.condicao_pagamento,
      itens: formData.itens,
    };

    if (mode === "create") addNotaFiscal.mutate(data, { onSuccess: onClose });
    else updateNotaFiscal.mutate({ id: notaFiscal.id, ...data }, { onSuccess: onClose });
  }, [formData, mode, tipoOperacao, notaFiscal, onClose, addNotaFiscal, updateNotaFiscal]);

  return {
    formData,
    tipoOperacao,
    rules,
    validationErrors,
    isViewMode,
    isSubmitting,
    setTipoOperacao,
    updateField,
    handleClienteChange,
    updateItem,
    addItem,
    removeItem,
    recalcularTributos,
    handleSubmit,
    clientes,
    companySettings,
  };
}
