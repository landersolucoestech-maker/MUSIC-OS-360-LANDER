import { describe, expect, it } from "vitest";
import { describeAuthError, isCredentialsError } from "./auth-error-messages";

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

describe("isCredentialsError (Parte 77) — só isso deve consumir uma tentativa do rate limiter", () => {
  it("true para credenciais inválidas", () => {
    expect(isCredentialsError({ message: "Invalid login credentials" })).toBe(true);
  });

  it("false para falha de rede — nunca deve contar como tentativa", () => {
    expect(isCredentialsError({ message: "Failed to fetch" })).toBe(false);
  });

  it("false para erro 5xx/servidor — nunca deve contar como tentativa", () => {
    expect(isCredentialsError({ message: "Internal server error", status: 500 })).toBe(false);
  });

  it("false para rate limit — já é tratado separadamente", () => {
    expect(isCredentialsError({ message: "x", status: 429 })).toBe(false);
  });

  it("false para e-mail não confirmado — não é senha errada", () => {
    expect(isCredentialsError({ message: "Email not confirmed" })).toBe(false);
  });
});
