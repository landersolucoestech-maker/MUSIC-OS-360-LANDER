import { z } from "zod";

/**
 * Parte 77 — em módulo próprio (sem depender de Auth.tsx, que puxa toda a
 * árvore de UI/env) para ser testável isoladamente. A senha NUNCA recebe
 * trim/lowercase/normalização — só o e-mail é normalizado (trim aqui;
 * lowercase acontece depois, em AuthContext.signIn via normalizeEmail()).
 */
export const loginSchema = z.object({
  email: z.string().trim().email("E-mail inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

export const forgotSchema = z.object({
  email: z.string().trim().email("E-mail inválido"),
});

export type LoginData = z.infer<typeof loginSchema>;
export type ForgotData = z.infer<typeof forgotSchema>;
