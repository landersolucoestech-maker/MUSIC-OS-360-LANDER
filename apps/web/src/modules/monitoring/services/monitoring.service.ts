import { storage } from "@/shared/lib/storage";

export const monitoringService = {
  async listAlerts() { return storage.list("monitoramentos"); },
  async findAlert(id: string) { return storage.findById("monitoramentos", id); },
  async updateAlert(id: string, data: Record<string, unknown>) {
    return storage.update("monitoramentos", id, data);
  },

  async listTakedowns() { return storage.list("takedowns"); },
  async findTakedown(id: string) { return storage.findById("takedowns", id); },
  async createTakedown(data: Record<string, unknown>) {
    return storage.create("takedowns", data as never);
  },
  async updateTakedown(id: string, data: Record<string, unknown>) {
    return storage.update("takedowns", id, data);
  },

  async listEcadReports() { return storage.list("ecad_reports"); },
  async findEcadReport(id: string) { return storage.findById("ecad_reports", id); },

  async listContentDetections() { return storage.list("content_detections"); },
};
