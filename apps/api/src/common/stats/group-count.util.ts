import { SelectQueryBuilder } from 'typeorm';

export interface GroupStatsResult {
  total: number;
  byGroup: Record<string, number>;
  /** Presente apenas quando um valueColumn foi somado junto da contagem. */
  sumByGroup?: Record<string, number>;
  totalSum?: number;
}

/**
 * Conta registros agrupados por uma coluna (ex.: status), opcionalmente
 * somando uma coluna numérica no mesmo agrupamento (ex.: valor).
 *
 * Task H: elimina o padrão "baixa a tabela inteira e conta/soma no
 * cliente" — usado por todo endpoint `GET /<recurso>/stats`. `qb` já deve
 * vir com tenant_id/deleted_at/outros filtros aplicados; esta função só
 * adiciona SELECT/GROUP BY e executa.
 */
export async function groupCount<T extends object>(
  qb: SelectQueryBuilder<T>,
  alias: string,
  groupColumn: string,
  valueColumn?: string,
): Promise<GroupStatsResult> {
  qb.select(`${alias}.${groupColumn}`, 'grp').addSelect('COUNT(*)::int', 'cnt');
  if (valueColumn) qb.addSelect(`COALESCE(SUM(${alias}.${valueColumn}::numeric), 0)`, 'sum');
  qb.groupBy(`${alias}.${groupColumn}`);

  const rows = await qb.getRawMany<{ grp: string | null; cnt: string; sum?: string }>();

  const byGroup: Record<string, number> = {};
  const sumByGroup: Record<string, number> = {};
  let total = 0;
  let totalSum = 0;
  for (const r of rows) {
    const key = r.grp ?? '—';
    const cnt = parseInt(r.cnt, 10) || 0;
    byGroup[key] = cnt;
    total += cnt;
    if (valueColumn) {
      const sum = parseFloat(r.sum ?? '0') || 0;
      sumByGroup[key] = sum;
      totalSum += sum;
    }
  }

  return valueColumn
    ? { total, byGroup, sumByGroup, totalSum }
    : { total, byGroup };
}
