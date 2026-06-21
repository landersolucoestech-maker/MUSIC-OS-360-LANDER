/**
 * modules/ai/skills/marketing-calendar-builder/index.ts
 *
 * Camada de compatibilidade: a lógica canônica vem do pacote @music-os-360/ai-skills.
 * Apenas o template permanece local. Re-export seletivo (sem ValidationResult, evita TS2308).
 */

export {
  MARKETING_CALENDAR_BUILDER_SYSTEM_PROMPT,
  buildMarketingCalendarBuilderPrompt,
  parseMarketingCalendarBuilderResponse,
  validateMarketingCalendarBuilderInput,
  validateMarketingCalendarBuilderOutput,
} from "@music-os-360/ai-skills";

export type {
  MarketingCalendarBuilderInput,
  MarketingCalendarBuilderOutput,
  MarketingPlatform,
  MarketingFrequency,
  MarketingCalendarEntry,
  MarketingCalendarStatus,
  MarketingCampaignPhase,
  MarketingDailyAction,
  MarketingProductionNeed,
  ContentPillar,
  PlatformStrategy,
} from "@music-os-360/ai-skills";

export * from "./templates/marketing-calendar-builder.template";
