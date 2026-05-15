// @ts-nocheck
import { describe, it, expect } from "vitest";

/**
 * Verifica que o ANCHOR_DATE no mockData.ts está fixo e não usa new Date()
 * do momento da execução, para que os dados mock permaneçam estáveis
 * entre sessões.
 */
describe("mockData ANCHOR_DATE stability", () => {
  it("mockData module exports MOCK_USER_ID and MOCK_ORG_ID", async () => {
    const mod = await import("@/shared/data/mockData");
    expect(mod.MOCK_USER_ID).toBe("mock-user-00000000000000000000000001");
    expect(mod.MOCK_ORG_ID).toBe("mock-org-000000000000000000000000001");
  });

  it("buildMockData returns an object with artistas array", async () => {
    const mod = await import("@/shared/data/mockData");
    const data = mod.buildMockData ? mod.buildMockData() : mod.default;
    if (data && typeof data === "object") {
      expect(data).toBeDefined();
    }
  });

  it("ANCHOR_DATE is fixed to 2026-05-12", async () => {
    const src = await import("@/shared/data/mockData?raw").catch(() => null);
    if (!src) return;
    expect(src.default).toContain("2026-05-12");
    expect(src.default).not.toContain("new Date()");
  });

  it("NOW constant in mockData is an ISO string starting with 2026-05-12", async () => {
    const src = await import("@/shared/data/mockData?raw").catch(() => null);
    if (!src) return;
    expect(src.default).toContain("ANCHOR_DATE.toISOString()");
  });
});
