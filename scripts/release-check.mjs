#!/usr/bin/env node
/**
 * release-check.mjs — Gate de corte (go-live) do MUSIC OS 360.
 *
 * Dois modos:
 *   node scripts/release-check.mjs            → "check"  (READ-ONLY, seguro a qualquer hora)
 *   node scripts/release-check.mjs --migrate  → "migrate" (aplica db:migrate antes das verificações)
 *
 * Encadeia as etapas em ordem, FALHA RÁPIDO na primeira que quebrar e imprime
 * um sumário PASS/FAIL no fim. As etapas de banco exigem que o Postgres esteja
 * acessível (DATABASE_URL); se não estiver, a etapa é reportada como FAIL com a
 * causa (ECONNREFUSED) — rode num ambiente onde o banco responde.
 *
 * Nenhuma etapa de "check" escreve no banco. Apenas "--migrate" aplica schema.
 */
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATE = process.argv.includes("--migrate");

/** @type {{ name: string, cmd: string, writes?: boolean }[]} */
const steps = [
  // Checks baratos e sem build primeiro (RELEASE-01, RBAC-SHADOW-01, DBCTX-01).
  { name: "Workflows críticos presentes",   cmd: "node scripts/verify-critical-workflows.mjs" },
  { name: "Flags de produção (RBAC/DBCTX)", cmd: "corepack pnpm --filter @music-os-360/api verify:production-flags" },
  { name: "Web typecheck (0 erros)",        cmd: "corepack pnpm --filter @music-os-360/web typecheck" },
  { name: "API build (tsc)",                cmd: "corepack pnpm --filter @music-os-360/api build" },
  { name: "Web build (vite, MOCK off)",     cmd: "corepack pnpm --filter @music-os-360/web build" },
  { name: "Production source/mock audit",   cmd: "node scripts/check-production-source.mjs" },
  { name: "DB: migrations pendentes",       cmd: "corepack pnpm --filter @music-os-360/api db:check" },
  ...(MIGRATE
    ? [{ name: "DB: aplicar migrations", cmd: "corepack pnpm --filter @music-os-360/api db:migrate", writes: true }]
    : []),
  { name: "RLS fail-closed",                cmd: "corepack pnpm --filter @music-os-360/api verify:rls" },
  { name: "Isolamento por tenant",          cmd: "corepack pnpm --filter @music-os-360/api verify:tenant-isolation" },
];

const results = [];
let failed = false;

console.log(`\n=== MUSIC OS 360 — release ${MIGRATE ? "MIGRATE" : "CHECK"} ===`);
console.log(`Etapas: ${steps.length}. Modo: ${MIGRATE ? "aplica schema" : "read-only"}.\n`);

for (const step of steps) {
  if (failed) { results.push({ name: step.name, status: "SKIP" }); continue; }
  process.stdout.write(`▶ ${step.name} … `);
  try {
    execSync(step.cmd, { cwd: root, stdio: "pipe", shell: true });
    console.log("PASS");
    results.push({ name: step.name, status: "PASS" });
  } catch (err) {
    console.log("FAIL");
    const out = `${err.stdout ?? ""}${err.stderr ?? ""}`;
    const reason = /ECONNREFUSED/.test(out)
      ? "banco inacessível (ECONNREFUSED) — rode onde o Postgres responde"
      : (out.split("\n").filter(Boolean).slice(-3).join(" | ") || err.message);
    results.push({ name: step.name, status: "FAIL", reason });
    failed = true;
  }
}

console.log("\n=== SUMÁRIO ===");
for (const r of results) {
  const icon = r.status === "PASS" ? "✅" : r.status === "FAIL" ? "❌" : "⏭️ ";
  console.log(`${icon} ${r.status.padEnd(4)} — ${r.name}${r.reason ? `\n        ↳ ${r.reason}` : ""}`);
}

if (failed) {
  console.log("\n❌ Release gate REPROVADO. Corrija a etapa acima e rode novamente.\n");
  process.exit(1);
}
console.log(`\n✅ Release gate APROVADO${MIGRATE ? " (migrations aplicadas)" : ""}. Apto a prosseguir o cutover.\n`);
