import { storage } from "@/shared/lib/storage";

export const marketingService = {
  async listCampaigns() { return storage.list("campanhas"); },
  async findCampaign(id: string) { return storage.findById("campanhas", id); },
  async createCampaign(data: Record<string, unknown>) { return storage.create("campanhas", data as never); },
  async updateCampaign(id: string, data: Record<string, unknown>) { return storage.update("campanhas", id, data); },
  async deleteCampaign(id: string) { return storage.delete("campanhas", id); },

  async listContent() { return storage.list("conteudos"); },
  async createContent(data: Record<string, unknown>) { return storage.create("conteudos", data as never); },
  async updateContent(id: string, data: Record<string, unknown>) { return storage.update("conteudos", id, data); },
  async deleteContent(id: string) { return storage.delete("conteudos", id); },

  async listBriefings() { return storage.list("briefings"); },
  async createBriefing(data: Record<string, unknown>) { return storage.create("briefings", data as never); },
  async updateBriefing(id: string, data: Record<string, unknown>) { return storage.update("briefings", id, data); },

  async listTasks() { return storage.list("tarefas_marketing"); },
  async createTask(data: Record<string, unknown>) { return storage.create("tarefas_marketing", data as never); },
  async updateTask(id: string, data: Record<string, unknown>) { return storage.update("tarefas_marketing", id, data); },
  async deleteTask(id: string) { return storage.delete("tarefas_marketing", id); },
};
