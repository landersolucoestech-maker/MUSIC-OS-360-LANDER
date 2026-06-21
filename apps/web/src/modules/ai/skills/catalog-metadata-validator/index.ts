/**
 * modules/ai/skills/catalog-metadata-validator/index.ts
 *
 * Consolidação: a lógica canônica de catalog-metadata-validator (contracts, prompt,
 * parser, validators) vem do pacote compartilhado @music-os-360/ai-skills.
 * Apenas o template permanece local (ainda não migrado ao pacote).
 *
 * Re-export seletivo (sem expor ValidationResult) — preserva o contrato público
 * consumido por SkillEngine e pelo barrel skills/index.ts, evitando TS2308.
 */

export {
  CATALOG_METADATA_VALIDATOR_SYSTEM_PROMPT,
  buildCatalogMetadataValidatorPrompt,
  parseCatalogMetadataValidatorResponse,
  validateCatalogMetadataValidatorInput,
  validateCatalogMetadataValidatorOutput,
} from "@music-os-360/ai-skills";

export type {
  CatalogMetadataValidatorInput,
  CatalogMetadataValidatorOutput,
  CatalogMetadataValidatorLanguage,
  CatalogMetadataType,
  CatalogComposer,
  CatalogShare,
  CatalogFieldIssue,
  DuplicateRisk,
  RightsRisk,
  NormalizedMetadata,
  RecommendedFix,
} from "@music-os-360/ai-skills";

// Template permanece local (não faz parte do pacote ainda).
export * from "./templates/catalog-metadata-validator.template";
