/**
 * shared/lib/get-session-org-id.ts
 *
 * Utilitário isolado para ler o org_id do JWT em memória.
 * Separado do AuthContext para compatibilidade com Vite Fast Refresh.
 */

import { getAccessToken } from "./api-client";
import { MOCK_MODE } from "./env";

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
  if (MOCK_MODE) return null;
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
