export interface Transacao {
  id: string;
  user_id?: string;
  descricao: string;
  tipo: string;
  categoria?: string | null;
  valor: number;
  data: string;
  status?: string | null;
  artista_id?: string | null;
  cliente_id?: string | null;
  venda_id?: string | null;
  origem?: string | null;
  observacoes?: string | null;
  conciliado?: boolean | null;
  anexo_url?: string | null;
  forma_pagamento?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export type TransacaoInsert = Omit<Transacao, "id" | "user_id" | "created_at" | "updated_at" | keyof { [key: string]: unknown }>;
export type TransacaoUpdate = Partial<TransacaoInsert>;

export interface TransacaoWithRelations extends Transacao {
  artistas?: { id: string; nome_artistico?: string; [key: string]: unknown } | null;
  clientes?: { id: string; nome?: string; [key: string]: unknown } | null;
  vendas?: { id: string; [key: string]: unknown } | null;
}

export interface NotaFiscal {
  id: string;
  user_id?: string;
  numero?: string | null;
  serie?: string | null;
  tipo_nota?: string | null;
  status?: string | null;
  tomador_nome?: string | null;
  tomador_cnpj?: string | null;
  valor_total?: number | null;
  valor_servicos?: number | null;
  valor_iss?: number | null;
  data_emissao?: string | null;
  data_vencimento?: string | null;
  descricao_servico?: string | null;
  cliente_id?: string | null;
  venda_id?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export type NotaFiscalInsert = Omit<NotaFiscal, "id" | "user_id" | "created_at" | "updated_at">;
export type NotaFiscalUpdate = Partial<NotaFiscalInsert>;

export interface NotaFiscalWithRelations extends NotaFiscal {
  clientes?: { id: string; nome?: string; [key: string]: unknown } | null;
  vendas?: { id: string; [key: string]: unknown } | null;
}
