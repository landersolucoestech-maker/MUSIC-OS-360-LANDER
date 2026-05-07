import { QUERY_KEYS } from "@/shared/lib/query-config";
import { useDataQuery } from "@/shared/hooks/useDataQuery";

export interface Artista {
  id: string;
  user_id?: string;
  nome_artistico: string;
  nome_civil?: string | null;
  nome?: string | null;
  tipo?: string | null;
  status?: string | null;
  status_cadastro?: string | null;
  genero_musical?: string | null;
  email?: string | null;
  telefone?: string | null;
  cpf_cnpj?: string | null;
  foto_url?: string | null;
  observacoes?: string | null;
  contrato_id?: string | null;
  // plataformas de streaming
  spotify_artist_id?: string | null;
  spotify_ouvintes?: number | null;
  youtube_channel_id?: string | null;
  youtube_inscritos?: number | null;
  deezer_url?: string | null;
  deezer_fas?: number | null;
  apple_music_url?: string | null;
  apple_music_albuns?: number | null;
  soundcloud_url?: string | null;
  soundcloud_seguidores?: number | null;
  // redes sociais
  instagram?: string | null;
  instagram_seguidores?: number | null;
  facebook?: string | null;
  tiktok?: string | null;
  tiktok_seguidores?: number | null;
  twitter?: string | null;
  website?: string | null;
  tipo_pessoa?: string | null;
  // dados pessoais extras
  data_nascimento?: string | null;
  rg?: string | null;
  endereco?: string | null;
  // dados bancários
  banco?: string | null;
  agencia?: string | null;
  conta?: string | null;
  chave_pix?: string | null;
  titular_conta?: string | null;
  // especialidades / função
  especialidades?: string[] | null;
  // tipo de perfil
  tipo_perfil?: string | null;
  empresario_id?: string | null;
  empresario_nome?: string | null;
  empresario_telefone?: string | null;
  empresario_email?: string | null;
  gravadora_id?: string | null;
  gravadora_nome?: string | null;
  gravadora_telefone?: string | null;
  gravadora_email?: string | null;
  gravadora_responsavel_id?: string | null;
  gravadora_responsavel_nome?: string | null;
  gravadora_responsavel_telefone?: string | null;
  gravadora_responsavel_email?: string | null;
  // distribuidoras
  distribuidoras_selecionadas?: Record<string, boolean> | null;
  distribuidoras_emails?: Record<string, string> | null;
  // documentos / presskit
  documentos_pessoais_url?: string | null;
  presskit_url?: string | null;
  // notas internas (separado de observacoes/biografia)
  notas_internas?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export type ArtistaInsert = Omit<Artista, "id" | "user_id" | "created_at" | "updated_at">;
export type ArtistaUpdate = Partial<ArtistaInsert>;

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
