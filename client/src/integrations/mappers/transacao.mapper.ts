/**
 * integrations/mappers/transacao.mapper.ts
 *
 * Mapper entre a entidade de domínio Transação (mockData/accounting)
 * e DTOs externos (OFX import, relatórios, conciliação).
 *
 * REGRA: este mapper é a ÚNICA fonte de verdade para a transformação
 * Transação ↔ DTOs externos. Nenhum componente ou hook faz transformação inline.
 *
 * Âmbito: Accounting module (revenue - expenses = net profit).
 * NÃO cobre royalties de artistas (apenas categoria de transacção).
 *
 * Uso:
 *   import { transacaoMapper } from "@/integrations/mappers";
 *   const transacao = transacaoMapper.fromOfxEntry(ofxEntry);
 *   const row       = transacaoMapper.toCsvRow(transacao);
 */

/** Entidade de domínio Transação (fonte: mockData accounting). */
export interface TransacaoEntity {
  id:          string;
  tipo:        "receita" | "despesa";
  categoria:   string;
  descricao:   string;
  valor:       number;
  data:        string;
  status:      "pendente" | "conciliado" | "cancelado";
  referencia?: string;
  projetoId?:  string;
  artistaId?:  string;
  tags?:       string[];
  createdAt:   string;
  updatedAt:   string;
}

/** Linha de entrada OFX (pós-parse). */
export interface OfxEntry {
  TRNTYPE:  "CREDIT" | "DEBIT" | "INT" | "DIV" | "FEE" | "SRVCHG" | "DEP";
  DTPOSTED: string; // YYYYMMDD
  TRNAMT:   number;
  FITID:    string;
  MEMO:     string;
}

/** Linha CSV para export de relatório. */
export interface TransacaoCsvRow {
  id:         string;
  data:       string;
  tipo:       string;
  categoria:  string;
  descricao:  string;
  valor:      string;
  status:     string;
  referencia: string;
}

export const transacaoMapper = {
  /**
   * Converte uma entrada OFX num objecto TransacaoEntity (sem id/timestamps).
   * O id e timestamps são gerados pelo storage layer ao persistir.
   */
  fromOfxEntry(entry: OfxEntry): Omit<TransacaoEntity, "id" | "createdAt" | "updatedAt"> {
    const rawDate = entry.DTPOSTED;
    const data    = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;

    return {
      tipo:        entry.TRNAMT >= 0 ? "receita" : "despesa",
      categoria:   "importado",
      descricao:   entry.MEMO,
      valor:       Math.abs(entry.TRNAMT),
      data,
      status:      "pendente",
      referencia:  entry.FITID,
    };
  },

  /**
   * Converte uma TransacaoEntity numa linha CSV para export.
   */
  toCsvRow(t: TransacaoEntity): TransacaoCsvRow {
    return {
      id:         t.id,
      data:       t.data,
      tipo:       t.tipo,
      categoria:  t.categoria,
      descricao:  t.descricao,
      valor:      t.tipo === "despesa" ? `-${t.valor.toFixed(2)}` : t.valor.toFixed(2),
      status:     t.status,
      referencia: t.referencia ?? "",
    };
  },

  /**
   * Calcula o saldo líquido de uma lista de transacções.
   * revenue - expenses = net profit (âmbito Accounting; sem cálculo de royalties).
   */
  calcNetProfit(transacoes: TransacaoEntity[]): number {
    return transacoes.reduce((acc, t) => {
      const signed = t.tipo === "receita" ? t.valor : -t.valor;
      return acc + signed;
    }, 0);
  },

  /**
   * Agrupa transacções por categoria para P&L.
   */
  groupByCategoria(transacoes: TransacaoEntity[]): Record<string, TransacaoEntity[]> {
    return transacoes.reduce<Record<string, TransacaoEntity[]>>((acc, t) => {
      if (!acc[t.categoria]) acc[t.categoria] = [];
      acc[t.categoria].push(t);
      return acc;
    }, {});
  },
};
