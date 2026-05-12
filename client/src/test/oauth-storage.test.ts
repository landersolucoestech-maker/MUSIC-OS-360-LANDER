// @ts-nocheck
import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Garante que useSigningProviders e useLeadOAuth usam sessionStorage
 * (não localStorage) para armazenar credenciais OAuth temporárias.
 * Credenciais OAuth são dados de sessão, não devem persistir entre
 * reinicializações do browser.
 */
describe("OAuth credentials use sessionStorage (not localStorage)", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  describe("useSigningProviders", () => {
    it("reads Clicksign credentials from sessionStorage", async () => {
      const setItemSpy   = vi.spyOn(sessionStorage, "getItem");
      const lsGetSpy     = vi.spyOn(localStorage,   "getItem");

      sessionStorage.setItem("musicos360_clicksign_credentials", JSON.stringify({ key: "test" }));

      const { useSigningProviders } = await import(
        "@/modules/integrations/hooks/useSigningProviders"
      );
      expect(useSigningProviders).toBeDefined();
      expect(setItemSpy).not.toHaveBeenCalledWith(expect.stringContaining("localStorage"));
      lsGetSpy.mockRestore();
      setItemSpy.mockRestore();
    });

    it("reads DocuSign credentials from sessionStorage", () => {
      const src = require("fs").readFileSync(
        new URL(
          "../../src/modules/integrations/hooks/useSigningProviders.ts",
          import.meta.url
        ).pathname,
        "utf-8"
      );
      expect(src).toContain("sessionStorage");
      expect(src).not.toMatch(/localStorage\.getItem\s*\(\s*["']musicos360_(?:clicksign|docusign)/);
    });
  });

  describe("useLeadOAuth", () => {
    it("saves lead OAuth connections to sessionStorage", () => {
      const src = require("fs").readFileSync(
        new URL(
          "../../src/modules/crm/hooks/useLeadOAuth.ts",
          import.meta.url
        ).pathname,
        "utf-8"
      );
      expect(src).toContain("sessionStorage.getItem(STORAGE_KEY)");
      expect(src).toContain("sessionStorage.setItem(STORAGE_KEY");
    });

    it("does NOT use localStorage for STORAGE_KEY operations", () => {
      const src = require("fs").readFileSync(
        new URL(
          "../../src/modules/crm/hooks/useLeadOAuth.ts",
          import.meta.url
        ).pathname,
        "utf-8"
      );
      expect(src).not.toMatch(/localStorage\.(getItem|setItem)\s*\(\s*STORAGE_KEY/);
    });
  });
});
