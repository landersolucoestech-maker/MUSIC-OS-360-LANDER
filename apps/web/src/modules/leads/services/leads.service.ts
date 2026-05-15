import { storage } from "@/shared/lib/storage";

export const leadsService = {
  async list() {
    return storage.list("leads", { orderBy: { column: "created_at", ascending: false } });
  },
  async findById(id: string) { return storage.findById("leads", id); },
  async create(data: Record<string, unknown>) { return storage.create("leads", data as never); },
  async update(id: string, data: Record<string, unknown>) { return storage.update("leads", id, data); },
  async delete(id: string) { return storage.delete("leads", id); },
  async listByStatus(status: string) {
    return storage.list("leads", { filters: { status_lead: status } });
  },
  async listInteractions(leadId: string) {
    return storage.list("lead_interactions", {
      filters: { lead_id: leadId },
      orderBy: { column: "data_interacao", ascending: false },
    });
  },
  async createInteraction(data: Record<string, unknown>) {
    return storage.create("lead_interactions", data as never);
  },
};
