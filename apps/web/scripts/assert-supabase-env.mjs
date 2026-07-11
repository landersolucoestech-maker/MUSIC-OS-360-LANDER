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
export const SUPABASE_DEV_REF = "hoiigqoocaivdaapetia";
export const SUPABASE_REF_DENYLIST = ["mkyvkciwyhfawmvluugb"];
const SUPABASE_ALLOWED_REFS = [SUPABASE_PROD_REF, SUPABASE_STAGING_REF, SUPABASE_DEV_REF];

/** Ref esperado por ambiente — development EXIGE o projeto DEV. */
function expectedRefFor(nodeEnv) {
  if (nodeEnv === "production") return SUPABASE_PROD_REF;
  if (nodeEnv === "staging") return SUPABASE_STAGING_REF;
  return SUPABASE_DEV_REF;
}

/** Payload público do JWT ({ ref, role }). Nunca expõe o token. */
function jwtClaims(token) {
  if (!token || token.split(".").length < 2) return null;
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    return { ref: payload.ref ?? null, role: payload.role ?? null };
  } catch {
    return null;
  }
}

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
  // O ambiente-alvo (qual projeto Supabase) é definido pelo NODE_ENV, NÃO pelo
  // modo de build do Vite. Um `pnpm build` local (sem NODE_ENV) valida como
  // DESENVOLVIMENTO; um build de produção/staging DEVE exportar NODE_ENV.
  const nodeEnv = env.NODE_ENV ?? "development";
  const isProdLike = nodeEnv === "production" || nodeEnv === "staging";
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

  // Isolamento por ambiente (vale SEMPRE, inclusive em development): o ref usado
  // precisa ser o do ambiente atual. Fecha o buraco de dev apontar para produção.
  const expectedRef = expectedRefFor(nodeEnv);
  if (webRef && webRef !== expectedRef) {
    errors.push(
      `VITE_SUPABASE_URL uses ref "${webRef}" but NODE_ENV=${nodeEnv} requires the "${expectedRef}" project`,
    );
  }
  if (backendRef && backendRef !== expectedRef) {
    errors.push(
      `SUPABASE_URL uses ref "${backendRef}" but NODE_ENV=${nodeEnv} requires the "${expectedRef}" project`,
    );
  }

  // Coerência ref × payload do anon JWT (sem expor o token).
  const anonClaims = jwtClaims(env.VITE_SUPABASE_ANON_KEY);
  if (anonClaims) {
    if (anonClaims.ref && anonClaims.ref !== expectedRef) {
      errors.push(`VITE_SUPABASE_ANON_KEY payload ref "${anonClaims.ref}" != expected "${expectedRef}"`);
    }
    if (anonClaims.role && anonClaims.role !== "anon") {
      errors.push(`VITE_SUPABASE_ANON_KEY role "${anonClaims.role}" (expected "anon" — keys swapped?)`);
    }
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
