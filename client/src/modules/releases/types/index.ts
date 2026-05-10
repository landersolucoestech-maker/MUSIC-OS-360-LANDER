export interface LancamentoAssets {
  audio_master_url?: string | null;
  capa_url?: string | null;
  video_clipe_url?: string | null;
  letra?: string | null;
  ficha_tecnica?: string | null;
  press_release?: string | null;
  epk_url?: string | null;
  [key: string]: string | null | undefined;
}

export interface LancamentoCronograma {
  data_gravacao?: string | null;
  data_mix_master?: string | null;
  data_entrega_distribuidora?: string | null;
  [key: string]: string | null | undefined;
}

export interface Lancamento {
  id: string;
  user_id?: string;
  titulo: string;
  tipo?: string | null;
  status?: string | null;
  artista_id?: string | null;
  data_lancamento?: string | null;
  distribuidora?: string | null;
  plataformas?: string[] | null;
  fonograma_ids?: string[] | null;
  observacoes?: string | null;
  isrc_global?: string | null;
  upc?: string | null;
  notas_internas?: string | null;
  assets?: LancamentoAssets | null;
  cronograma?: LancamentoCronograma | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export type LancamentoInsert = Omit<Lancamento, "id" | "user_id" | "created_at" | "updated_at">;
export type LancamentoUpdate = Partial<LancamentoInsert>;

export interface LancamentoWithRelations extends Lancamento {
  artistas?: { id: string; nome_artistico?: string; [key: string]: unknown } | null;
}

export interface Share {
  id: string;
  user_id?: string;
  obra_id?: string | null;
  artista_id?: string | null;
  percentual?: number | null;
  tipo?: string | null;
  direcao?: string | null;
  status?: string | null;
  valor_total?: number | null;
  valor_liquidado?: number | null;
  detentor?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export type ShareInsert = Omit<Share, "id" | "user_id" | "created_at" | "updated_at">;
export type ShareUpdate = Partial<ShareInsert>;

export interface ShareWithRelations extends Share {
  obras?: { id: string; titulo?: string; [key: string]: unknown } | null;
  artistas?: { id: string; nome_artistico?: string; [key: string]: unknown } | null;
}
