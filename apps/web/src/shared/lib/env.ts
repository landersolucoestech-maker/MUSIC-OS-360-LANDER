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
 */

// Auth bypass is an explicit LOCAL-DEV-ONLY convenience and must NEVER be active
// in a production build. Set VITE_AUTH_DISABLED=true in the web app and
// AUTH_DISABLED=true in the API to bypass auth temporarily during development.
// Set the flags to false or remove them to restore the original auth flow.
export const AUTH_DISABLED: boolean =
  import.meta.env.DEV === true &&
  import.meta.env.VITE_AUTH_DISABLED === "true";

export const MOCK_MODE: boolean =
  !import.meta.env.PROD &&
  import.meta.env.VITE_USE_MOCK !== "false" &&
  import.meta.env.VITE_MOCK_MODE !== "false";

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
 * WS feature flag (P0-07). When false, the app does NOT attempt Socket.IO
 * connections — components fall back to polling/manual refresh.
 * Defaults to true; set VITE_WS_ENABLED=false in production env until the
 * /socket.io/ runtime gap is resolved (see FASE 9.5B / FASE 10).
 */
export const WS_ENABLED: boolean =
  ((import.meta.env.VITE_WS_ENABLED as string | undefined) ?? "true") !== "false";

/**
 * Modo de ambiente Vite: "development" | "production" | "test".
 * Equivale a import.meta.env.MODE.
 */
export const ENV_MODE: string = (import.meta.env.MODE as string) ?? "development";

/**
 * validateFrontendEnv — called once at app startup (main.tsx).
 *
 * In production builds, halts rendering and shows an error page if any
 * required environment variable is missing. In development, logs warnings
 * so the dev can fix them without breaking the dev server entirely.
 *
 * Returns true if env is valid, false if the app should not render.
 */
/**
 * Refs Supabase banidos de qualquer runtime (branch preview sem tabelas públicas).
 * Espelha apps/api/src/core/config/env.schema.ts e scripts/env-check.mjs.
 */
const SUPABASE_REF_DENYLIST: readonly string[] = ["mkyvkciwyhfawmvluugb"];

export function validateFrontendEnv(): boolean {
  const isProd = import.meta.env.PROD === true;

  const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "";
  const bannedRef = SUPABASE_REF_DENYLIST.find((ref) => supabaseUrl.includes(ref));
  if (bannedRef) {
    console.error(
      `[MUSIC OS 360] ❌ VITE_SUPABASE_URL aponta para o ref Supabase banido "${bannedRef}" ` +
      "(branch preview sem tabelas públicas). O app não pode iniciar com este ambiente.",
    );
    const root = document.getElementById("root");
    if (root) {
      root.innerHTML =
        `<div style="font-family:system-ui,sans-serif;padding:2rem;max-width:40rem;margin:auto">` +
        `<h2 style="color:#dc2626">Configuration Error</h2>` +
        `<p>The configured Supabase environment is not allowed. Contact your system administrator.</p>` +
        `</div>`;
    }
    return false;
  }

  const required: Array<{ key: string; value: string | undefined; label: string }> = [
    {
      key:   "VITE_SUPABASE_URL",
      value: import.meta.env.VITE_SUPABASE_URL as string | undefined,
      label: "Supabase project URL",
    },
    {
      key:   "VITE_SUPABASE_ANON_KEY",
      value: import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined,
      label: "Supabase anon key",
    },
  ];

  // VITE_API_URL is optional in dev (Vite proxy handles it), required in prod.
  if (isProd) {
    required.push({
      key:   "VITE_API_URL",
      value: import.meta.env.VITE_API_URL as string | undefined,
      label: "Backend API URL",
    });
  }

  const missing = required.filter((r) => !r.value);

  if (missing.length === 0) return true;

  const lines = missing.map((r) => `  • ${r.key} (${r.label})`).join("\n");

  if (isProd) {
    // Halt rendering — the app cannot function without these.
    console.error(
      `[MUSIC OS 360] ❌ Missing required environment variables:\n${lines}\n` +
      "Configure these in your deployment platform before starting the app.",
    );
    const root = document.getElementById("root");
    if (root) {
      root.innerHTML =
        `<div style="font-family:system-ui,sans-serif;padding:2rem;max-width:40rem;margin:auto">` +
        `<h2 style="color:#dc2626">Configuration Error</h2>` +
        `<p>Required environment variables are not set. Contact your system administrator.</p>` +
        `</div>`;
    }
    return false;
  }

  // Development: warn but allow startup so devs can still iterate.
  console.warn(
    `[MUSIC OS 360] ⚠️  Missing environment variables (app will use fallbacks):\n${lines}\n` +
    "Set these in apps/web/.env.local or enable explicit local MOCK_MODE for development.",
  );
  return true;
}
