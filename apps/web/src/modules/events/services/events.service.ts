import { storage } from "@/shared/lib/storage";

export const eventService = {
  async list() {
    return storage.list("eventos", { orderBy: { column: "data_inicio", ascending: true } });
  },
  async findById(id: string) { return storage.findById("eventos", id); },
  async create(data: Record<string, unknown>) { return storage.create("eventos", data as never); },
  async update(id: string, data: Record<string, unknown>) { return storage.update("eventos", id, data); },
  async delete(id: string) { return storage.delete("eventos", id); },
  async listByStatus(status: string) {
    return storage.list("eventos", { filters: { status } });
  },
};
