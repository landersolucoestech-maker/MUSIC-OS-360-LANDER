/**
 * releases/services/releases.service.ts
 * Service layer do módulo de lançamentos musicais.
 */
import { storage } from "@/shared/lib/storage";
import type { Lancamento, LancamentoInsert, LancamentoUpdate } from "../hooks/useLancamentos";

export const lancamentoService = {
  async list(): Promise<Lancamento[]> {
    return (await storage.list<Lancamento & { id: string }>("lancamentos", {
      orderBy: { column: "data_lancamento", ascending: false },
    })) as Lancamento[];
  },
  async findById(id: string): Promise<Lancamento | undefined> {
    return (await storage.findById<Lancamento & { id: string }>("lancamentos", id)) as Lancamento | undefined;
  },
  async create(data: LancamentoInsert): Promise<Lancamento> {
    return (await storage.create<Lancamento & { id: string }>(
      "lancamentos",
      data as Omit<Lancamento & { id: string }, "id" | "user_id" | "created_at" | "updated_at">,
    )) as Lancamento;
  },
  async update(id: string, data: LancamentoUpdate): Promise<Lancamento> {
    return (await storage.update<Lancamento & { id: string }>(
      "lancamentos", id,
      data as Partial<Lancamento & { id: string }>,
    )) as Lancamento;
  },
  async delete(id: string): Promise<void> {
    await storage.delete("lancamentos", id);
  },
};
