import { storage } from "@/shared/lib/storage";

export const accountingService = {
  async listTransactions() {
    return storage.list("transacoes", { orderBy: { column: "data", ascending: false } });
  },

  async getTransaction(id: string) {
    return storage.findById("transacoes", id);
  },

  async createTransaction(data: Record<string, unknown>) {
    return storage.create("transacoes", data as never);
  },

  async updateTransaction(id: string, patch: Record<string, unknown>) {
    return storage.update("transacoes", id, patch);
  },

  async deleteTransaction(id: string) {
    return storage.delete("transacoes", id);
  },

  async listByPeriod(start: string, end: string) {
    const all = await storage.list<{ id: string; data: string }>("transacoes");
    return all.filter((t) => t.data >= start && t.data <= end);
  },

  async getSummary() {
    const list = await storage.list<{ id: string; tipo: string; valor: number }>("transacoes");
    const receitas = list.filter((t) => t.tipo === "receita").reduce((s, t) => s + (t.valor ?? 0), 0);
    const despesas = list.filter((t) => t.tipo === "despesa").reduce((s, t) => s + (t.valor ?? 0), 0);
    return { receitas, despesas, saldo: receitas - despesas, total: list.length };
  },

  async listNotasFiscais() {
    return storage.list("notas_fiscais");
  },

  async getNotaFiscal(id: string) {
    return storage.findById("notas_fiscais", id);
  },

  async createNotaFiscal(data: Record<string, unknown>) {
    return storage.create("notas_fiscais", data as never);
  },

  async updateNotaFiscal(id: string, patch: Record<string, unknown>) {
    return storage.update("notas_fiscais", id, patch);
  },
};
