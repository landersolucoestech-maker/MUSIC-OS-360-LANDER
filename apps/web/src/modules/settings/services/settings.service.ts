import { storage } from "@/shared/lib/storage";

export const settingsService = {
  async listUsers() { return storage.list("users"); },
  async findUser(id: string) { return storage.findById("users", id); },
  async updateUser(id: string, data: Record<string, unknown>) {
    return storage.update("users", id, data);
  },

  async listIntegrations() {
    const raw = storage.getRaw<Record<string, unknown>[]>("integrations");
    return raw ?? [];
  },
  async updateIntegration(id: string, data: Record<string, unknown>) {
    return storage.update("integrations", id, data);
  },

  getCompanyProfile(): Record<string, unknown> {
    return storage.getRaw<Record<string, unknown>>("company_profile") ?? {};
  },
  saveCompanyProfile(data: Record<string, unknown>): void {
    storage.setRaw("company_profile", data);
  },

  getNotificationPrefs(): Record<string, unknown> {
    return storage.getRaw<Record<string, unknown>>("notification_prefs") ?? {};
  },
  saveNotificationPrefs(data: Record<string, unknown>): void {
    storage.setRaw("notification_prefs", data);
  },

  getOperationalLists(): Record<string, unknown>[] {
    return storage.getRaw<Record<string, unknown>[]>("operational_lists") ?? [];
  },
  saveOperationalLists(data: Record<string, unknown>[]): void {
    storage.setRaw("operational_lists", data);
  },
};
