import { storage } from "@/shared/lib/storage";

export const projectsService = {
  async list() { return storage.list("projetos"); },
  async findById(id: string) { return storage.findById("projetos", id); },
  async create(data: Record<string, unknown>) { return storage.create("projetos", data as never); },
  async update(id: string, data: Record<string, unknown>) { return storage.update("projetos", id, data); },
  async delete(id: string) { return storage.delete("projetos", id); },
  async listByStatus(status: string) {
    return storage.list("projetos", { filters: { status } });
  },
  async listByArtist(artistId: string) {
    return storage.list("projetos", { filters: { artista_id: artistId } });
  },
};
