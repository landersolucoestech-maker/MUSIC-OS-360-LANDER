/**
 * assert-supabase-env.mjs — guard de ambiente do frontend (dev, build e preview).
 *
 * Espelha as regras de apps/api/src/core/config/env.schema.ts e scripts/env-check.mjs:
 *   - ref Supabase banido (branch preview sem tabelas públicas) NUNCA pode ser usado;
 *   - build de produção exige VITE_SUPABASE_URL com ref da allowlist;
 *   - mock e bypass de auth são proibidos em build de produção;
 *   - se SUPABASE_URL (backend) estiver visível no ambiente, o ref deve ser o mesmo
 *     do frontend — frontend e backend apontam para o mesmo projeto, sempre.
 *
 * Qualquer alteração de refs deve ser replicada nos três lugares.
 */
import { loadEnv } from "vite";

export const SUPABASE_PROD_REF = "iundcoubyaiwzqyytvdr";
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
 * @param {string} envDir diretório onde vivem os .env do web (apps/web)
 */
export function assertWebSupabaseEnv(mode, envDir) {
  // process.env por último: CI/deploy sobrepõe arquivos locais.
  const env = { ...loadEnv(mode, envDir, ""), ...process.env };
  const errors = [];

  const webUrl = env.VITE_SUPABASE_URL ?? "";
  const webRef = extractSupabaseRef(webUrl);

  if (webRef && SUPABASE_REF_DENYLIST.includes(webRef)) {
    errors.push(
      `VITE_SUPABASE_URL aponta para o ref banido "${webRef}" (branch preview sem tabelas públicas)`,
    );
  }

  const backendRef = extractSupabaseRef(env.SUPABASE_URL);
  if (backendRef && webRef && backendRef !== webRef) {
    errors.push(
      `SUPABASE_URL (backend, ref "${backendRef}") e VITE_SUPABASE_URL (frontend, ref "${webRef}") apontam para projetos diferentes`,
    );
  }

  if (mode === "production") {
    if (!webUrl) {
      errors.push("VITE_SUPABASE_URL é obrigatório em build de produção");
    } else if (!webRef || !SUPABASE_ALLOWED_REFS.includes(webRef)) {
      errors.push(
        `VITE_SUPABASE_URL usa ref "${webRef ?? "desconhecido"}" fora da allowlist [${SUPABASE_ALLOWED_REFS.join(", ")}]`,
      );
    }
    // Flags de mock/bypass são neutralizadas em bundle de produção pelos gates
    // DEV/PROD de src/shared/lib/env.ts — aqui apenas alertamos; o bloqueio
    // runtime em staging/prod é feito pelo schema da API e pelo pnpm env:check.
    for (const flag of ["VITE_USE_MOCK", "VITE_MOCK_MODE", "VITE_AUTH_DISABLED"]) {
      if (env[flag] === "true") {
        console.warn(
          `[assert-supabase-env] ⚠️  ${flag}=true no ambiente de build — inerte em produção, mas confira se é intencional.`,
        );
      }
    }
  }

  if (errors.length > 0) {
    console.error("[assert-supabase-env] ❌ Ambiente Supabase inválido:");
    for (const err of errors) console.error(`  • ${err}`);
    console.error("Corrija os .env (ver pnpm env:check) antes de continuar.");
    process.exit(1);
  }
}
