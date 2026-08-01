/**
 * shared/lib/get-session-org-id.ts
 *
 * Utilitário isolado para ler o org_id do JWT em memória.
 * Separado do AuthContext para compatibilidade com Vite Fast Refresh.
 */

import { getAccessToken } from "./api-client";

function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const b64 = token.split(".")[1];
    return JSON.parse(atob(b64.replace(/-/g, "+").replace(/_/g, "/")));
  } catch { return {}; }
}

/** Lê org_id do token JWT em memória (modo real) ou retorna null (mock).
 *
 * Prioridade de leitura:
 *   1. app_metadata.org_id — injetado pelo Custom Access Token Hook do Supabase
 *   2. top-level org_id    — fallback para JWTs legados ou custom templates
 */
export function getSessionOrgId(): string | null {
  const token = getAccessToken();
  if (!token)   return null;
  try {
    const p       = decodeJwtPayload(token);
    const appMeta = p["app_metadata"] as Record<string, unknown> | undefined;
    if (typeof appMeta?.["org_id"] === "string") return appMeta["org_id"];
    if (typeof p["org_id"] === "string")         return p["org_id"];
    return null;
  } catch { return null; }
}

/** Lê o `sub` (user id) do token JWT em memória — mesmo claim que o backend
 * usa como identificador de usuário nas policies de Realtime Authorization
 * (`realtime.topic() = 'user:' || auth.jwt()->>'sub'`). */
export function getSessionUserId(): string | null {
  const token = getAccessToken();
  if (!token) return null;
  try {
    const p = decodeJwtPayload(token);
    return typeof p["sub"] === "string" ? p["sub"] : null;
  } catch { return null; }
}
