export interface Lead {
  id: string;
  user_id?: string;
  nome: string;
  nome_contratante?: string | null;
  sobrenome?: string | null;
  nome_empresa?: string | null;
  cargo?: string | null;
  email?: string | null;
  telefone?: string | null;
  instagram?: string | null;
  website?: string | null;
  origem?: string | null;
  origem_lead?: string | null;
  campanha_marketing?: string | null;
  responsavel_id?: string | null;
  servico_interesse?: string[] | string | null;
  servicos_interesse?: string[] | null;
  descricao_demanda?: string | null;
  nome_artista_banda?: string | null;
  artista_interesse?: string | null;
  genero_musical?: string | null;
  cidade_artista?: string | null;
  estado_artista?: string | null;
  tipo_evento?: string | null;
  data_evento?: string | null;
  cidade_evento?: string | null;
  estado_evento?: string | null;
  nome_local_evento?: string | null;
  capacidade_publico?: number | null;
  valor_estimado_cache?: number | null;
  status_lead?: string | null;
  prioridade?: string | null;
  responsavel?: string | null;
  observacoes?: string | null;
  observacoes_internas?: string | null;
  tags?: string[] | null;
  tipo_lead?: string | null;
  cidade?: string | null;
  estado?: string | null;
  temperatura?: string | null;
  temperatura_lead?: string | null;
  probabilidade?: number | null;
  probabilidade_fechamento?: number | null;
  valor_estimado?: number | null;
  orcamento_estimado?: number | null;
  forma_pagamento?: string | null;
  validade_proposta?: string | null;
  metadata?: Record<string, unknown> | null;
  data_proximo_contato?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export type LeadInsert = Omit<Lead, "id" | "user_id" | "created_at" | "updated_at">;
export type LeadUpdate = Partial<LeadInsert>;

export type ClienteSegmento = "contratante" | "parceiro" | "fornecedor" | "contato";

export interface Cliente {
  id: string;
  user_id?: string;
  nome: string;
  tipo?: string | null;
  segmento?: ClienteSegmento | string | null;
  email?: string | null;
  telefone?: string | null;
  cnpj?: string | null;
  cpf?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  status?: string | null;
  observacoes?: string | null;
  temperatura?: string | null;
  responsavel?: string | null;
  empresa?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export type ClienteInsert = Omit<Cliente, "id" | "user_id" | "created_at" | "updated_at">;
export type ClienteUpdate = Partial<ClienteInsert>;

export interface LeadInteraction {
  id: string;
  user_id?: string;
  lead_id?: string | null;
  tipo_interacao?: string | null;
  descricao?: string | null;
  data_interacao?: string | null;
  created_at?: string;
  [key: string]: unknown;
}

export type LeadInteractionInsert = Omit<LeadInteraction, "id" | "user_id" | "created_at">;
