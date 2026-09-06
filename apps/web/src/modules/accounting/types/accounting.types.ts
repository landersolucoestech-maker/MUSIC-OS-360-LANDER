import type { ArtistaRef, ClienteRef } from "@/shared/types/refs";
import type {
  TransacaoTipo,
  TransacaoStatus,
  TransacaoFormaPagamento,
  NotaFiscalStatus,
  NotaFiscalTipo,
} from "@/shared/types/enums";

export type { TransacaoTipo, TransacaoStatus, TransacaoFormaPagamento, NotaFiscalStatus, NotaFiscalTipo };

/** Entidades gerenciais elegíveis para vínculo de um lançamento (rastreabilidade P&L). */
export type TransactionEntityType =
  | "projeto"
  | "artista"
  | "empresa"
  | "campanha"
  | "evento";

/**
 * Vínculo gerencial de um lançamento financeiro a uma entidade do sistema.
 * Suporta múltiplos vínculos por lançamento, com rateio percentual opcional.
 */
export interface TransactionEntityLink {
  entityType: TransactionEntityType;
  entityId: string;
  entityName: string;
  /** Percentual de rateio (0–100). Quando há múltiplos vínculos, a soma deve ser 100. */
  allocationPercent?: number;
}

export interface Transacao {
  id: string;
  user_id?: string;
  descricao: string;
  type: TransacaoTipo | string;
  categoria?: string | null;
  valor: number;
  data: string;
  status?: TransacaoStatus | string | null;
  artist_id?: string | null;
  client_id?: string | null;
  venda_id?: string | null;
  /** Vínculos gerenciais obrigatórios para consolidação no P&L (≥1). */
  entityLinks?: TransactionEntityLink[];
  origem?: string | null;
  observacoes?: string | null;
  conciliado?: boolean | null;
  anexo_url?: string | null;
  forma_pagamento?: TransacaoFormaPagamento | string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export type TransacaoInsert = Omit<Transacao, "id" | "user_id" | "created_at" | "updated_at" | keyof { [key: string]: unknown }>;
export type TransacaoUpdate = Partial<TransacaoInsert>;

export interface TransacaoWithRelations extends Transacao {
  artistas?: ArtistaRef | null;
  clientes?: ClienteRef | null;
}

export interface NotaFiscal {
  id: string;
  user_id?: string;
  numero?: string | null;
  serie?: string | null;
  tipo_nota?: NotaFiscalTipo | string | null;
  status?: NotaFiscalStatus | string | null;
  tomador_nome?: string | null;
  tomador_cnpj?: string | null;
  valor_total?: number | null;
  valor_servicos?: number | null;
  valor_iss?: number | null;
  data_emissao?: string | null;
  data_vencimento?: string | null;
  descricao_servico?: string | null;
  client_id?: string | null;
  venda_id?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export type NotaFiscalInsert = Omit<NotaFiscal, "id" | "user_id" | "created_at" | "updated_at">;
export type NotaFiscalUpdate = Partial<NotaFiscalInsert>;

export interface NotaFiscalWithRelations extends NotaFiscal {
  clientes?: ClienteRef | null;
}

