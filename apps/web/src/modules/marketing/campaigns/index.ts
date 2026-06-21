/**
 * Campaigns domain — public barrel.
 *
 * The strategic, decimal-safe campaign domain (frontend domain layer): types,
 * money, metrics, allocation, platform strategies + registry and the factory
 * that turns a simple modal input into a full multiplatform Campaign.
 *
 * Content channels and paid-media platforms are intentionally NOT mapped onto
 * each other — paid media lives entirely in this domain.
 */

export * from "./domain/money";
export * from "./domain/metrics";
export * from "./domain/campaign-domain.types";
export * from "./domain/allocation";
export * from "./domain/campaign-factory";
export * from "./domain/financial.types";
export * from "./domain/financial-report.service";
export * from "./strategies/strategy.contract";
export { campaignPlatformRegistry, CampaignPlatformRegistry } from "./strategies/registry";

