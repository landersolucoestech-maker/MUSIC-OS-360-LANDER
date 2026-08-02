import { describe, expect, it } from "vitest";
import { deriveAuthEnvironmentLabel, deriveMaskedSupabaseRef, extractSupabaseRef } from "./env";

describe("extractSupabaseRef", () => {
  it("extrai o ref de uma URL Supabase válida", () => {
    expect(extractSupabaseRef("https://rypnevnfipygyhysqpdo.supabase.co")).toBe("rypnevnfipygyhysqpdo");
  });

  it("retorna null para undefined ou URL inválida", () => {
    expect(extractSupabaseRef(undefined)).toBeNull();
    expect(extractSupabaseRef("not-a-url")).toBeNull();
  });
});

describe("deriveAuthEnvironmentLabel", () => {
  it("identifica o ambiente DEV", () => {
    expect(deriveAuthEnvironmentLabel("https://rypnevnfipygyhysqpdo.supabase.co")).toBe("DEV");
  });

  it("identifica o ambiente STAGING", () => {
    expect(deriveAuthEnvironmentLabel("https://jjnnjnxjkqipgqebijen.supabase.co")).toBe("STAGING");
  });

  it("identifica o ref MAIN e sinaliza que é proibido", () => {
    expect(deriveAuthEnvironmentLabel("https://sxmfeocztlztvpdnxayk.supabase.co")).toBe("MAIN (proibido)");
  });

  it("retorna 'desconhecido' para um ref não mapeado ou URL ausente", () => {
    expect(deriveAuthEnvironmentLabel("https://outroref123456.supabase.co")).toBe("desconhecido");
    expect(deriveAuthEnvironmentLabel(undefined)).toBe("desconhecido");
  });
});

describe("deriveMaskedSupabaseRef", () => {
  it("mascara o ref mostrando só os 4 primeiros/últimos caracteres", () => {
    expect(deriveMaskedSupabaseRef("https://rypnevnfipygyhysqpdo.supabase.co")).toBe("rypn…qpdo");
  });

  it("nunca inclui o ref inteiro nem a URL completa", () => {
    const masked = deriveMaskedSupabaseRef("https://rypnevnfipygyhysqpdo.supabase.co");
    expect(masked).not.toContain("rypnevnfipygyhysqpdo");
  });

  it("retorna um placeholder quando não há URL", () => {
    expect(deriveMaskedSupabaseRef(undefined)).toBe("????…????");
  });
});
