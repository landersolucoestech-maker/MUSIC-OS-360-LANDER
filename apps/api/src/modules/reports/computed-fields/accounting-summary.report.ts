/**
 * modules/reports/computed-fields/accounting-summary.report.ts  ·  Parte 89
 *
 * "Contabilidade" (Bloco 19) — relatório 100% computado: P&L por artista,
 * agregado sobre `transactions` (mesma lógica de apps/web/.../Contabilidade.tsx,
 * aba "P&L por Artista"). Sem tabela física própria, sem importação — apenas
 * exportação, com contrato explícito (ver ACCOUNTING_SUMMARY_CONTRACT).
 */
import type { DataSource } from 'typeorm';

interface AccountingSummaryRow {
  artista: string;
  receitas: number;
  despesas: number;
  resultado: number;
  margem: number;
}

export async function fetchAccountingSummaryRows(
  ds: DataSource,
  tenantId: string,
): Promise<AccountingSummaryRow[]> {
  const rows = (await ds.query(
    `SELECT
       a.nome_artistico AS artista,
       COALESCE(SUM(t.valor) FILTER (WHERE t.tipo = 'receita'), 0) AS receitas,
       COALESCE(SUM(t.valor) FILTER (WHERE t.tipo = 'despesa'), 0) AS despesas
     FROM artists a
     JOIN transactions t ON t.artista_id = a.id AND t.tenant_id = a.tenant_id
     WHERE a.tenant_id = $1 AND t.deleted_at IS NULL
     GROUP BY a.id, a.nome_artistico
     ORDER BY a.nome_artistico ASC`,
    [tenantId],
  )) as { artista: string; receitas: string; despesas: string }[];

  return rows.map((r) => {
    const receitas = Number(r.receitas);
    const despesas = Number(r.despesas);
    const resultado = receitas - despesas;
    const margem = receitas > 0 ? Number(((resultado / receitas) * 100).toFixed(2)) : 0;
    return { artista: r.artista, receitas, despesas, resultado, margem };
  });
}
