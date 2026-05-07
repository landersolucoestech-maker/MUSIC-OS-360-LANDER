/**
 * Regras de negócio do domínio Financeiro Operacional.
 */

export const TIPO_TRANSACAO = {
  RECEITA: "receita",
  DESPESA: "despesa",
} as const;

export const CATEGORIAS_RECEITA = [
  "Royalties",
  "Show",
  "Licenciamento",
  "Distribuição Digital",
  "Publicidade",
  "Patrocínio",
  "Venda de Álbum",
  "Streaming",
  "Outros",
] as const;

export const CATEGORIAS_DESPESA = [
  "Produção Musical",
  "Marketing",
  "Distribuição",
  "Jurídico",
  "Administrativo",
  "Equipamento",
  "Viagem",
  "Pessoal",
  "Software",
  "Outros",
] as const;

export const STATUS_TRANSACAO = [
  "pendente",
  "pago",
  "cancelado",
  "atrasado",
] as const;

export const STATUS_NOTA_FISCAL = [
  "rascunho",
  "emitida",
  "cancelada",
  "vencida",
] as const;

/** Calcula o resultado líquido (receitas - despesas) de um array de transações. */
export function calcularResultado(
  transacoes: Array<{ tipo: string; valor: number }>,
): { receitas: number; despesas: number; resultado: number } {
  const receitas = transacoes
    .filter((t) => t.tipo === TIPO_TRANSACAO.RECEITA)
    .reduce((sum, t) => sum + (t.valor || 0), 0);

  const despesas = transacoes
    .filter((t) => t.tipo === TIPO_TRANSACAO.DESPESA)
    .reduce((sum, t) => sum + (t.valor || 0), 0);

  return { receitas, despesas, resultado: receitas - despesas };
}

/** Formata um valor monetário em BRL. */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}
