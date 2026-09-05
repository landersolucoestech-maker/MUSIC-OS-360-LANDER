import { QUERY_KEYS } from "@/shared/lib/query-config";
import { useDataQuery } from "@/shared/hooks/useDataQuery";
import type {
  Projeto,
  ProjetoInsert,
  ProjetoUpdate,
  ProjetoObraSummary,
  ProjetoWithRelations,
  ProjetoWithRelationsExtended,
} from "../types/projetos.types";

export type { Projeto, ProjetoInsert, ProjetoUpdate, ProjetoObraSummary, ProjetoWithRelations, ProjetoWithRelationsExtended };

export function useProjetos(enabled = true, artistId?: string) {
  const result = useDataQuery<ProjetoWithRelations>({
    queryKey: artistId ? [...QUERY_KEYS.PROJETOS, "by-artist", artistId] : [...QUERY_KEYS.PROJETOS],
    table: "projetos",
    select: "*, artistas(*), obras(id, titulo, status)",
    enabled,
    // QueryProjectDto só aceita "artistId" (Task H alinhou DTO/service nesse nome) —
    // "artist_id" era rejeitado pelo whitelist do ValidationPipe (400), quebrando
    // a aba Projetos do modal Visão 360° do artista.
    filters: artistId ? { artistId: artistId } : undefined,
  }, {
    create: { success: "Projeto criado com sucesso!", error: "Erro ao criar projeto" },
    update: { success: "Projeto atualizado com sucesso!", error: "Erro ao atualizar projeto" },
    delete: { success: "Projeto excluído com sucesso!", error: "Erro ao excluir projeto" },
  });

  return {
    projetos: result.data,
    isLoading: result.isLoading,
    error: result.error,
    refetch: result.refetch,
    addProjeto: result.create,
    updateProjeto: result.update,
    deleteProjeto: result.delete,
  };
}
