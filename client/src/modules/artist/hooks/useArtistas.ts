import { QUERY_KEYS } from "@/shared/lib/query-config";
import { useDataQuery } from "@/shared/hooks/useDataQuery";
import type {
  Artista,
  ArtistaInsert,
  ArtistaUpdate,
  ArtistaRelacionamento,
  ArtistaDistribuidoraEntry,
  ArtistaResponsavel,
} from "../types/artista.types";

export type {
  Artista,
  ArtistaInsert,
  ArtistaUpdate,
  ArtistaRelacionamento,
  ArtistaDistribuidoraEntry,
  ArtistaResponsavel,
};

export function useArtistas() {
  const result = useDataQuery<Artista>({
    queryKey: [...QUERY_KEYS.ARTISTAS],
    table: "artistas",
  }, {
    create: { success: "Artista criado com sucesso!", error: "Erro ao criar artista" },
    update: { success: "Artista atualizado com sucesso!", error: "Erro ao atualizar artista" },
    delete: { success: "Artista excluído com sucesso!", error: "Erro ao excluir artista" },
  });

  return {
    artistas: result.data,
    isLoading: result.isLoading,
    error: result.error,
    addArtista: result.create,
    updateArtista: result.update,
    deleteArtista: result.delete,
  };
}
