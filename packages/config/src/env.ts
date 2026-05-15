// ─── App-level env config ─────────────────────────────────────────────────────
// Lido pelo backend (process.env) e pelo frontend (import.meta.env).
// Use as funções helper em vez de acessar process.env diretamente.

export type AppEnvironment = "development" | "staging" | "production" | "test";

export function getAppEnv(): AppEnvironment {
  const env =
    (typeof process !== "undefined" && process.env["NODE_ENV"]) ||
    "development";
  if (env === "production" || env === "staging" || env === "test") return env;
  return "development";
}

export function isDev(): boolean {
  return getAppEnv() === "development";
}

export function isProd(): boolean {
  return getAppEnv() === "production";
}

export function isTest(): boolean {
  return getAppEnv() === "test";
}

// ─── API URL resolution ───────────────────────────────────────────────────────

export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    // Browser: usa variável Vite ou cai para relativo
    return (
      (import.meta as unknown as { env?: Record<string, string> }).env
        ?.VITE_API_URL ?? "/api/v1"
    );
  }
  // Server-side: usa variável de ambiente Node
  return process.env["API_URL"] ?? "http://localhost:3001/api/v1";
}
