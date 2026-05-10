export interface Evento {
  id: string;
  user_id?: string;
  titulo: string;
  tipo_evento?: string | null;
  status?: string | null;
  artista_id?: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  horario_inicio?: string | null;
  horario_fim?: string | null;
  local?: string | null;
  cidade?: string | null;
  estado?: string | null;
  valor_cache?: number | null;
  valor_ingresso?: number | null;
  capacidade?: number | null;
  descricao?: string | null;
  observacoes?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export type EventoInsert = Omit<Evento, "id" | "user_id" | "created_at" | "updated_at">;
export type EventoUpdate = Partial<EventoInsert>;

export interface EventoWithRelations extends Evento {
  artistas?: { id: string; nome_artistico?: string; [key: string]: unknown } | null;
}
