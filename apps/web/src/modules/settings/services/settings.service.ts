import { storage } from "@/shared/lib/storage";

/**
 * `storage.getRaw`/`setRaw` são stubs que sempre lançam (ver
 * apps/web/src/shared/lib/storage.ts) — sinalizam código nunca migrado do
 * antigo localStorage para um endpoint real. Chamadas síncronas a esses
 * métodos (ex.: dentro de `useState(() => ...)`, como em useOperationalSettings)
 * lançavam durante a montagem do componente, derrubando a árvore React inteira
 * (crash "removeChild" — reproduzido via navegador real na Parte 79, na
 * página /leads, que monta LeadFormModal/useOperationalSettings mesmo fechado).
 *
 * Sem backend real para integrations/company_profile/notification_prefs/
 * operational_lists ainda, o comportamento correto é falhar de forma
 * silenciosa e segura (valor vazio), não derrubar o app — a classificação
 * real é "não suportado", não "sucesso fabricado": nenhum dado é inventado,
 * apenas a leitura/escrita vira no-op documentado.
 */
function safeGetRaw<T>(key: string, fallback: T): T {
  try {
    return storage.getRaw<T>(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function safeSetRaw<T>(key: string, value: T): void {
  try {
    storage.setRaw(key, value);
  } catch {
    // Sem endpoint real ainda — no-op documentado, nunca derruba o app.
  }
}

export const settingsService = {
  async listUsers() { return storage.list("users"); },
  async findUser(id: string) { return storage.findById("users", id); },
  async updateUser(id: string, data: Record<string, unknown>) {
    return storage.update("users", id, data);
  },

  async listIntegrations() {
    return safeGetRaw<Record<string, unknown>[]>("integrations", []);
  },
  async updateIntegration(id: string, data: Record<string, unknown>) {
    return storage.update("integrations", id, data);
  },

  getCompanyProfile(): Record<string, unknown> {
    return safeGetRaw<Record<string, unknown>>("company_profile", {});
  },
  saveCompanyProfile(data: Record<string, unknown>): void {
    safeSetRaw("company_profile", data);
  },

  getNotificationPrefs(): Record<string, unknown> {
    return safeGetRaw<Record<string, unknown>>("notification_prefs", {});
  },
  saveNotificationPrefs(data: Record<string, unknown>): void {
    safeSetRaw("notification_prefs", data);
  },

  getOperationalLists(): Record<string, unknown>[] {
    return safeGetRaw<Record<string, unknown>[]>("operational_lists", []);
  },
  saveOperationalLists(data: Record<string, unknown>[]): void {
    safeSetRaw("operational_lists", data);
  },
};
