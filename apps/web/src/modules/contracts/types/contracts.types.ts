import type { Tables, TablesInsert, TablesUpdate } from "@/shared/types/database";
import type { ArtistaRef, ClienteRef } from "@/shared/types/refs";
import type { ContratoStatus, ContratoTipo } from "@/shared/types/enums";
import type { ContratoSigner } from "@/modules/contracts/lib/contrato-schema";

export type { ContratoStatus, ContratoTipo };

export interface ContratoVersao {
  versao: string;
  url: string;
  criado_em: string;
  notas?: string;
  autor?: string;
}

export type SigningPlatform = "autentique" | "clicksign" | "docusign";

export interface Contrato {
  id: string;
  user_id?: string;
  titulo: string;
  tipo?: ContratoTipo | string | null;
  status?: ContratoStatus | string | null;
  artista_id?: string | null;
  cliente_id?: string | null;
  lancamento_id?: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  valor?: number | null;
  exclusivo?: boolean | null;
  observacoes?: string | null;
  template_id?: string | null;
  assinado_em?: string | null;
  arquivo_url?: string | null;
  autentique_doc_id?: string | null;
  signing_platform?: SigningPlatform | null;
  versoes?: ContratoVersao[];
  signers?: ContratoSigner[];
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export type ContratoInsert = Omit<Contrato, "id" | "user_id" | "created_at" | "updated_at">;
export type ContratoUpdate = Partial<ContratoInsert>;

export interface ContratoWithRelations extends Contrato {
  artistas?: ArtistaRef | null;
  clientes?: ClienteRef | null;
}

export interface TemplateContrato {
  id: string;
  user_id?: string | null;
  nome: string;
  tipo_servico: string;
  conteudo: string;
  descricao?: string | null;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export type TemplateContratoInsert = Omit<TemplateContrato, "id" | "user_id" | "created_at" | "updated_at">;
export type TemplateContratoUpdate = Partial<TemplateContratoInsert>;
