/**
 * STEP 3 — Domain Entity: Contabilidade
 *
 * Encapsula toda a lógica de negócio de P&L, recoupment e fechamento.
 * Extraída de Contabilidade.tsx onde vivia inline.
 *
 * Invariants:
 * - margem é sempre entre -100% e +Infinity
 * - progresso de recoupment é sempre [0, 100]
 * - saldo nunca é negativo (capped a zero)
 */

export interface TransacaoMinima {
  id: string;
  tipo: string;
  valor?: number | null;
  artista_id?: string | null;
  projeto_id?: string | null;
  data?: string | null;
}

export interface ContratoMinimo {
  id: string;
  titulo?: string | null;
  artista_id?: string | null;
  valor?: number | null;
  data_inicio?: string | null;
}

export interface PLResult {
  receitas: number;
  despesas: number;
  lucro: number;
  margem: string;
}

export interface RecoupmentResult {
  id: string;
  artista: string;
  contrato: string;
  adiantamento: number;
  recoupado: number;
  saldo: number;
  progresso: number;
}

/** Calcula P&L para um conjunto de transações filtradas. */
export function calcularPL(transacoes: TransacaoMinima[]): PLResult {
  const receitas = transacoes
    .filter((t) => t.tipo === "receita")
    .reduce((acc, t) => acc + (t.valor || 0), 0);
  const despesas = transacoes
    .filter((t) => t.tipo === "despesa")
    .reduce((acc, t) => acc + (t.valor || 0), 0);
  const lucro = receitas - despesas;
  const margem =
    receitas > 0 ? ((lucro / receitas) * 100).toFixed(1) + "%" : "—";
  return { receitas, despesas, lucro, margem };
}

/** Calcula P&L agrupado por projeto. */
export function calcularPLPorProjeto(
  projetos: Array<{ id: string; titulo?: string | null; tipo?: string | null }>,
  transacoes: TransacaoMinima[],
): Array<PLResult & { id: string; projeto: string; tipo: string | null }> {
  return projetos
    .map((p) => {
      const txs = transacoes.filter((t) => t.projeto_id === p.id);
      const pl = calcularPL(txs);
      return {
        id: p.id,
        projeto: p.titulo ?? p.id,
        tipo: p.tipo ?? null,
        ...pl,
      };
    })
    .filter((p) => p.receitas > 0 || p.despesas > 0);
}

/** Calcula P&L agrupado por artista. */
export function calcularPLPorArtista(
  artistas: Array<{
    id: string;
    nome_artistico?: string | null;
    nome?: string | null;
  }>,
  transacoes: TransacaoMinima[],
): Array<PLResult & { id: string; artista: string }> {
  return artistas
    .map((a) => {
      const txs = transacoes.filter((t) => t.artista_id === a.id);
      const pl = calcularPL(txs);
      return {
        id: a.id,
        artista: a.nome_artistico || a.nome || a.id,
        ...pl,
      };
    })
    .filter((a) => a.receitas > 0 || a.despesas > 0);
}

/**
 * Calcula o recoupment por contrato.
 *
 * Regra de negócio:
 * - adiantamento = valor do contrato
 * - recoupado = soma das receitas do artista desde data_inicio do contrato
 * - saldo = max(0, adiantamento - recoupado)
 * - progresso = min(100, recoupado/adiantamento * 100)
 */
export function calcularRecoupments(
  contratos: ContratoMinimo[],
  artistas: Array<{
    id: string;
    nome_artistico?: string | null;
    nome?: string | null;
  }>,
  transacoes: TransacaoMinima[],
): RecoupmentResult[] {
  return contratos
    .filter((c) => c.artista_id && (c.valor || 0) > 0)
    .map((c) => {
      const artista = artistas.find((a) => a.id === c.artista_id);
      const adiantamento = c.valor || 0;
      const recoupado = transacoes
        .filter(
          (t) =>
            t.artista_id === c.artista_id &&
            t.tipo === "receita" &&
            (c.data_inicio ? (t.data ?? "") >= c.data_inicio : true),
        )
        .reduce((acc, t) => acc + (t.valor || 0), 0);
      const recoupadoCap = Math.min(recoupado, adiantamento);
      const saldo = Math.max(0, adiantamento - recoupado);
      const progresso =
        adiantamento > 0
          ? Math.min(100, Math.round((recoupado / adiantamento) * 100))
          : 0;
      return {
        id: c.id,
        artista:
          artista?.nome_artistico || artista?.nome || c.titulo || c.id,
        contrato: c.titulo ?? c.id,
        adiantamento,
        recoupado: recoupadoCap,
        saldo,
        progresso,
      };
    });
}
