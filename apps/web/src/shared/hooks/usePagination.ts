import { useEffect, useMemo, useState } from "react";

/**
 * Hook de paginação client-side padrão do sistema.
 * Mantém página/itens-por-página e devolve o recorte atual.
 * Reinicia para a primeira página quando o total muda (ex.: filtros).
 */
export function usePagination<T>(items: T[], initialPageSize = 10) {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages - 1);

  // Volta à primeira página quando o conjunto de dados encolhe abaixo da página atual.
  useEffect(() => {
    if (page > totalPages - 1) setPage(0);
  }, [page, totalPages]);

  const pageItems = useMemo(
    () => items.slice(safePage * pageSize, safePage * pageSize + pageSize),
    [items, safePage, pageSize],
  );

  return {
    page: safePage,
    pageSize,
    total,
    totalPages,
    pageItems,
    setPage,
    setPageSize: (size: number) => {
      setPageSize(size);
      setPage(0);
    },
  };
}
