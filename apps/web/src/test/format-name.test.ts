import { describe, it, expect } from "vitest";
import { formatPersonName } from "@/shared/lib/format-name";

describe("formatPersonName", () => {
  it("capitalizes each word of a simple name", () => {
    expect(formatPersonName("devyisson lander")).toBe("Devyisson Lander");
  });

  it("keeps pt-BR particles lowercase (except first word)", () => {
    expect(formatPersonName("joao da silva")).toBe("Joao da Silva");
    expect(formatPersonName("maria dos santos")).toBe("Maria dos Santos");
    expect(formatPersonName("pedro de e do das")).toBe("Pedro de e do das");
  });

  it("capitalizes a particle when it is the first word", () => {
    expect(formatPersonName("da vinci")).toBe("Da Vinci");
  });

  it("preserves accents and recase mixed input", () => {
    expect(formatPersonName("JOÃO SILVA")).toBe("João Silva");
    expect(formatPersonName("joão")).toBe("João");
  });

  it("preserves numbers and recases the rest", () => {
    expect(formatPersonName("admin musicos 360")).toBe("Admin Musicos 360");
  });

  it("handles hyphenated and apostrophe names", () => {
    expect(formatPersonName("ana-maria d'angelo")).toBe("Ana-Maria D'Angelo");
  });

  it("collapses extra whitespace", () => {
    expect(formatPersonName("  joao   silva  ")).toBe("Joao Silva");
  });

  it("returns the fallback for empty/nullish input", () => {
    expect(formatPersonName(null, "Usuário")).toBe("Usuário");
    expect(formatPersonName(undefined, "Usuário")).toBe("Usuário");
    expect(formatPersonName("   ", "Usuário")).toBe("Usuário");
    expect(formatPersonName("")).toBe("");
  });
});
