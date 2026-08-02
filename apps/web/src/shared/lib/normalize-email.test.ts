import { describe, expect, it } from "vitest";
import { normalizeEmail } from "./normalize-email";

describe("normalizeEmail", () => {
  it("converte para minúsculas", () => {
    expect(normalizeEmail("Deyvisson@LanderRecords.com")).toBe("deyvisson@landerrecords.com");
  });

  it("remove espaços no início e no fim", () => {
    expect(normalizeEmail("  deyvisson@landerrecords.com  ")).toBe("deyvisson@landerrecords.com");
  });

  it("caixa mista com espaços nas duas pontas", () => {
    expect(normalizeEmail("  Deyvisson@LANDERRECORDS.com  ")).toBe("deyvisson@landerrecords.com");
  });

  it("já normalizado permanece idêntico", () => {
    expect(normalizeEmail("deyvisson@landerrecords.com")).toBe("deyvisson@landerrecords.com");
  });
});
