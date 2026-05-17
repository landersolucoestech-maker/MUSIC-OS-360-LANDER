/**
 * shared/lib/env.ts — Fonte única de verdade para variáveis de ambiente.
 *
 * REGRA: nenhum outro ficheiro deve ler import.meta.env directamente
 * para flags de modo. Importar sempre daqui.
 *
 * MOCK_MODE: true  → standalone (MOCK_DATA + localStorage, sem backend)
 * MOCK_MODE: false → produção (HTTP API real, backend NestJS)
 *
 * VITE_USE_MOCK é a flag canónica.
 * VITE_MOCK_MODE é mantida por retrocompatibilidade.
 * Qualquer das duas definida como "false" desactiva o modo mock.
 *
 * DEV_AUTH_BYPASS: true → bypassa autenticação/RBAC para desenvolvimento.
 * Nunca activo em build de produção (verificado em runtime).
 */

export const MOCK_MODE: boolean =
  import.meta.env.VITE_USE_MOCK !== "false" &&
  import.meta.env.VITE_MOCK_MODE !== "false";

/**
 * DEV_AUTH_BYPASS — bypass controlado de autenticação/RBAC.
 *
 * Activo APENAS quando:
 *   1. VITE_DEV_AUTH_BYPASS=true no .env
 *   2. NÃO é build de produção (import.meta.env.PROD=false)
 *
 * Nunca activo em produção — dupla verificação por segurança.
 */
export const DEV_AUTH_BYPASS: boolean =
  import.meta.env.VITE_DEV_AUTH_BYPASS === "true" &&
  import.meta.env.PROD !== true;

/**
 * URL base da API backend. String vazia = URLs relativas (same-domain, proxy Vite).
 *
 * Sanitização defensiva: remove sufixos /api/v1 ou /api caso VITE_API_URL já os
 * contenha — evita a duplicação "http://host/api/api/v1/..." que ocorre quando
 * VITE_API_URL=http://localhost:3001/api e api-client.ts já anexa /api/v1.
 *
 * Regra: VITE_API_URL deve ser APENAS o host/porta, sem path:
 *   CORRECTO: http://localhost:3001
 *   ERRADO:   http://localhost:3001/api
 *   ERRADO:   http://localhost:3001/api/v1
 */
function sanitizeApiBase(raw: string): string {
  return raw
    .replace(/\/api\/v1\/?$/, "")   // remove sufixo /api/v1
    .replace(/\/api\/?$/, "")        // remove sufixo /api
    .replace(/\/$/, "");             // remove trailing slash
}

export const API_BASE_URL: string = sanitizeApiBase(
  (import.meta.env.VITE_API_URL as string | undefined) ?? "",
);

/** true em ambiente de desenvolvimento Vite (npm run dev). */
export const IS_DEV: boolean = import.meta.env.DEV === true;

/** true em build de produção. */
export const IS_PROD: boolean = import.meta.env.PROD === true;

/**
 * URL do servidor WebSocket / Socket.IO.
 * String vazia = same-origin (Vite proxy resolve em dev).
 */
export const WS_URL: string =
  (import.meta.env.VITE_WS_URL as string | undefined) ?? "";

/**
 * Modo de ambiente Vite: "development" | "production" | "test".
 * Equivale a import.meta.env.MODE.
 */
export const ENV_MODE: string = (import.meta.env.MODE as string) ?? "development";
