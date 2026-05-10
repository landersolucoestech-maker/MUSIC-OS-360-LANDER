export interface Campanha {
  id: string;
  user_id?: string;
  nome: string;
  artista_id?: string | null;
  status?: string | null;
  tipo?: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  orcamento?: number | null;
  gasto?: number | null;
  impressoes?: number | null;
  cliques?: number | null;
  conversoes?: number | null;
  observacoes?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export type CampanhaInsert = Omit<Campanha, "id" | "user_id" | "created_at" | "updated_at">;
export type CampanhaUpdate = Partial<CampanhaInsert>;

export interface CampanhaWithRelations extends Campanha {
  artistas?: { id: string; nome_artistico?: string; [key: string]: unknown } | null;
}

export interface Conteudo {
  id: string;
  user_id?: string;
  titulo?: string | null;
  tipo_conteudo?: string[] | string | null;
  descricao?: string | null;
  formato?: string[] | string | null;
  plataforma?: string[] | string | null;
  status?: string | null;
  campanha_relacionada?: string | null;
  lancamento_id?: string | null;
  legenda?: string | null;
  horario_publicacao?: string | null;
  data_publicacao?: string | null;
  url?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export type ConteudoInsert = Omit<Conteudo, "id" | "user_id" | "created_at" | "updated_at">;
export type ConteudoUpdate = Partial<ConteudoInsert>;

export interface ConteudoWithRelations extends Conteudo {
  lancamentos?: {
    id: string;
    titulo?: string;
    artistas?: { id: string; nome_artistico?: string; [key: string]: unknown } | null;
    [key: string]: unknown;
  } | null;
}

export interface Meta {
  id: string;
  user_id?: string;
  artista_id?: string | null;
  tipo_meta?: string | null;
  descricao?: string | null;
  valor_meta: number;
  valor_atual: number;
  unidade?: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  status?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export type MetaInsert = Omit<Meta, "id" | "user_id" | "created_at" | "updated_at">;
export type MetaUpdate = Partial<MetaInsert>;

export interface MetaWithRelations extends Meta {
  artistas?: { id: string; nome_artistico?: string; [key: string]: unknown } | null;
}
