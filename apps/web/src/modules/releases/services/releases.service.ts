import { storage } from "@/shared/lib/storage";

export const releasesService = {
  async listReleases() { return storage.list("lancamentos"); },
  async findRelease(id: string) { return storage.findById("lancamentos", id); },
  async createRelease(data: Record<string, unknown>) { return storage.create("lancamentos", data as never); },
  async updateRelease(id: string, data: Record<string, unknown>) {
    return storage.update("lancamentos", id, data);
  },
  async deleteRelease(id: string) { return storage.delete("lancamentos", id); },
  async listByArtist(artistId: string) {
    return storage.list("lancamentos", { filters: { artist_id: artistId } });
  },
  async listByStatus(status: string) {
    return storage.list("lancamentos", { filters: { status } });
  },

  async listShares() { return storage.list("shares"); },
  async findShare(id: string) { return storage.findById("shares", id); },
  async createShare(data: Record<string, unknown>) { return storage.create("shares", data as never); },
  async updateShare(id: string, data: Record<string, unknown>) {
    return storage.update("shares", id, data);
  },
  async deleteShare(id: string) { return storage.delete("shares", id); },
};

