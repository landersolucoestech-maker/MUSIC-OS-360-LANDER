import type { Json } from "@/shared/types/database";
import type { ArtistaRef, ProjetoRef } from "@/shared/types/refs";
import type { ObraStatus, ObraTipo, FonogramaStatus } from "@/shared/types/enums";

export type { ObraStatus, ObraTipo, FonogramaStatus };

export interface Obra {
  id: string;
  user_id?: string;
  titulo: string;
  compositor?: string | null;
  compositores?: string | string[] | null;
  letristas?: string | string[] | null;
  co_compositores?: string | null;
  detentores?: string | null;
  editora?: string | null;
  isrc?: string | null;
  iswc?: string | null;
  cod_abramus?: string | null;
  cod_ecad?: string | null;
  tipo?: ObraTipo | string | null;
  genero?: string | null;
  status?: ObraStatus | string | null;
  duracao?: string | null;
  origem_externa?: string | null;
  origem_externa_id?: string | null;
  origem_externa_sincronizado_em?: string | null;
  projeto_id?: string | null;
  artista_id?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export type ObraInsert = Omit<Obra, "id" | "user_id" | "created_at" | "updated_at">;
export type ObraUpdate = Partial<ObraInsert>;

export interface ObraWithRelations extends Obra {
  artistas?: ArtistaRef | null;
  projetos?: ProjetoRef | null;
}

export interface Fonograma {
  id: string;
  user_id?: string;
  titulo?: string | null;
  obra_id?: string | null;
  artista_id?: string | null;
  isrc?: string | null;
  duracao?: string | null;
  tipo?: string | null;
  status?: FonogramaStatus | string | null;
  compositores?: string | null;
  interpretes?: string | null;
  produtores?: string | null;
  gravadora?: string | null;
  agregadora?: string | null;
  cod_abramus?: string | null;
  cod_ecad?: string | null;
  isrc_pais?: string | null;
  isrc_registrante?: string | null;
  isrc_ano?: string | null;
  isrc_designacao?: string | null;
  criada_por_ia?: boolean | null;
  emissao?: string | null;
  gravacao_original?: string | null;
  data_lancamento?: string | null;
  data_registro?: string | null;
  duracao_min?: string | number | null;
  duracao_seg?: string | number | null;
  instrumental?: boolean | null;
  genero_musical?: string | null;
  classificacao?: string | null;
  midia?: string | null;
  nacional?: boolean | null;
  pub_simultanea?: boolean | null;
  pais_origem?: string | null;
  pais_publicacao?: string | null;
  observacoes?: string | null;
  arquivo_audio?: Json | null;
  participacao?: unknown;
  origem_externa?: string | null;
  origem_externa_id?: string | null;
  origem_externa_sincronizado_em?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export type FonogramaInsert = Omit<Fonograma, "id" | "user_id" | "created_at" | "updated_at">;
export type FonogramaUpdate = Partial<FonogramaInsert>;

export interface FonogramaWithRelations extends Fonograma {
  artistas?: ArtistaRef | null;
}

