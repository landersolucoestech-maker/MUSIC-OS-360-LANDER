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
 * NÃO cobre recebimentos externos de direitos de artistas (apenas categoria de transacção).
 *
 * Uso:
 *   import { transacaoMapper } from "@/modules/integrations/mappers";
 *   const transacao = transacaoMapper.fromOfxEntry(ofxEntry);
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
  projectId?:  string;
  artistId?:  string;
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
   * Calcula o saldo líquido de uma lista de transacções.
   * revenue - expenses = net profit (âmbito Accounting; sem cálculo de recebimentos externos de direitos).
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
