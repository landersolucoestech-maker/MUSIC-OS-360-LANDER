import { describe, expect, it } from "vitest";
import { describeAuthError } from "./auth-error-messages";

describe("describeAuthError", () => {
  it("credenciais inválidas", () => {
    expect(describeAuthError({ message: "Invalid login credentials" })).toBe("Credenciais inválidas.");
  });

  it("e-mail não confirmado", () => {
    expect(describeAuthError({ message: "Email not confirmed" })).toContain("não confirmado");
  });

  it("rate limit por status 429", () => {
    expect(describeAuthError({ message: "x", status: 429 })).toContain("Muitas tentativas");
  });

  it("rate limit por mensagem", () => {
    expect(describeAuthError({ message: "Too many requests" })).toContain("Muitas tentativas");
  });

  it("falha de rede", () => {
    expect(describeAuthError({ message: "Failed to fetch" })).toContain("Falha de conexão");
  });

  it("fallback: mensagem original quando não reconhecida", () => {
    expect(describeAuthError({ message: "Some other Supabase error" })).toBe("Some other Supabase error");
  });

  it("fallback genérico quando a mensagem está vazia", () => {
    expect(describeAuthError({ message: "" })).toBe("Não foi possível entrar. Tente novamente.");
  });

  it("nunca revela se um e-mail específico existe (mesma mensagem genérica para senha errada e conta inexistente)", () => {
    // Supabase retorna a MESMA "Invalid login credentials" para ambos os casos —
    // este teste documenta que não introduzimos nenhuma lógica que diferencie os dois.
    expect(describeAuthError({ message: "Invalid login credentials" })).toBe("Credenciais inválidas.");
  });
});
