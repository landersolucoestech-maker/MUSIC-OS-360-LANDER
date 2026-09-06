import type {
  FuncionarioStatus,
  FuncionarioTipoContrato,
  FeriasAusenciaTipo,
  FeriasAusenciaStatus,
} from "@/shared/types/enums";

export type { FuncionarioStatus, FuncionarioTipoContrato, FeriasAusenciaTipo, FeriasAusenciaStatus };

export interface Funcionario {
  id: string;
  user_id?: string;
  nome: string;
  cargo?: string | null;
  departamento?: string | null;
  salario?: number | string | null;
  tipo_contrato?: FuncionarioTipoContrato | string | null;
  data_admissao?: string | null;
  status?: FuncionarioStatus | string | null;
  vinculo_usuario_id?: string | null;
  email?: string | null;
  telefone?: string | null;
  cpf?: string | null;
  observacoes?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export type FuncionarioInsert = Omit<Funcionario, "id" | "user_id" | "created_at" | "updated_at">;
export type FuncionarioUpdate = Partial<FuncionarioInsert>;

export interface FolhaPagamento {
  id: string;
  user_id?: string;
  funcionario_id?: string | null;
  periodo?: string | null;
  mes_referencia?: string | null;
  salario_bruto?: number | null;
  descontos?: number | null;
  bonus?: number | null;
  salario_liquido?: number | null;
  data_pagamento?: string | null;
  status?: string | null;
  observacoes?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export type FolhaPagamentoInsert = Omit<FolhaPagamento, "id" | "user_id" | "created_at" | "updated_at">;
export type FolhaPagamentoUpdate = Partial<FolhaPagamentoInsert>;

export interface FeriasAusencia {
  id: string;
  user_id?: string;
  funcionario_id?: string | null;
  type?: FeriasAusenciaTipo | string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  dias_totais?: number | null;
  status?: FeriasAusenciaStatus | string | null;
  motivo?: string | null;
  observacoes?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export type FeriasAusenciaInsert = Omit<FeriasAusencia, "id" | "user_id" | "created_at" | "updated_at">;
export type FeriasAusenciaUpdate = Partial<FeriasAusenciaInsert>;

export interface DocumentoFuncionario {
  id: string;
  user_id?: string;
  funcionario_id?: string | null;
  tipo_documento?: string | null;
  nome_arquivo?: string | null;
  url_arquivo?: string | null;
  descricao?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export type DocumentoFuncionarioInsert = Omit<DocumentoFuncionario, "id" | "user_id" | "created_at" | "updated_at">;
export type DocumentoFuncionarioUpdate = Partial<DocumentoFuncionarioInsert>;
