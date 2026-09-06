/**
 * date-time.test.ts
 *
 * Task S — guarda permanente: o calendário da Agenda lia `evento.start_date`
 * (campo que nunca existiu no backend — a coluna real é `data`, timestamp
 * completo) para montar cada evento, então TODO evento caía no fallback
 * "agora" e aparecia sempre na data errada, para qualquer tenant. splitDateTime/
 * combineDateTime são as duas conversões que substituem essa leitura errada
 * (export: timestamp real → colunas de planilha; import: colunas de planilha
 * → timestamp real para o payload do DTO).
 */
import { describe, it, expect } from "vitest";
import { splitDateTime, combineDateTime } from "./date-time";

describe("splitDateTime", () => {
  it("separa um ISO datetime real em data (YYYY-MM-DD) e hora (HH:mm)", () => {
    expect(splitDateTime("2026-08-20T14:30:00.000Z")).toEqual(
      (() => {
        const d = new Date("2026-08-20T14:30:00.000Z");
        return {
          date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
          time: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
        };
      })(),
    );
  });

  it("aceita um objeto Date diretamente", () => {
    const result = splitDateTime(new Date(2026, 7, 20, 9, 5));
    expect(result).toEqual({ date: "2026-08-20", time: "09:05" });
  });

  it("retorna vazio para valor nulo/ausente/inválido — nunca lança", () => {
    expect(splitDateTime(null)).toEqual({ date: "", time: "" });
    expect(splitDateTime(undefined)).toEqual({ date: "", time: "" });
    expect(splitDateTime("não é uma data")).toEqual({ date: "", time: "" });
  });
});

describe("combineDateTime", () => {
  it("combina data + hora em um ISO datetime válido para o backend", () => {
    const iso = combineDateTime("2026-08-20", "14:30");
    expect(iso).toBeDefined();
    const d = new Date(iso!);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(7);
    expect(d.getDate()).toBe(20);
    expect(d.getHours()).toBe(14);
    expect(d.getMinutes()).toBe(30);
  });

  it("usa 00:00 quando nenhum horário é informado", () => {
    const iso = combineDateTime("2026-08-20", null);
    const d = new Date(iso!);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
  });

  it("retorna undefined sem data (não inventa um evento sem data real)", () => {
    expect(combineDateTime(null, "14:30")).toBeUndefined();
    expect(combineDateTime(undefined, "14:30")).toBeUndefined();
    expect(combineDateTime("", "14:30")).toBeUndefined();
  });

  it("retorna undefined para combinação que não forma uma data válida", () => {
    expect(combineDateTime("não é uma data", "14:30")).toBeUndefined();
  });
});
