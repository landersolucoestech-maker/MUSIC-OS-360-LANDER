import { describe, expect, it } from "vitest";
import { loginSchema } from "../login-schema";

describe("loginSchema (Parte 77) — a senha nunca é transformada", () => {
  it("preserva espaços no início e no fim da senha", () => {
    const result = loginSchema.safeParse({ email: "user@example.com", password: "  Senha123!  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.password).toBe("  Senha123!  ");
  });

  it("preserva caixa (maiúsculas/minúsculas) exatamente como digitada", () => {
    const result = loginSchema.safeParse({ email: "user@example.com", password: "MiXeD-CaSe-Pass1!" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.password).toBe("MiXeD-CaSe-Pass1!");
  });

  it.each([
    "!senha", "senha@", "s#enha", "senha%1", "a&b", "a+b-c_d",
    "(parenteses)", "aa", "!primeiro-e-ultimo!",
  ])("preserva senha com símbolo especial: %s", (password) => {
    const result = loginSchema.safeParse({ email: "user@example.com", password });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.password).toBe(password);
  });

  it("normaliza o e-mail (trim) mas NUNCA a senha", () => {
    const result = loginSchema.safeParse({ email: "  User@Example.com  ", password: "  senha  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("User@Example.com"); // trim, mas sem lowercase no schema (normalização real acontece no AuthContext)
      expect(result.data.password).toBe("  senha  "); // intocada
    }
  });

  it("rejeita senha vazia", () => {
    const result = loginSchema.safeParse({ email: "user@example.com", password: "" });
    expect(result.success).toBe(false);
  });
});
