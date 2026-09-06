import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/shared/lib/api-client";
import { MARKETING_QUERY_ROOT } from "./useMarketingResource";
import type {
  CreateMetaInput,
  Meta,
  MetaTipo,
  UpdateMetaInput,
} from "../types/marketing.types";

const QUERY_KEY = [MARKETING_QUERY_ROOT, "metas"] as const;
type ApiList<T> = T[] | { data: T[] };
type GoalRow = Record<string, any>;

function listRows<T>(value: ApiList<T>): T[] {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray(value.data)) return value.data;
  throw new Error("[marketing] resposta inválida da API de metas");
}

function progress(current: number, target: number): number {
  return target > 0 ? Math.min(100, Math.round(current / target * 100)) : 0;
}

function normalizeType(value?: string): MetaTipo {
  const allowed: MetaTipo[] = [
    "seguidores", "streams", "shows", "receita",
    "engajamento", "lancamentos", "personalizada",
  ];
  return allowed.includes(value as MetaTipo) ? value as MetaTipo : "personalizada";
}

function fromApi(row: GoalRow): Meta {
  const meta = row.metadata ?? {};
  const target = Number(row.meta_valor ?? 0);
  const current = Number(row.valor_atual ?? 0);
  return {
    id: row.id,
    nome: row.title,
    title: row.title,
    descricao: meta.descricao ?? "",
    type: normalizeType(row.type),
    tipo_meta: row.type,
    categoria: meta.categoria ?? "",
    valorAlvo: target,
    valor_meta: target,
    valorAtual: current,
    valor_atual: current,
    unidade: meta.unidade ?? "",
    prazo: row.data_fim ? String(row.data_fim).slice(0, 10) : "",
    data_inicio: row.data_inicio,
    data_fim: row.data_fim,
    artist_id: row.artist_id,
    status: row.status,
    progresso: progress(current, target),
    responsavel: meta.responsavel ?? "",
    cor: meta.cor ?? "#6366f1",
    icone: meta.icone ?? "target",
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

function toApi(input: CreateMetaInput) {
  if (!input.artist_id) {
    throw new Error("[marketing] artist_id é obrigatório para persistir uma meta");
  }
  const target = Number(input.valorAlvo ?? input.valor_meta ?? 0);
  const current = Number(input.valorAtual ?? input.valor_atual ?? 0);
  return {
    artist_id: String(input.artist_id),
    title: input.title ?? input.nome ?? "Meta",
    type: input.tipo_meta ?? input.type ?? "personalizada",
    meta_valor: String(target),
    valor_atual: String(current),
    status: input.status ?? "em_andamento",
    data_inicio: input.data_inicio ?? undefined,
    data_fim: input.data_fim ?? input.prazo ?? undefined,
    metadata: {
      descricao: input.descricao,
      categoria: input.categoria,
      unidade: input.unidade,
      responsavel: input.responsavel,
      cor: input.cor,
      icone: input.icone,
    },
  };
}

export function getProgressPercent(meta: Pick<Meta, "valorAtual" | "valorAlvo"> & {
  valor_atual?: number;
  valor_meta?: number;
}): number {
  return progress(
    Number(meta.valorAtual ?? meta.valor_atual ?? 0),
    Number(meta.valorAlvo ?? meta.valor_meta ?? 0),
  );
}

const EMPTY_METAS: Meta[] = [];

export function useMetas(enabled = true, artistId?: string) {
  const createMeta = useCreateMeta();
  const updateMetaMutation = useUpdateMeta();
  const deleteMetaMutation = useDeleteMeta();
  const query = useQuery({
    queryKey: artistId ? [...QUERY_KEY, "by-artist", artistId] : QUERY_KEY,
    queryFn: async ({ signal }) => listRows(await api.get<ApiList<GoalRow>>(
      `/artist-goals?limit=100${artistId ? `&artist_id=${encodeURIComponent(artistId)}` : ""}`,
      { signal },
    )).map(fromApi),
    enabled,
  });
  return {
    metas: query.data ?? EMPTY_METAS,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    addMeta: createMeta.mutateAsync,
    updateMeta: updateMetaMutation.mutateAsync,
    deleteMeta: deleteMetaMutation.mutateAsync,
    getProgressPercent,
  };
}

export function useCreateMeta() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateMetaInput) => fromApi(await api.post<GoalRow>("/artist-goals", toApi(input))),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Meta criada com sucesso");
    },
    onError: () => toast.error("Erro ao criar meta"),
  });
}

export function useUpdateMeta() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateMetaInput) => {
      const current = await api.get<GoalRow>(`/artist-goals/${id}`);
      const merged: CreateMetaInput = {
        nome: current.title,
        title: current.title,
        descricao: current.metadata?.descricao ?? "",
        type: current.type,
        categoria: current.metadata?.categoria ?? "",
        valorAlvo: Number(current.meta_valor ?? 0),
        valorAtual: Number(current.valor_atual ?? 0),
        unidade: current.metadata?.unidade ?? "",
        artist_id: current.artist_id,
        status: current.status,
        data_inicio: current.data_inicio,
        data_fim: current.data_fim,
        ...input,
      };
      return fromApi(await api.patch<GoalRow>(`/artist-goals/${id}`, toApi(merged)));
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Meta atualizada");
    },
    onError: () => toast.error("Erro ao atualizar meta"),
  });
}

export function useDeleteMeta() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/artist-goals/${id}`);
      return { id };
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Meta removida");
    },
    onError: () => toast.error("Erro ao remover meta"),
  });
}
