import type { ArtistaRef, ObraRef } from "@/shared/types/refs";
import type { ProjetoStatus, ProjetoTipo } from "@/shared/types/enums";

export type { ProjetoStatus, ProjetoTipo };

export interface Projeto {
  id: string;
  user_id?: string;
  title: string;
  tipo?: ProjetoTipo | string | null;
  status?: ProjetoStatus | string | null;
  artist_id?: string | null;
  orcamento?: number | null;
  descricao?: string | null;
  genero?: string | null;
  observacoes?: string | null;
  /** Faixas em desenvolvimento — normalizadas em project_tracks (migration 20260718000013). */
  musicas?: import("../utils/musica-helpers").MusicaData[];
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export type ProjetoInsert = Omit<Projeto, "id" | "user_id" | "created_at" | "updated_at">;
export type ProjetoUpdate = Partial<ProjetoInsert>;

export interface ProjetoObraSummary extends ObraRef {
  status?: string | null;
}

export interface ProjetoWithRelations extends Projeto {
  artistas?: ArtistaRef | null;
  obras?: ProjetoObraSummary[] | null;
}

export interface ProjetoWithRelationsExtended extends ProjetoWithRelations {
  total_obras?: number;
  obras_concluidas?: number;
  compositor?: string | null;
  interprete?: string | null;
  editora?: string | null;
  progresso?: number | null;
  gasto?: number | null;
  nome?: string | null;
  data_prevista_fim?: string | null;
}

