#!/usr/bin/env node
/**
 * env-check.mjs — gate de coerência de ambiente Supabase (pnpm env:check).
 *
 * Valida, sem imprimir secrets:
 *   1. Nenhum ref Supabase banido (denylist) em .env*, código rastreado, workflows ou scripts.
 *   2. Frontend (VITE_SUPABASE_URL) e backend (SUPABASE_URL/DATABASE_URL/APP_DATABASE_URL)
 *      apontam para o MESMO projeto Supabase.
 *   3. Ref em uso pertence à allowlist (produção ou staging).
 *   4. Envs obrigatórios presentes e não vazios.
 *   5. Mock/auth-bypass proibidos fora de development e coerentes entre web e api.
 *
 * Espelha as constantes de:
 *   - apps/api/src/core/config/env.schema.ts
 *   - apps/web/scripts/assert-supabase-env.mjs
 * Qualquer alteração de refs deve ser replicada nos três lugares.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const SUPABASE_PROD_REF = "iundcoubyaiwzqyytvdr";
const SUPABASE_STAGING_REF = "khnaxcgjnvhhtgkozsif";
const SUPABASE_REF_DENYLIST = ["mkyvkciwyhfawmvluugb"];
const SUPABASE_ALLOWED_REFS = [SUPABASE_PROD_REF, SUPABASE_STAGING_REF];

// Únicos arquivos autorizados a MENCIONAR refs banidos: são os próprios guards.
const GUARD_FILE_ALLOWLIST = new Set([
  "apps/api/src/core/config/env.schema.ts",
  "apps/web/src/shared/lib/env.ts",
  "apps/web/scripts/assert-supabase-env.mjs",
  "scripts/env-check.mjs",
  "scripts/cleanup/cleanup-check.mjs",
]);

const errors = [];
const warnings = [];

function extractSupabaseRef(value) {
  if (!value) return null;
  const asUrl = /https?:\/\/([a-z0-9]{18,22})\.supabase\.co/i.exec(value);
  if (asUrl) return asUrl[1].toLowerCase();
  const asDirectDb = /\bdb\.([a-z0-9]{18,22})\.supabase\.co/i.exec(value);
  if (asDirectDb) return asDirectDb[1].toLowerCase();
  const asPoolerUser = /\/\/[a-z0-9_]+\.([a-z0-9]{18,22}):[^@]*@[^/]*pooler\.supabase\.com/i.exec(value);
  if (asPoolerUser) return asPoolerUser[1].toLowerCase();
  return null;
}

/** Parser KEY=VALUE idêntico ao loadLocalEnv de apps/api/src/main.ts. */
function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const vars = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const sep = trimmed.indexOf("=");
    if (sep === -1) continue;
    const key = trimmed.slice(0, sep).trim();
    const raw = trimmed.slice(sep + 1).trim();
    if (key) vars[key] = raw.replace(/^["']|["']$/g, "");
  }
  return vars;
}

// ── 1. Denylist em arquivos rastreados (código, workflows, configs) ───────────
for (const banned of SUPABASE_REF_DENYLIST) {
  let hits = "";
  try {
    hits = execFileSync("git", ["grep", "-l", banned, "--", "."], {
      cwd: repoRoot,
      encoding: "utf8",
    });
  } catch {
    // exit code 1 = sem matches (o resultado desejado)
  }
  for (const file of hits.split(/\r?\n/).filter(Boolean)) {
    if (GUARD_FILE_ALLOWLIST.has(file.replace(/\\/g, "/"))) continue;
    errors.push(`ref banido "${banned}" encontrado em arquivo rastreado: ${file}`);
  }
}

// ── 1b. Denylist em todos os .env* (não rastreados) ───────────────────────────
const envFiles = [
  ".env",
  ".env.example",
  ".env.staging.example",
  "apps/api/.env",
  "apps/api/.env.example",
  "apps/api/.env.backup.fase1d",
  "apps/api/.env.fase1d.local",
  "apps/api/.env.production.template",
  "apps/web/.env",
].map((p) => path.join(repoRoot, p));

for (const file of envFiles) {
  if (!fs.existsSync(file)) continue;
  const content = fs.readFileSync(file, "utf8");
  for (const banned of SUPABASE_REF_DENYLIST) {
    if (content.includes(banned)) {
      errors.push(`ref banido "${banned}" encontrado em ${path.relative(repoRoot, file)}`);
    }
  }
}

// ── 2–5. Coerência dos envs efetivos ─────────────────────────────────────────
const rootEnv = parseEnvFile(path.join(repoRoot, ".env")) ?? {};
const apiFileEnv = parseEnvFile(path.join(repoRoot, "apps/api/.env"));
const webEnv = parseEnvFile(path.join(repoRoot, "apps/web/.env"));

if (!apiFileEnv) warnings.push("apps/api/.env ausente — API dependerá do .env da raiz/process.env");
if (!webEnv) errors.push("apps/web/.env ausente — frontend sem VITE_SUPABASE_URL definido");

// Precedência real: main.ts carrega apps/api/.env primeiro e NÃO sobrescreve com o da raiz.
const apiEnv = { ...rootEnv, ...(apiFileEnv ?? {}) };
const web = webEnv ?? {};

const nodeEnv = apiEnv.NODE_ENV ?? "development";
const isProdLike = nodeEnv === "production" || nodeEnv === "staging";

// Envs obrigatórios não vazios
const requiredApi = ["DATABASE_URL", "SUPABASE_URL", "SUPABASE_ANON_KEY"];
const requiredWeb = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY", "VITE_API_URL"];
for (const key of requiredApi) {
  if (!apiEnv[key]) errors.push(`env obrigatório ausente/vazio no backend: ${key}`);
}
for (const key of requiredWeb) {
  if (!web[key]) errors.push(`env obrigatório ausente/vazio no frontend (apps/web/.env): ${key}`);
}

// Refs por origem
const refSources = [
  ["SUPABASE_URL (api)", extractSupabaseRef(apiEnv.SUPABASE_URL)],
  ["DATABASE_URL (api)", extractSupabaseRef(apiEnv.DATABASE_URL)],
  ["APP_DATABASE_URL (api)", extractSupabaseRef(apiEnv.APP_DATABASE_URL)],
  ["VITE_SUPABASE_URL (web)", extractSupabaseRef(web.VITE_SUPABASE_URL)],
];

for (const [label, ref] of refSources) {
  if (ref && SUPABASE_REF_DENYLIST.includes(ref)) {
    errors.push(`${label} usa o ref banido "${ref}" (branch preview sem tabelas públicas)`);
  }
  if (ref && !SUPABASE_ALLOWED_REFS.includes(ref) && !SUPABASE_REF_DENYLIST.includes(ref)) {
    errors.push(`${label} usa ref "${ref}" fora da allowlist [${SUPABASE_ALLOWED_REFS.join(", ")}]`);
  }
}

const resolved = refSources.filter(([, ref]) => ref !== null);
const distinct = [...new Set(resolved.map(([, ref]) => ref))];
if (distinct.length > 1) {
  errors.push(
    `frontend e backend apontam para projetos Supabase DIFERENTES: ${resolved
      .map(([label, ref]) => `${label}=${ref}`)
      .join(" · ")}`,
  );
}

if (nodeEnv === "production" && distinct.length === 1 && distinct[0] !== SUPABASE_PROD_REF) {
  errors.push(`NODE_ENV=production exige o ref de produção "${SUPABASE_PROD_REF}" (em uso: "${distinct[0]}")`);
}

// VITE_API_URL bem formada
if (web.VITE_API_URL && !/^https?:\/\//.test(web.VITE_API_URL)) {
  errors.push(`VITE_API_URL inválida: "${web.VITE_API_URL}" (esperado http(s)://host[:porta])`);
}

// Mock / auth bypass
const mockFlags = [
  ["USE_MOCK (api)", apiEnv.USE_MOCK],
  ["MOCK_MODE (api)", apiEnv.MOCK_MODE],
  ["VITE_USE_MOCK (web)", web.VITE_USE_MOCK],
  ["VITE_MOCK_MODE (web)", web.VITE_MOCK_MODE],
];
if (isProdLike) {
  for (const [label, value] of mockFlags) {
    if (value === "true") errors.push(`${label}=true é proibido com NODE_ENV=${nodeEnv}`);
  }
  if (apiEnv.AUTH_DISABLED === "true" || web.VITE_AUTH_DISABLED === "true") {
    errors.push(`bypass de auth (AUTH_DISABLED/VITE_AUTH_DISABLED) é proibido com NODE_ENV=${nodeEnv}`);
  }
}
const apiMock = apiEnv.USE_MOCK === "true" || apiEnv.MOCK_MODE === "true";
const webMock = web.VITE_USE_MOCK === "true" || web.VITE_MOCK_MODE === "true";
if (apiMock !== webMock) {
  errors.push(
    `modo mock divergente: api=${apiMock} vs web=${webMock} — frontend e backend devem operar no mesmo modo`,
  );
}

// ── Relatório ─────────────────────────────────────────────────────────────────
for (const warning of warnings) console.warn(`⚠️  ${warning}`);
if (errors.length > 0) {
  console.error("❌ env:check FALHOU:");
  for (const err of errors) console.error(`  • ${err}`);
  process.exit(1);
}

console.log(
  `✅ env:check OK — ref Supabase "${distinct[0] ?? "n/d"}" ` +
    `(${distinct[0] === SUPABASE_PROD_REF ? "produção" : distinct[0] === SUPABASE_STAGING_REF ? "staging" : "?"}) · ` +
    `NODE_ENV=${nodeEnv} · mock=${webMock ? "ON" : "off"} · frontend↔backend alinhados`,
);
