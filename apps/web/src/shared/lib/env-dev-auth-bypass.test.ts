import { describe, expect, it } from "vitest";
import { deriveDevAuthBypass } from "./env";

describe("deriveDevAuthBypass (VITE_DISABLE_AUTH — DEV ONLY)", () => {
  it("nunca ativa fora de build de desenvolvimento, mesmo com a flag mal configurada (staging/produção)", () => {
    expect(deriveDevAuthBypass(false, "true")).toBe(false);
  });

  it("não ativa em dev quando a flag está ausente, falsa, ou qualquer valor que não seja exatamente 'true'", () => {
    expect(deriveDevAuthBypass(true, undefined)).toBe(false);
    expect(deriveDevAuthBypass(true, "false")).toBe(false);
    expect(deriveDevAuthBypass(true, "1")).toBe(false);
    expect(deriveDevAuthBypass(true, "")).toBe(false);
  });

  it("só ativa quando dev E a flag é exatamente 'true'", () => {
    expect(deriveDevAuthBypass(true, "true")).toBe(true);
  });
});
