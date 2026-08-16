import { storage, type PagedListOptions } from "@/shared/lib/storage";

export interface FetchAllPagesOptions extends Omit<PagedListOptions, "page" | "pageSize"> {
  /** Registros por página durante a coleta. Default: 200 (limite máximo do backend). */
  pageSize?: number;
  /** Teto de segurança — nunca busca infinitamente. Default: 5000. */
  maxRecords?: number;
}

export interface FetchAllPagesResult<T> {
  items: T[];
  /** Total real do backend (pode ser maior que items.length se truncado pelo maxRecords). */
  total: number;
  /** true quando o teto de segurança foi atingido antes de cobrir `total`. */
  truncated: boolean;
}

/**
 * Task I — coleta TODOS os registros que casam com os filtros atuais, via
 * paginação iterativa server-side (nunca um único `limit` fixo maior).
 * Substitui o padrão "exportar a lista já carregada na tela" (que herdava o
 * limit=50 default do backend quando ninguém pedia paginação) por uma
 * varredura completa e explícita, respeitando os filtros ativos.
 *
 * `maxRecords` é um teto de SEGURANÇA (evita um export runaway em tenants
 * absurdamente grandes), não uma solução de paginação — quando atingido,
 * `truncated: true` avisa o chamador para alertar o usuário, nunca corta
 * silenciosamente.
 */
export async function fetchAllPages<T extends object>(
  table: string,
  options: FetchAllPagesOptions = {},
): Promise<FetchAllPagesResult<T>> {
  const { pageSize = 200, maxRecords = 5000, ...rest } = options;
  const items: T[] = [];
  let page = 1;
  let total = Infinity;

  while (items.length < total && items.length < maxRecords) {
    const result = await storage.listPaged<T & { id: string }>(table, { ...rest, page, pageSize });
    total = result.total;
    if (result.items.length === 0) break;
    items.push(...result.items);
    page += 1;
  }

  const truncated = items.length > maxRecords || items.length < total;
  return { items: items.slice(0, maxRecords), total, truncated };
}
