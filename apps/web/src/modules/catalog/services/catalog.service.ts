import { storage } from "@/shared/lib/storage";

export const catalogService = {
  async listWorks() {
    return storage.list("obras");
  },

  async getWork(id: string) {
    return storage.findById("obras", id);
  },

  async createWork(data: Record<string, unknown>) {
    return storage.create("obras", data as never);
  },

  async updateWork(id: string, patch: Record<string, unknown>) {
    return storage.update("obras", id, patch);
  },

  async deleteWork(id: string) {
    return storage.delete("obras", id);
  },

  async listPhonograms() {
    return storage.list("fonogramas");
  },

  async getPhonogram(id: string) {
    return storage.findById("fonogramas", id);
  },

  async createPhonogram(data: Record<string, unknown>) {
    return storage.create("fonogramas", data as never);
  },

  async updatePhonogram(id: string, patch: Record<string, unknown>) {
    return storage.update("fonogramas", id, patch);
  },

  async deletePhonogram(id: string) {
    return storage.delete("fonogramas", id);
  },

  async searchWorks(q: string) {
    const all = await storage.list<{ id: string; title: string }>("obras");
    const lower = q.toLowerCase();
    return all.filter((w) => (w.title ?? "").toLowerCase().includes(lower));
  },
};
