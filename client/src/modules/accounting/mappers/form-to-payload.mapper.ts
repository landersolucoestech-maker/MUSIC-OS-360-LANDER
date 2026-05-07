/**
 * financeiro/mappers/form-to-payload.mapper.ts
 * Form field values → DB/API payload. Source of truth for Transacao persistence.
 */

import type { TransacaoFormData } from "@/shared/lib/transacao-constants";

export function formToTransacaoPayload(f: TransacaoFormData): Record<string, unknown> {
  const str = (v: string): string | null => v.trim() || null;
  const num = (v: string): number | null => {
    const n = parseFloat(v.replace(",", "."));
    return isNaN(n) ? null : n;
  };
  return {
    tipo_transacao:          str(f.tipoTransacao),
    tipoTransacao:           str(f.tipoTransacao),
    tipo_cliente:            str(f.tipoCliente),
    tipoCliente:             str(f.tipoCliente),
    categoria:               str(f.categoria),
    subcategoria:            str(f.subcategoria),
    descricao:               str(f.descricao),
    valor:                   num(f.valor),
    data_transacao:          str(f.dataTransacao),
    dataTransacao:           str(f.dataTransacao),
    status:                  str(f.status) ?? "pendente",
    observacao:              str(f.observacao),
    artista_id:              str(f.artistaVinculado),
    artistaVinculado:        str(f.artistaVinculado),
    projeto_id:              str(f.projetoVinculado),
    projetoVinculado:        str(f.projetoVinculado),
    contrato_id:             str(f.contratoVinculado),
    evento_id:               str(f.eventoVinculado),
    fornecedor_cliente:      str(f.fornecedorCliente),
    orgao_arrecadador:       str(f.orgaoArrecadador),
    item_investimento:       str(f.itemInvestimento),
    motivo_viagem:           str(f.motivoViagem),
    nome_publicidade:        str(f.nomePublicidade),
    forma_pagamento:         str(f.formaPagamento),
    tipo_pagamento:          str(f.tipoPagamento),
    quantidade_parcelas:     str(f.quantidadeParcelas) ? parseInt(f.quantidadeParcelas, 10) : null,
    intervalo_parcelas:      str(f.intervaloParcelas),
    data_primeira_parcela:   str(f.dataPrimeiraParcela),
    anexo_url:               str(f.anexoUrl),
    anexo_nome:              str(f.anexoNome),
  };
}
