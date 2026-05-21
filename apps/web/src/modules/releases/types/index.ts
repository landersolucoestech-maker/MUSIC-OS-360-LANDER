import type { ArtistaRef, ObraRef } from "@/shared/types/refs";
import type { LancamentoStatus, LancamentoTipo, ShareStatus, ShareTipo, ShareDirecao } from "@/shared/types/enums";

export type { LancamentoStatus, LancamentoTipo, ShareStatus, ShareTipo, ShareDirecao };

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
  tipo?: LancamentoTipo | string | null;
  status?: LancamentoStatus | string | null;
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
  // Campos adicionais presentes no mock e formulário
  genero?: string | null;
  idioma?: string | null;
  gravadora?: string | null;
  copyright?: string | null;
  obra_id?: string | null;
  fonograma_id?: string | null;
  codigo_upc?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export type LancamentoInsert = Omit<Lancamento, "id" | "user_id" | "created_at" | "updated_at">;
export type LancamentoUpdate = Partial<LancamentoInsert>;

export interface LancamentoWithRelations extends Lancamento {
  artistas?: ArtistaRef | null;
}

export interface Share {
  id: string;
  user_id?: string;
  obra_id?: string | null;
  artista_id?: string | null;
  percentual?: number | null;
  tipo?: ShareTipo | string | null;
  direcao?: ShareDirecao | string | null;
  status?: ShareStatus | string | null;
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
  obras?: ObraRef | null;
  artistas?: ArtistaRef | null;
}

export interface ShareHistoricoEntry {
  data: string;
  acao: string;
  usuario?: string | null;
  observacao?: string | null;
  valor_anterior?: number | null;
  valor_novo?: number | null;
  versao?: string | null;
  percentual?: number | null;
  descricao?: string | null;
  autor?: string | null;
}
