/**
 * shared/governance/index.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * MUSIC OS 360 — Barrel da camada de Governança
 *
 * Exporta todas as convenções, registos e documentação operacional
 * da plataforma para uso em qualquer ponto do codebase.
 *
 * Importação recomendada:
 *   import { MODULE_REGISTRY, ENTITY_CATALOG, ... }
 *     from "@/shared/governance";
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Convenções de nomenclatura ────────────────────────────────────────────────
export * from "./naming";

// ── Registo de módulos ────────────────────────────────────────────────────────
export * from "./modules";

// ── Catálogo de entidades e relacionamentos ───────────────────────────────────
export * from "./entities";

// ── Máquinas de estado ────────────────────────────────────────────────────────
export * from "./states";

// ── Sistema de permissões RBAC ────────────────────────────────────────────────
export * from "./permissions";

// ── Fluxos operacionais ───────────────────────────────────────────────────────
export * from "./flows";
