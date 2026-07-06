/**
 * Frontend Supabase environment guard for dev, build, and preview.
 *
 * Mirrors apps/api/src/core/config/env.schema.ts and scripts/env-check.mjs:
 * - banned preview refs are never allowed;
 * - production/staging builds require real Supabase/API envs;
 * - backend and frontend refs must match when both are visible;
 * - mock/auth bypass flags are forbidden outside local development.
 */
import { loadEnv } from "vite";

export const SUPABASE_PROD_REF = "jtizbxbrwyczbkdiruoq";
export const SUPABASE_STAGING_REF = "khnaxcgjnvhhtgkozsif";
export const SUPABASE_REF_DENYLIST = ["mkyvkciwyhfawmvluugb"];
const SUPABASE_ALLOWED_REFS = [SUPABASE_PROD_REF, SUPABASE_STAGING_REF];

export function extractSupabaseRef(value) {
  if (!value) return null;
  const asUrl = /https?:\/\/([a-z0-9]{18,22})\.supabase\.co/i.exec(value);
  if (asUrl) return asUrl[1].toLowerCase();
  const asDirectDb = /\bdb\.([a-z0-9]{18,22})\.supabase\.co/i.exec(value);
  if (asDirectDb) return asDirectDb[1].toLowerCase();
  const asPoolerUser = /\/\/[a-z0-9_]+\.([a-z0-9]{18,22}):[^@]*@[^/]*pooler\.supabase\.com/i.exec(value);
  if (asPoolerUser) return asPoolerUser[1].toLowerCase();
  return null;
}

/**
 * @param {"development"|"production"} mode
 * @param {string} envDir directory containing the web .env files
 */
export function assertWebSupabaseEnv(mode, envDir) {
  const env = { ...loadEnv(mode, envDir, ""), ...process.env };
  const nodeEnv = env.NODE_ENV ?? (mode === "production" ? "production" : "development");
  const isProdLike = mode === "production" || nodeEnv === "production" || nodeEnv === "staging";
  const errors = [];

  const webUrl = env.VITE_SUPABASE_URL ?? "";
  const webRef = extractSupabaseRef(webUrl);
  const backendRef = extractSupabaseRef(env.SUPABASE_URL);

  if (webRef && SUPABASE_REF_DENYLIST.includes(webRef)) {
    errors.push(`VITE_SUPABASE_URL points to banned Supabase ref "${webRef}"`);
  }
  if (backendRef && SUPABASE_REF_DENYLIST.includes(backendRef)) {
    errors.push(`SUPABASE_URL points to banned Supabase ref "${backendRef}"`);
  }
  if (backendRef && webRef && backendRef !== webRef) {
    errors.push(
      `SUPABASE_URL (${backendRef}) and VITE_SUPABASE_URL (${webRef}) point to different projects`,
    );
  }

  if (isProdLike) {
    if (!webUrl) {
      errors.push(`VITE_SUPABASE_URL is required in ${nodeEnv}`);
    } else if (!webRef || !SUPABASE_ALLOWED_REFS.includes(webRef)) {
      errors.push(
        `VITE_SUPABASE_URL uses ref "${webRef ?? "unknown"}" outside allowlist [${SUPABASE_ALLOWED_REFS.join(", ")}] in ${nodeEnv}`,
      );
    }
    if (nodeEnv === "production" && webRef && webRef !== SUPABASE_PROD_REF) {
      errors.push(`VITE_SUPABASE_URL must use production ref "${SUPABASE_PROD_REF}" in production`);
    }
    if (!env.VITE_SUPABASE_ANON_KEY) {
      errors.push(`VITE_SUPABASE_ANON_KEY is required in ${nodeEnv}`);
    }
    if (!env.VITE_API_URL) {
      errors.push(`VITE_API_URL is required in ${nodeEnv}`);
    }
    for (const flag of ["VITE_USE_MOCK", "VITE_MOCK_MODE", "VITE_AUTH_DISABLED"]) {
      if (env[flag] === "true") {
        errors.push(`${flag}=true is forbidden in ${nodeEnv}`);
      }
    }
  }

  if (errors.length > 0) {
    console.error("[assert-supabase-env] Invalid Supabase environment:");
    for (const err of errors) console.error(`  - ${err}`);
    console.error("Fix .env values or run pnpm env:check for the full repo gate.");
    process.exit(1);
  }
}
