export interface Licenca {
  id: string;
  user_id?: string;
  titulo: string;
  obra_id?: string | null;
  cliente_id?: string | null;
  tipo?: string | null;
  tipo_uso?: string | null;
  status?: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  valor?: number | null;
  observacoes?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export type LicencaInsert = Omit<Licenca, "id" | "user_id" | "created_at" | "updated_at">;
export type LicencaUpdate = Partial<LicencaInsert>;

export interface LicencaWithRelations extends Licenca {
  clientes?: { id: string; nome?: string; [key: string]: unknown } | null;
}
