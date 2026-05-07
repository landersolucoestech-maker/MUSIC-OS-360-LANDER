/**
 * Service layer do módulo rh.
 * Gerencia funcionários, folha de pagamento, férias/ausências e documentos.
 */
import { storage } from "@/shared/lib/storage";
import type {
  Funcionario,
  FuncionarioInsert,
  FuncionarioUpdate,
  FeriasAusencia,
  FeriasAusenciaInsert,
  FeriasAusenciaUpdate,
  DocumentoFuncionario,
  DocumentoFuncionarioInsert,
  DocumentoFuncionarioUpdate,
} from "../types";

export const funcionarioService = {
  async list(): Promise<Funcionario[]> {
    return (await storage.list<Funcionario & { id: string }>("funcionarios")) as Funcionario[];
  },

  async findById(id: string): Promise<Funcionario | undefined> {
    return (await storage.findById<Funcionario & { id: string }>("funcionarios", id)) as Funcionario | undefined;
  },

  async create(data: FuncionarioInsert): Promise<Funcionario> {
    return (await storage.create<Funcionario & { id: string }>(
      "funcionarios",
      data as Omit<Funcionario & { id: string }, "id" | "user_id" | "created_at" | "updated_at">,
    )) as Funcionario;
  },

  async update(id: string, data: FuncionarioUpdate): Promise<Funcionario> {
    return (await storage.update<Funcionario & { id: string }>(
      "funcionarios",
      id,
      data as Partial<Funcionario & { id: string }>,
    )) as Funcionario;
  },

  async delete(id: string): Promise<void> {
    await storage.delete("funcionarios", id);
  },
};

export const feriasAusenciaService = {
  async list(): Promise<FeriasAusencia[]> {
    return (await storage.list<FeriasAusencia & { id: string }>("ferias_ausencias")) as FeriasAusencia[];
  },

  async findByFuncionario(funcionarioId: string): Promise<FeriasAusencia[]> {
    return (await storage.list<FeriasAusencia & { id: string }>("ferias_ausencias", {
      filters: { funcionario_id: funcionarioId },
    })) as FeriasAusencia[];
  },

  async create(data: FeriasAusenciaInsert): Promise<FeriasAusencia> {
    return (await storage.create<FeriasAusencia & { id: string }>(
      "ferias_ausencias",
      data as Omit<FeriasAusencia & { id: string }, "id" | "user_id" | "created_at" | "updated_at">,
    )) as FeriasAusencia;
  },

  async update(id: string, data: FeriasAusenciaUpdate): Promise<FeriasAusencia> {
    return (await storage.update<FeriasAusencia & { id: string }>(
      "ferias_ausencias",
      id,
      data as Partial<FeriasAusencia & { id: string }>,
    )) as FeriasAusencia;
  },

  async delete(id: string): Promise<void> {
    await storage.delete("ferias_ausencias", id);
  },
};

export const documentoFuncionarioService = {
  async listByFuncionario(funcionarioId: string): Promise<DocumentoFuncionario[]> {
    return (await storage.list<DocumentoFuncionario & { id: string }>("documentos_funcionario", {
      filters: { funcionario_id: funcionarioId },
    })) as DocumentoFuncionario[];
  },

  async create(data: DocumentoFuncionarioInsert): Promise<DocumentoFuncionario> {
    return (await storage.create<DocumentoFuncionario & { id: string }>(
      "documentos_funcionario",
      data as Omit<DocumentoFuncionario & { id: string }, "id" | "user_id" | "created_at" | "updated_at">,
    )) as DocumentoFuncionario;
  },

  async update(id: string, data: DocumentoFuncionarioUpdate): Promise<DocumentoFuncionario> {
    return (await storage.update<DocumentoFuncionario & { id: string }>(
      "documentos_funcionario",
      id,
      data as Partial<DocumentoFuncionario & { id: string }>,
    )) as DocumentoFuncionario;
  },

  async delete(id: string): Promise<void> {
    await storage.delete("documentos_funcionario", id);
  },
};

export type FolhaPagamento = {
  id: string;
  user_id?: string;
  funcionario_id?: string | null;
  mes_referencia?: string | null;
  salario_base?: number | null;
  descontos?: number | null;
  beneficios?: number | null;
  valor_liquido?: number | null;
  status?: string | null;
  observacoes?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
};

export const folhaPagamentoService = {
  async list(): Promise<FolhaPagamento[]> {
    return (await storage.list<FolhaPagamento & { id: string }>("folha_pagamento")) as FolhaPagamento[];
  },

  async listByFuncionario(funcionarioId: string): Promise<FolhaPagamento[]> {
    return (await storage.list<FolhaPagamento & { id: string }>("folha_pagamento", {
      filters: { funcionario_id: funcionarioId },
    })) as FolhaPagamento[];
  },

  async create(data: Omit<FolhaPagamento, "id" | "user_id" | "created_at" | "updated_at">): Promise<FolhaPagamento> {
    return (await storage.create<FolhaPagamento & { id: string }>(
      "folha_pagamento",
      data as Omit<FolhaPagamento & { id: string }, "id" | "user_id" | "created_at" | "updated_at">,
    )) as FolhaPagamento;
  },

  async update(id: string, data: Partial<FolhaPagamento>): Promise<FolhaPagamento> {
    return (await storage.update<FolhaPagamento & { id: string }>(
      "folha_pagamento",
      id,
      data as Partial<FolhaPagamento & { id: string }>,
    )) as FolhaPagamento;
  },

  async delete(id: string): Promise<void> {
    await storage.delete("folha_pagamento", id);
  },
};
