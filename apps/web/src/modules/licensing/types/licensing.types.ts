import type { ClienteRef } from "@/shared/types/refs";
import type { LicencaTipo, LicencaStatus } from "@/shared/types/enums";

export type { LicencaTipo, LicencaStatus };

export interface Licenca {
  id: string;
  user_id?: string;
  titulo: string;
  obra_id?: string | null;
  cliente_id?: string | null;
  tipo?: LicencaTipo | string | null;
  tipo_uso?: string | null;
  status?: LicencaStatus | string | null;
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
  clientes?: ClienteRef | null;
}
