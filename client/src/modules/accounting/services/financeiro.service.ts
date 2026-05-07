/**
 * financeiro/services/financeiro.service.ts
 * Service layer do módulo Financeiro Operacional.
 * Gerencia transações e notas fiscais.
 */
import { storage } from "@/shared/lib/storage";
import type {
  Transacao,
  TransacaoInsert,
  TransacaoUpdate,
} from "../hooks/useTransacoes";

export const transacaoService = {
  async list(): Promise<Transacao[]> {
    return (await storage.list<Transacao & { id: string }>("transacoes", {
      orderBy: { column: "data", ascending: false },
    })) as Transacao[];
  },

  async findById(id: string): Promise<Transacao | undefined> {
    return (await storage.findById<Transacao & { id: string }>("transacoes", id)) as Transacao | undefined;
  },

  async findByArtista(artistaId: string): Promise<Transacao[]> {
    return (await storage.list<Transacao & { id: string }>("transacoes", {
      filters: { artista_id: artistaId },
      orderBy: { column: "data", ascending: false },
    })) as Transacao[];
  },

  async create(data: TransacaoInsert): Promise<Transacao> {
    return (await storage.create<Transacao & { id: string }>(
      "transacoes",
      data as Omit<Transacao & { id: string }, "id" | "user_id" | "created_at" | "updated_at">,
    )) as Transacao;
  },

  async update(id: string, data: TransacaoUpdate): Promise<Transacao> {
    return (await storage.update<Transacao & { id: string }>(
      "transacoes",
      id,
      data as Partial<Transacao & { id: string }>,
    )) as Transacao;
  },

  async delete(id: string): Promise<void> {
    await storage.delete("transacoes", id);
  },
};

export type NotaFiscal = {
  id: string;
  user_id?: string;
  numero?: string | null;
  artista_id?: string | null;
  cliente_id?: string | null;
  valor?: number | null;
  data_emissao?: string | null;
  data_vencimento?: string | null;
  status?: string | null;
  descricao?: string | null;
  observacoes?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
};

export const notaFiscalService = {
  async list(): Promise<NotaFiscal[]> {
    return (await storage.list<NotaFiscal & { id: string }>("notas_fiscais")) as NotaFiscal[];
  },

  async create(data: Omit<NotaFiscal, "id" | "user_id" | "created_at" | "updated_at">): Promise<NotaFiscal> {
    return (await storage.create<NotaFiscal & { id: string }>(
      "notas_fiscais",
      data as Omit<NotaFiscal & { id: string }, "id" | "user_id" | "created_at" | "updated_at">,
    )) as NotaFiscal;
  },

  async update(id: string, data: Partial<NotaFiscal>): Promise<NotaFiscal> {
    return (await storage.update<NotaFiscal & { id: string }>(
      "notas_fiscais",
      id,
      data as Partial<NotaFiscal & { id: string }>,
    )) as NotaFiscal;
  },

  async delete(id: string): Promise<void> {
    await storage.delete("notas_fiscais", id);
  },
};
