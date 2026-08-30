/**
 * LeadViewModal.interacoes-equipe.guard.test.ts
 *
 * Guarda permanente (REM-04 / GAP-10): `historicoInteracoes` era sempre []
 * — o registro real de interações da equipe (`/lead-interactions`) nunca
 * era buscado. Este teste falha se a integração real for removida.
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const SOURCE = fs.readFileSync(path.resolve(__dirname, "LeadViewModal.tsx"), "utf8");

describe("LeadViewModal — registro real de interações da equipe (REM-04)", () => {
  it("usa useLeadInteractions para buscar dados reais (não array vazio hardcoded)", () => {
    expect(SOURCE).toMatch(/useLeadInteractions\(lead\?\.id\)/);
  });

  it("renderiza a lista real, não um placeholder estático", () => {
    expect(SOURCE).toMatch(/interacoesEquipe\.map/);
  });
});
