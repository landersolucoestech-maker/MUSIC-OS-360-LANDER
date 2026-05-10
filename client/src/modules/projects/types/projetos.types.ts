export interface Projeto {
  id: string;
  user_id?: string;
  titulo: string;
  tipo?: string | null;
  status?: string | null;
  artista_id?: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  orcamento?: number | null;
  descricao?: string | null;
  genero?: string | null;
  observacoes?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export type ProjetoInsert = Omit<Projeto, "id" | "user_id" | "created_at" | "updated_at">;
export type ProjetoUpdate = Partial<ProjetoInsert>;

export interface ProjetoObraSummary {
  id: string;
  titulo?: string;
  status?: string | null;
  [key: string]: unknown;
}

export interface ProjetoWithRelations extends Projeto {
  artistas?: { id: string; nome_artistico?: string; [key: string]: unknown } | null;
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
