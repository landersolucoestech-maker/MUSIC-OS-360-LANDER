import { describe, expect, it, vi, beforeEach } from "vitest";
import * as XLSX from "xlsx";

/**
 * Este é o caminho REALMENTE usado pelo clique em "Exportar" na página
 * /relatorios quando VITE_USE_MOCK/VITE_AUTH_DISABLED estão ativos (config
 * padrão deste repo — ver apps/web/.env). export-format.service.ts (backend)
 * NUNCA é chamado neste modo; sanitizeExcelCellValue aqui é o último ponto
 * antes de escrever qualquer valor no Excel.
 */
const rawTable: Record<string, unknown> = {};

vi.mock("@/shared/lib/storage", () => ({
  storage: { raw: () => rawTable },
}));

vi.mock("@/shared/lib/env", () => ({
  API_BASE_URL: "http://localhost:3001",
  AUTH_DISABLED: false,
  MOCK_MODE: true,
}));

import { sanitizeExcelCellValue, reportsApi, serializeLocalRows, EXCEL_CELL_MAX_CHARS } from "../services/reports-api";

function readFirstSheetRows(buf: ArrayBuffer): unknown[][] {
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
}

describe("sanitizeExcelCellValue — última barreira antes do Excel (caminho local/mock)", () => {
  it("null/undefined viram célula vazia", () => {
    expect(sanitizeExcelCellValue(null, { entity: "artistas", column: "x" })).toBe("");
    expect(sanitizeExcelCellValue(undefined, { entity: "artistas", column: "x" })).toBe("");
  });

  it("objeto/array cru NUNCA vira célula (nunca dumpa JSON)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(sanitizeExcelCellValue({ a: 1 }, { entity: "artistas", column: "metadata" })).toBe("");
    expect(sanitizeExcelCellValue([1, 2, 3], { entity: "artistas", column: "tags" })).toBe("");
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("string acima de 32767 caracteres é truncada com marcador, e o resultado nunca ultrapassa o limite", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const huge = "B".repeat(40000);
    const out = sanitizeExcelCellValue(huge, { entity: "contratos", column: "conteudo" });
    expect(out.length).toBeLessThanOrEqual(EXCEL_CELL_MAX_CHARS);
    expect(out).toContain("truncado");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("contratos.conteudo"));
    warn.mockRestore();
  });

  it("string dentro do limite não é alterada", () => {
    const normal = "Observação normal do formulário.";
    expect(sanitizeExcelCellValue(normal, { entity: "artistas", column: "observacoes" })).toBe(normal);
  });
});

describe("reportsApi.exportBlob (modo local/mock) — caminho real clicado em /relatorios", () => {
  beforeEach(() => {
    for (const k of Object.keys(rawTable)) delete rawTable[k];
  });

  it("Artistas: exportBlob() completa sem lançar exceção mesmo com campo gigante", async () => {
    rawTable.artistas = [
      { id: "1", nome_artistico: "Ana", observacoes: "A".repeat(50000) },
    ];
    const { blob, filename } = await reportsApi.exportBlob("artistas", { format: "xlsx", pageSize: 1000 });
    expect(filename).toBe("artistas.xlsx");
    expect(blob.size).toBeGreaterThan(0);
  });

  it("Artistas: a célula do campo gigante sai truncada no .xlsx real gerado (mesma função usada por exportBlob)", () => {
    const rows = [{ id: "1", nome_artistico: "Ana", observacoes: "A".repeat(50000) }];
    const buf = serializeLocalRows("artistas", rows, ["nome_artistico", "observacoes"]);
    const sheetRows = readFirstSheetRows(buf);
    const obsIndex = (sheetRows[0] as string[]).indexOf("observacoes");
    const cell = String(sheetRows[1][obsIndex]);
    expect(cell.length).toBeLessThanOrEqual(EXCEL_CELL_MAX_CHARS);
    expect(cell).toContain("truncado");
  });

  it("Contratos (modelo de contrato com corpo muito longo): exportBlob() não lança exceção", async () => {
    rawTable.contratos = [
      { id: "1", nome: "Contrato Modelo Padrão", conteudo: "C".repeat(60000) },
    ];
    const { blob, filename } = await reportsApi.exportBlob("contratos", { format: "xlsx", pageSize: 1000 });
    expect(filename).toBe("contratos.xlsx");
    expect(blob.size).toBeGreaterThan(0);
  });

  it("Contratos: a célula do corpo do contrato sai truncada no .xlsx real gerado", () => {
    const rows = [{ id: "1", nome: "Contrato Modelo Padrão", conteudo: "C".repeat(60000) }];
    const buf = serializeLocalRows("contratos", rows, ["nome", "conteudo"]);
    const sheetRows = readFirstSheetRows(buf);
    const idx = (sheetRows[0] as string[]).indexOf("conteudo");
    const cell = String(sheetRows[1][idx]);
    expect(cell.length).toBeLessThanOrEqual(EXCEL_CELL_MAX_CHARS);
    expect(cell).toContain("truncado");
  });
});
