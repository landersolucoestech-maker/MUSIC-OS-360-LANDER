import { storage } from "@/shared/lib/storage";

export const licensingService = {
  async list() { return storage.list("licencas"); },
  async findById(id: string) { return storage.findById("licencas", id); },
  async create(data: Record<string, unknown>) { return storage.create("licencas", data as never); },
  async update(id: string, data: Record<string, unknown>) { return storage.update("licencas", id, data); },
  async delete(id: string) { return storage.delete("licencas", id); },
  async listByStatus(status: string) {
    return storage.list("licencas", { filters: { status } });
  },
  async listByArtist(artistId: string) {
    return storage.list("licencas", { filters: { artista_id: artistId } });
  },
  async listFinancialRules() { return storage.list("regras_financeiras"); },
};
