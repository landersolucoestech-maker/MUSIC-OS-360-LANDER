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

/** Lê org_id do token JWT em memória (modo real) ou retorna null (mock). */
export function getSessionOrgId(): string | null {
  if (MOCK_MODE) return null;
  const token = getAccessToken();
  if (!token)   return null;
  try {
    const p = decodeJwtPayload(token);
    return typeof p["org_id"] === "string" ? p["org_id"] : null;
  } catch { return null; }
}
