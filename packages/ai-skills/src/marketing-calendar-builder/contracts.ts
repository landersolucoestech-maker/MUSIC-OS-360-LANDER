/**
 * skills/marketing-calendar-builder/contracts/marketing-calendar-builder.contracts.ts
 *
 * Contratos da skill marketing-calendar-builder (version 1.0.0).
 * Construção de calendário de marketing musical (pré/lançamento/pós/institucional).
 * Usa os tipos compartilhados de domain/ai.types (SkillLanguage/SkillPriority).
 */

import type { SkillLanguage, SkillPriority } from "../shared/primitives";

export type MarketingPlatform =
  | "instagram"
  | "tiktok"
  | "youtube"
  | "shorts"
  | "spotify"
  | "facebook"
  | "x"
  | "linkedin"
  | "website"
  | "email"
  | "whatsapp"
  | "other";

export type MarketingFrequency = "low" | "medium" | "high" | "intensive";

export type MarketingCalendarStatus = "planned";

// ─── Input ────────────────────────────────────────────────────────────────────

export interface MarketingCalendarBuilderInput {
  artistName: string;
  releaseTitle?: string;
  campaignGoal: string;
  startDate: string;
  endDate: string;
  platforms: MarketingPlatform[];
  frequency: MarketingFrequency;
  context?: string;
  language?: SkillLanguage;
}

// ─── Blocos de saída ──────────────────────────────────────────────────────────

export interface MarketingCalendarEntry {
  date: string;
  platform: string;
  contentType: string;
  title: string;
  description: string;
  cta?: string;
  status: MarketingCalendarStatus;
}

export interface ContentPillar {
  pillar: string;
  description: string;
  examples: string[];
}

export interface MarketingDailyAction {
  date: string;
  action: string;
  priority: SkillPriority;
}

export interface PlatformStrategy {
  platform: string;
  strategy: string;
  frequencySuggestion: string;
}

export interface MarketingCampaignPhase {
  name: string;
  startDate: string;
  endDate: string;
  objective: string;
}

export interface MarketingProductionNeed {
  item: string;
  area: string;
  priority: SkillPriority;
}

// ─── Output ───────────────────────────────────────────────────────────────────

export interface MarketingCalendarBuilderOutput {
  calendar: MarketingCalendarEntry[];
  contentPillars: ContentPillar[];
  dailyActions: MarketingDailyAction[];
  platformStrategy: PlatformStrategy[];
  CTAs: string[];
  campaignPhases: MarketingCampaignPhase[];
  productionNeeds: MarketingProductionNeed[];
}
