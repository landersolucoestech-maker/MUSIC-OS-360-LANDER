import { describe, it, expect, vi, beforeEach } from "vitest";
import { exportToCSV, type CSVColumn } from "./csv";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

let lastAoa: unknown[][] | null = null;
vi.mock("xlsx", () => ({
  utils: {
    aoa_to_sheet: (aoa: unknown[][]) => {
      lastAoa = aoa;
      return {};
    },
    book_new: () => ({}),
    book_append_sheet: () => undefined,
  },
  writeFile: () => undefined,
}));

const columns: CSVColumn[] = [{ key: "nome", label: "Nome" }, { key: "valor", label: "Valor" }];

beforeEach(() => {
  lastAoa = null;
});

function capturedSheet(data: Record<string, unknown>[]): unknown[][] {
  exportToCSV(data, columns, "teste");
  return lastAoa!;
}

describe("exportToCSV — proteção contra formula/CSV injection (OWASP)", () => {
  it("neutraliza payload de fórmula (=) com prefixo de aspas simples", () => {
    const aoa = capturedSheet([{ nome: '=HYPERLINK("http://evil.test")', valor: 1 }]);
    expect(aoa[1][0]).toBe('\'=HYPERLINK("http://evil.test")');
  });

  it("neutraliza payload iniciado por @", () => {
    const aoa = capturedSheet([{ nome: "@SUM(1+1)", valor: 1 }]);
    expect(aoa[1][0]).toBe("'@SUM(1+1)");
  });

  it("NÃO neutraliza telefone legítimo iniciado por +", () => {
    const aoa = capturedSheet([{ nome: "Cliente", valor: "+5511999990000" }]);
    expect(aoa[1][1]).toBe("+5511999990000");
  });

  it("NÃO neutraliza valor monetário negativo legítimo", () => {
    const aoa = capturedSheet([{ nome: "Cliente", valor: "-42.50" }]);
    expect(aoa[1][1]).toBe("-42.50");
  });

  it("neutraliza fórmula disfarçada de subtração (- seguido de payload, não número puro)", () => {
    const aoa = capturedSheet([{ nome: "Cliente", valor: "-2+3+cmd|' /c calc'!A1" }]);
    expect(aoa[1][1]).toBe("'-2+3+cmd|' /c calc'!A1");
  });

  it("texto comum não é alterado", () => {
    const aoa = capturedSheet([{ nome: "Cliente Exemplo Ltda", valor: 100 }]);
    expect(aoa[1][0]).toBe("Cliente Exemplo Ltda");
  });
});
