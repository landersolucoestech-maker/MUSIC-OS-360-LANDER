/**
 * common/dto/paginated-response.dto.ts
 *
 * Helper para construir respostas paginadas no formato:
 * { data: T[], meta: { total, offset, limit, hasMore }, timestamp }
 *
 * Compatível com TransformInterceptor — preserva { data, meta } sem re-envolver.
 */

export interface PaginationMeta {
  total:   number;
  offset:  number;
  limit:   number;
  hasMore: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export function paginated<T>(
  items:  T[],
  total:  number,
  offset: number,
  limit:  number,
): PaginatedResponse<T> {
  return {
    data: items,
    meta: {
      total,
      offset,
      limit,
      hasMore: offset + items.length < total,
    },
  };
}
