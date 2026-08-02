import { describe, it, expect, vi } from "vitest";

/**
 * settings.service.test.ts  (Parte 79)
 *
 * Guarda permanente: `storage.getRaw`/`setRaw` são stubs que sempre lançam
 * (nunca migrados de localStorage para um endpoint real). Uma chamada
 * síncrona a `settingsService.getOperationalLists()` dentro de
 * `useState(() => ...)` (useOperationalSettings) derrubava a árvore React
 * inteira ao montar QUALQUER componente que a use (LeadFormModal,
 * ArtistaFormModal, ContratoWizard, etc.) — reproduzido via navegador real
 * na página /leads. As quatro leituras nunca podem lançar; devolvem um
 * valor vazio seguro em vez de fabricar dado ou derrubar o app.
 */
vi.mock("@/shared/lib/storage", () => ({
  storage: {
    list: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    getRaw: vi.fn(() => {
      throw new Error("storage.getRaw() is unavailable; use a backend endpoint.");
    }),
    setRaw: vi.fn(() => {
      throw new Error("storage.setRaw() is unavailable; use a backend endpoint.");
    }),
  },
}));

import { settingsService } from "./settings.service";

describe("settingsService — nunca propaga o throw de storage.getRaw/setRaw", () => {
  it("getOperationalLists() devolve [] em vez de lançar", () => {
    expect(settingsService.getOperationalLists()).toEqual([]);
  });

  it("getCompanyProfile() devolve {} em vez de lançar", () => {
    expect(settingsService.getCompanyProfile()).toEqual({});
  });

  it("getNotificationPrefs() devolve {} em vez de lançar", () => {
    expect(settingsService.getNotificationPrefs()).toEqual({});
  });

  it("listIntegrations() devolve [] em vez de lançar", async () => {
    await expect(settingsService.listIntegrations()).resolves.toEqual([]);
  });

  it("saveOperationalLists()/saveCompanyProfile()/saveNotificationPrefs() nunca lançam", () => {
    expect(() => settingsService.saveOperationalLists([])).not.toThrow();
    expect(() => settingsService.saveCompanyProfile({})).not.toThrow();
    expect(() => settingsService.saveNotificationPrefs({})).not.toThrow();
  });
});
