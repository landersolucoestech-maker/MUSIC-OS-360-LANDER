/**
 * financeiro/mappers/entity-to-form.mapper.ts
 * Entity → form field values. Source of truth for Transacao hydration.
 */

import { initialFormData } from "@/shared/lib/transacao-constants";
import type { TransacaoFormData } from "@/shared/lib/transacao-constants";

export function transacaoToFormFields(t: Record<string, unknown> | null | undefined): TransacaoFormData {
  if (!t) return { ...initialFormData };
  const str = (v: unknown): string => (v == null ? "" : String(v).trim());
  return {
    ...initialFormData,
    tipoTransacao:       str(t.tipoTransacao      ?? t.tipo_transacao),
    tipoCliente:         str(t.tipoCliente        ?? t.tipo_cliente),
    categoria:           str(t.categoria),
    subcategoria:        str(t.subcategoria),
    descricao:           str(t.descricao),
    valor:               str(t.valor),
    dataTransacao:       str(t.dataTransacao      ?? t.data_transacao),
    status:              str(t.status)            || "pendente",
    observacao:          str(t.observacao),
    artistaVinculado:    str(t.artistaVinculado   ?? t.artista_id),
    projetoVinculado:    str(t.projetoVinculado   ?? t.projeto_id),
    contratoVinculado:   str(t.contratoVinculado  ?? t.contrato_id),
    eventoVinculado:     str(t.eventoVinculado    ?? t.evento_id),
    fornecedorCliente:   str(t.fornecedorCliente  ?? t.fornecedor_cliente),
    orgaoArrecadador:    str(t.orgaoArrecadador   ?? t.orgao_arrecadador),
    itemInvestimento:    str(t.itemInvestimento   ?? t.item_investimento),
    motivoViagem:        str(t.motivoViagem       ?? t.motivo_viagem),
    nomePublicidade:     str(t.nomePublicidade    ?? t.nome_publicidade),
    formaPagamento:      str(t.formaPagamento     ?? t.forma_pagamento),
    tipoPagamento:       str(t.tipoPagamento      ?? t.tipo_pagamento)     || "avista",
    quantidadeParcelas:  str(t.quantidadeParcelas ?? t.quantidade_parcelas),
    intervaloParcelas:   str(t.intervaloParcelas  ?? t.intervalo_parcelas) || "mensal",
    dataPrimeiraParcela: str(t.dataPrimeiraParcela?? t.data_primeira_parcela),
    anexoUrl:            str(t.anexoUrl           ?? t.anexo_url),
    anexoNome:           str(t.anexoNome          ?? t.anexo_nome),
  };
}
