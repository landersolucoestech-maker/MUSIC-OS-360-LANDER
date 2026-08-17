#!/usr/bin/env node
/**
 * cleanup-check.mjs — gate anti-peso-morto (pnpm cleanup:check).
 *
 * REGRAS PERMANENTES DO REPO (falha se violadas por material NOVO):
 *   1. Nada de arquivos temporários rastreados (*.log, *.tmp, *.bak, .DS_Store...).
 *   2. Nada de auditoria/doc histórico novo rastreado (AUDITORIA_*, P0_*, P1_*,
 *      *_REPORT.md, EXECUCAO_* ...) — relatórios são efêmeros, não entram no git.
 *   3. Nada de ref Supabase banido (branch preview) em qualquer arquivo ou .env.
 *   4. Nada de asset em apps/web/public sem referência comprovada.
 *   5. Nada de script de package.json apontando para arquivo inexistente.
 *   6. Nada de workspace dep (@music-os-360/*) declarada sem uso.
 *   7. Nada de nome de arquivo .env alternativo rastreado — só .env.development/
 *      .env.staging/.env.production (raiz, apps/api, apps/web).
 *
 * Detecção de imports mortos/deps npm sem uso é delegada a `pnpm typecheck` +
 * knip/depcheck/ts-prune (root devDeps) — rodar manualmente antes de releases.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const SUPABASE_REF_DENYLIST = ["mkyvkciwyhfawmvluugb"];

// Únicos arquivos autorizados a MENCIONAR refs banidos: são os próprios guards.
const GUARD_FILE_ALLOWLIST = new Set([
  "apps/api/src/core/config/env.schema.ts",
  "apps/web/src/shared/lib/env.ts",
  "apps/web/scripts/assert-supabase-env.mjs",
  "scripts/env-check.mjs",
  "scripts/cleanup/cleanup-check.mjs",
]);

// Docs históricos que JÁ existiam quando o gate foi criado (2026-07-04).
// Não adicionar itens novos aqui sem decisão explícita de arquitetura.
// CLEANUP_REPORT.md mudou de root/ (rastreado, baseline abaixo) para reports/
// (não rastreado, mesma convenção de todo o resto de reports/) — Parte 81.
const HISTORICAL_DOC_BASELINE = new Set([]);

const JUNK_PATTERN = /\.(log|tmp|bak|orig|rej)$|~$|(^|\/)\.DS_Store$|(^|\/)Thumbs\.db$|(^|\/)\.tmp-/i;
const HISTORICAL_DOC_PATTERN = /(AUDITORIA|LEVANTAMENTO|_REPORT|_AUDIT|^P0_|\/P0_|^P1_|\/P1_|EXECUCAO_|RUNBOOK_STAGING)/i;

const errors = [];

function git(args) {
  try {
    return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8" });
  } catch (err) {
    if (err.status === 1) return ""; // git grep sem matches
    throw err;
  }
}

const trackedFiles = git(["ls-files"]).split(/\r?\n/).filter(Boolean);

// ── 1. Arquivos temporários rastreados ────────────────────────────────────────
for (const file of trackedFiles) {
  if (JUNK_PATTERN.test(file)) {
    errors.push(`arquivo temporário rastreado: ${file}`);
  }
}

// ── 2. Docs históricos novos (apenas .md) ─────────────────────────────────────
for (const file of trackedFiles) {
  if (!file.endsWith(".md")) continue;
  if (HISTORICAL_DOC_PATTERN.test(file) && !HISTORICAL_DOC_BASELINE.has(file)) {
    errors.push(`doc histórico/auditoria novo rastreado (proibido): ${file}`);
  }
}

// ── 3. Refs Supabase banidos ──────────────────────────────────────────────────
for (const banned of SUPABASE_REF_DENYLIST) {
  const hits = git(["grep", "-l", banned, "--", "."]);
  for (const file of hits.split(/\r?\n/).filter(Boolean)) {
    if (GUARD_FILE_ALLOWLIST.has(file.replace(/\\/g, "/"))) continue;
    errors.push(`ref Supabase banido "${banned}" em arquivo rastreado: ${file}`);
  }
}
const envCandidates = [
  ".env.development", ".env.staging", ".env.production",
  "apps/api/.env.development", "apps/api/.env.staging", "apps/api/.env.production",
  "apps/web/.env.development", "apps/web/.env.staging", "apps/web/.env.production",
];
for (const rel of envCandidates) {
  const file = path.join(repoRoot, rel);
  if (!fs.existsSync(file)) continue;
  const content = fs.readFileSync(file, "utf8");
  for (const banned of SUPABASE_REF_DENYLIST) {
    if (content.includes(banned)) errors.push(`ref Supabase banido "${banned}" em ${rel}`);
  }
}

// ── 3b. Nomenclatura de .env — só .env.development/.env.staging/.env.production ──
// (Homologação sistêmica: apps/api e apps/web consolidados para o mesmo padrão
// já usado na raiz. Qualquer nome alternativo rastreado é regressão.)
const LEGACY_ENV_PATTERN = /(^|\/)\.env(\.example|\.dev\.example|\.production\.template|\.local|\.staging\.example|\.production\.example|\.backup.*|\.fase\d+.*)?$/;
for (const file of trackedFiles) {
  const normalized = file.replace(/\\/g, "/");
  if (!LEGACY_ENV_PATTERN.test(normalized)) continue;
  const base = normalized.split("/").pop();
  const isCanonical = base === ".env.development" || base === ".env.staging" || base === ".env.production";
  if (!isCanonical) {
    errors.push(`nome de env alternativo rastreado (proibido): ${file}`);
  }
}

// ── 4. Assets órfãos em apps/web/public ──────────────────────────────────────
function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(full) : [full];
  });
}

function concatSources(dir, exts) {
  let bundle = "";
  for (const file of listFiles(dir)) {
    if (exts.some((ext) => file.endsWith(ext))) bundle += fs.readFileSync(file, "utf8");
  }
  return bundle;
}

const publicDir = path.join(repoRoot, "apps/web/public");
const searchSpace =
  concatSources(path.join(repoRoot, "apps/web/src"), [".ts", ".tsx", ".css", ".html"]) +
  concatSources(path.join(repoRoot, "apps/api/src"), [".ts"]) +
  (fs.existsSync(path.join(repoRoot, "apps/web/index.html"))
    ? fs.readFileSync(path.join(repoRoot, "apps/web/index.html"), "utf8")
    : "");

for (const asset of listFiles(publicDir)) {
  const name = path.basename(asset);
  if (!searchSpace.includes(name)) {
    errors.push(`asset órfão em apps/web/public (0 referências): ${path.relative(repoRoot, asset)}`);
  }
}

// ── 5. Scripts de package.json apontando para arquivos inexistentes ──────────
const pkgFiles = ["package.json", "apps/api/package.json", "apps/web/package.json"].concat(
  fs.readdirSync(path.join(repoRoot, "packages")).map((p) => `packages/${p}/package.json`),
);
for (const rel of pkgFiles) {
  const file = path.join(repoRoot, rel);
  if (!fs.existsSync(file)) continue;
  const pkg = JSON.parse(fs.readFileSync(file, "utf8"));
  const pkgDir = path.dirname(file);
  for (const [name, cmd] of Object.entries(pkg.scripts ?? {})) {
    const match = /(?:^|[\s&|;])(?:node|tsx)\s+(?!-)([^\s&|;"']+\.(?:mjs|cjs|js|ts))/.exec(cmd);
    if (match && !fs.existsSync(path.resolve(pkgDir, match[1]))) {
      errors.push(`script quebrado em ${rel} → "${name}": arquivo ${match[1]} não existe`);
    }
  }
}

// ── 6. Workspace deps declaradas sem uso ──────────────────────────────────────
for (const rel of ["apps/api/package.json", "apps/web/package.json"]) {
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, rel), "utf8"));
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  const appSrc = concatSources(path.join(repoRoot, path.dirname(rel), "src"), [".ts", ".tsx"]);
  for (const dep of Object.keys(deps)) {
    if (!dep.startsWith("@music-os-360/")) continue;
    if (!appSrc.includes(dep)) {
      errors.push(`workspace dep declarada sem uso em ${rel}: ${dep}`);
    }
  }
}

// ── Relatório ─────────────────────────────────────────────────────────────────
if (errors.length > 0) {
  console.error("❌ cleanup:check FALHOU — peso morto novo detectado:");
  for (const err of errors) console.error(`  • ${err}`);
  process.exit(1);
}
console.log("✅ cleanup:check OK — nenhum peso morto novo (temp/docs/refs/assets/scripts/deps)");
