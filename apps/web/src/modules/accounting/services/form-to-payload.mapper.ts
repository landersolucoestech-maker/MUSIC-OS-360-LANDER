/**
 * financeiro/mappers/form-to-payload.mapper.ts
 * Form field values → DB/API payload. Source of truth for Transacao persistence.
 */

import type { TransacaoFormData } from "@/modules/accounting/lib/transacao-constants";

export interface TransacaoFormPayload {
  [key: string]: string | number | null;
  tipo: string | null;
  tipo_transacao: string | null;
  tipoTransacao: string | null;
  tipo_cliente: string | null;
  tipoCliente: string | null;
  categoria: string | null;
  subcategoria: string | null;
  descricao: string | null;
  valor: number | null;
  data: string | null;
  data_transacao: string | null;
  dataTransacao: string | null;
  status: string;
  observacao: string | null;
  observacoes: string | null;
  artist_id: string | null;
  artistaVinculado: string | null;
  projeto_id: string | null;
  projetoVinculado: string | null;
  contrato_id: string | null;
  evento_id: string | null;
  fornecedor_cliente: string | null;
  orgao_arrecadador: string | null;
  centro_custo: string | null;
  competencia: string | null;
  conta_origem: string | null;
  conta_destino: string | null;
  item_investimento: string | null;
  motivo_viagem: string | null;
  nome_publicidade: string | null;
  forma_pagamento: string | null;
  tipo_pagamento: string | null;
  quantidade_parcelas: number | null;
  intervalo_parcelas: string | null;
  data_primeira_parcela: string | null;
  anexo_url: string | null;
  anexo_nome: string | null;
}

function parseMoney(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const normalized = trimmed.includes(",")
    ? trimmed.replace(/\./g, "").replace(",", ".")
    : trimmed;
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

export function formToTransacaoPayload(f: TransacaoFormData): TransacaoFormPayload {
  const str = (v: string): string | null => v.trim() || null;
  const attachmentUrl = str(f.anexoUrl);

  return {
    tipo:                    str(f.tipoTransacao),
    tipo_transacao:          str(f.tipoTransacao),
    tipoTransacao:           str(f.tipoTransacao),
    tipo_cliente:            str(f.tipoCliente),
    tipoCliente:             str(f.tipoCliente),
    categoria:               str(f.categoria),
    subcategoria:            str(f.subcategoria),
    descricao:               str(f.descricao),
    valor:                   parseMoney(f.valor),
    data:                    str(f.dataTransacao),
    data_transacao:          str(f.dataTransacao),
    dataTransacao:           str(f.dataTransacao),
    status:                  str(f.status) ?? "pendente",
    observacao:              str(f.observacao),
    observacoes:             str(f.observacao),
    artist_id:              str(f.artistaVinculado),
    artistaVinculado:        str(f.artistaVinculado),
    projeto_id:              str(f.projetoVinculado),
    projetoVinculado:        str(f.projetoVinculado),
    contrato_id:             str(f.contratoVinculado),
    evento_id:               str(f.eventoVinculado),
    fornecedor_cliente:      str(f.fornecedorCliente),
    orgao_arrecadador:       str(f.orgaoArrecadador),
    centro_custo:            str(f.centroCusto ?? ""),
    competencia:             str(f.competencia ?? ""),
    conta_origem:            str(f.contaOrigem ?? ""),
    conta_destino:           str(f.contaDestino ?? ""),
    item_investimento:       str(f.itemInvestimento),
    motivo_viagem:           str(f.motivoViagem),
    nome_publicidade:        str(f.nomePublicidade),
    forma_pagamento:         str(f.formaPagamento),
    tipo_pagamento:          str(f.tipoPagamento),
    quantidade_parcelas:     str(f.quantidadeParcelas) ? parseInt(f.quantidadeParcelas, 10) : null,
    intervalo_parcelas:      str(f.intervaloParcelas),
    data_primeira_parcela:   str(f.dataPrimeiraParcela),
    anexo_url:               attachmentUrl?.startsWith("blob:") ? null : attachmentUrl,
    anexo_nome:              str(f.anexoNome),
  };
}
