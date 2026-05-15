// ─── JWT Payload Types ────────────────────────────────────────────────────────

import type { Role } from "./roles";

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  tenant_id: string;
  tenant_slug: string;
  iat?: number;
  exp?: number;
  jti?: string;
}

export interface JwtRefreshPayload {
  sub: string;
  tenant_id: string;
  jti: string;
  iat?: number;
  exp?: number;
}

// ─── Token Utilities (pure, no crypto deps) ───────────────────────────────────

/**
 * Decodifica a parte payload de um JWT sem verificar assinatura.
 * Use APENAS para leitura de claims no cliente (ex: exibir nome do usuário).
 * A verificação real da assinatura ocorre no servidor (NestJS JwtStrategy).
 */
export function decodeJwtPayload<T = JwtPayload>(token: string): T | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64);
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

/**
 * Verifica se um JWT (decodificado) está expirado.
 */
export function isTokenExpired(payload: { exp?: number }): boolean {
  if (!payload.exp) return false;
  return Date.now() / 1000 > payload.exp;
}

/**
 * Retorna quantos segundos faltam para o token expirar.
 * Retorna 0 se já expirou ou sem `exp`.
 */
export function tokenTtlSeconds(payload: { exp?: number }): number {
  if (!payload.exp) return 0;
  return Math.max(0, payload.exp - Math.floor(Date.now() / 1000));
}

// ─── Cookie names (compartilhados frontend ↔ backend) ─────────────────────────

export const JWT_COOKIE = "musicos360_at";
export const REFRESH_COOKIE = "musicos360_rt";
export const CSRF_HEADER = "x-csrf-token";
