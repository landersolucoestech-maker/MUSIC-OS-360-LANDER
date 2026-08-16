import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/shared/lib/query-config";
import { usePaginatedDataQuery } from "@/shared/hooks/usePaginatedDataQuery";
import { api } from "@/shared/lib/api-client";
import type { Funcionario } from "./useFuncionarios";
import type { FolhaPagamento } from "./useFolhaPagamento";
import type { FeriasAusencia } from "./useFeriasAusencias";

export interface UseFuncionariosPaginatedParams {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
  setor?: string;
  enabled?: boolean;
}

export function useFuncionariosPaginated({ page, pageSize, search, status, setor, enabled = true }: UseFuncionariosPaginatedParams) {
  const filters: Record<string, unknown> = {};
  if (status) filters.status = status;
  if (setor) filters.setor = setor;

  const result = usePaginatedDataQuery<Funcionario>({
    queryKey: [...QUERY_KEYS.FUNCIONARIOS],
    table: "funcionarios",
    page: page + 1,
    pageSize,
    search,
    filters,
    enabled,
  });

  return {
    funcionarios: result.items,
    total: result.total,
    totalPages: result.totalPages,
    isLoading: result.isLoading,
    isFetching: result.isFetching,
    error: result.error,
    refetch: result.refetch,
  };
}

export interface FuncionarioStats {
  total: number;
  byGroup: Record<string, number>;
}

const EMPTY_FUNCIONARIO_STATS: FuncionarioStats = { total: 0, byGroup: {} };

/** GET /hr/employees/stats — contagem exata por status, tenant inteiro (Task H). */
export function useFuncionariosStats() {
  const query = useQuery<FuncionarioStats>({
    queryKey: [...QUERY_KEYS.FUNCIONARIOS, "stats"],
    queryFn: ({ signal }) => api.get<FuncionarioStats>("/hr/employees/stats", { signal }),
    staleTime: 30_000,
  });
  return { stats: query.data ?? EMPTY_FUNCIONARIO_STATS, isLoading: query.isLoading, error: query.error };
}

export interface UseFolhaPaginatedParams {
  page: number;
  pageSize: number;
  search?: string;
  competencia?: string;
  status?: string;
  enabled?: boolean;
}

export function useFolhaPaginated({ page, pageSize, search, competencia, status, enabled = true }: UseFolhaPaginatedParams) {
  const filters: Record<string, unknown> = {};
  if (competencia) filters.competencia = competencia;
  if (status) filters.status = status;

  const result = usePaginatedDataQuery<FolhaPagamento>({
    queryKey: [...QUERY_KEYS.FOLHA_PAGAMENTO],
    table: "folha_pagamento",
    page: page + 1,
    pageSize,
    search,
    filters,
    enabled,
  });

  return {
    folhaPagamento: result.items,
    total: result.total,
    totalPages: result.totalPages,
    isLoading: result.isLoading,
    isFetching: result.isFetching,
    error: result.error,
    refetch: result.refetch,
  };
}

export interface UseFeriasPaginatedParams {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
  enabled?: boolean;
}

export function useFeriasPaginated({ page, pageSize, search, status, enabled = true }: UseFeriasPaginatedParams) {
  const filters: Record<string, unknown> = {};
  if (status) filters.status = status;

  const result = usePaginatedDataQuery<FeriasAusencia>({
    queryKey: [...QUERY_KEYS.FERIAS_AUSENCIAS],
    table: "ferias_ausencias",
    page: page + 1,
    pageSize,
    search,
    filters,
    enabled,
  });

  return {
    feriasAusencias: result.items,
    total: result.total,
    totalPages: result.totalPages,
    isLoading: result.isLoading,
    isFetching: result.isFetching,
    error: result.error,
    refetch: result.refetch,
  };
}
