import { storage } from "@/shared/lib/storage";

const JSON_FIELDS = ["participants", "variables", "music_work", "signature_settings", "branding_settings"] as const;

function serializeJsonFields(data: Record<string, unknown>): Record<string, unknown> {
  const out = { ...data };
  for (const field of JSON_FIELDS) {
    if (out[field] != null && typeof out[field] !== "string") {
      out[field] = JSON.stringify(out[field]);
    }
  }
  return out;
}

export const contractsService = {
  async list() {
    return storage.list("contratos");
  },

  async getById(id: string) {
    return storage.findById("contratos", id);
  },

  async create(data: Record<string, unknown>) {
    return storage.create("contratos", data as never);
  },

  async update(id: string, patch: Record<string, unknown>) {
    return storage.update("contratos", id, patch);
  },

  async delete(id: string) {
    return storage.delete("contratos", id);
  },

  async listByStatus(status: string) {
    return storage.list("contratos", { filters: { status } });
  },

  async listExpiringSoon(days = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);
    const all = await storage.list<{ id: string; data_fim: string; status: string }>("contratos");
    return all.filter(
      (c) => c.status === "vigente" && new Date(c.data_fim) <= cutoff,
    );
  },

  async listTemplates() {
    return storage.list("contract_templates");
  },

  async getTemplate(id: string) {
    return storage.findById("contract_templates", id);
  },

  async listContractServiceTypes() {
    return storage.list("contract_service_types");
  },

  async createContractServiceType(data: Record<string, unknown>) {
    return storage.create("contract_service_types", serializeJsonFields(data) as never);
  },

  async updateContractServiceType(id: string, patch: Record<string, unknown>) {
    return storage.update(
      "contract_service_types",
      id,
      { ...serializeJsonFields(patch), updated_at: new Date().toISOString() },
    );
  },

  async archiveContractServiceType(id: string) {
    return storage.update("contract_service_types", id, { active: false, updated_at: new Date().toISOString() });
  },
};
