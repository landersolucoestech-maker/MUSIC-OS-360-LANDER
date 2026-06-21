export { SkillEngine, getSkillEngine } from "./SkillEngine";
export * from "./social-content";
export * from "./paid-ads";
export * from "./analytics-tracking";
export * from "./onboarding-cro";
// copywriting — re-export seletivo (exclui ValidationResult para evitar TS2308)
export type { CopywritingInput, CopywritingOutput, CopyPageType, CopyFormality } from "./copywriting";
export {
  COPYWRITING_SYSTEM_PROMPT,
  buildCopywritingPrompt,
  parseCopywritingResponse,
  validateCopywritingInput,
  validateCopywritingOutput,
} from "./copywriting";
// launch-strategy — re-export seletivo
export type {
  LaunchStrategyInput,
  LaunchStrategyOutput,
  LaunchType,
  LaunchPhase,
  LaunchPhaseDetail,
} from "./launch-strategy";
export {
  LAUNCH_STRATEGY_SYSTEM_PROMPT,
  buildLaunchStrategyPrompt,
  parseLaunchStrategyResponse,
  validateLaunchStrategyInput,
  validateLaunchStrategyOutput,
} from "./launch-strategy";
// project-planning — re-export seletivo (exclui ValidationResult para evitar TS2308)
export type {
  ProjectPlanningInput,
  ProjectPlanningOutput,
  ProjectPlanningLanguage,
  ProjectPhase,
  ProjectTask,
  ProjectRisk,
  ProjectOwner,
  ProjectMilestone,
  TaskPriority,
  RiskSeverity,
  ProjectPlanningTemplate,
} from "./project-planning";
export {
  PROJECT_PLANNING_SYSTEM_PROMPT,
  buildProjectPlanningPrompt,
  parseProjectPlanningResponse,
  validateProjectPlanningInput,
  validateProjectPlanningOutput,
  PROJECT_PLANNING_TEMPLATES,
  getProjectPlanningTemplate,
} from "./project-planning";
// release-checklist — re-export seletivo (exclui ValidationResult para evitar TS2308)
export type {
  ReleaseChecklistInput,
  ReleaseChecklistOutput,
  ReleaseChecklistLanguage,
  ReleaseType,
  ReleaseStatus,
  ItemSeverity,
  ActionPriority,
  MissingItem,
  CriticalIssue,
  ChecklistItem,
  RecommendedAction,
  MetadataReview,
  ReleaseChecklistTemplate,
} from "./release-checklist";
export {
  RELEASE_CHECKLIST_SYSTEM_PROMPT,
  buildReleaseChecklistPrompt,
  parseReleaseChecklistResponse,
  validateReleaseChecklistInput,
  validateReleaseChecklistOutput,
  RELEASE_CHECKLIST_TEMPLATES,
  getReleaseChecklistTemplate,
} from "./release-checklist";
// contract-analysis — re-export seletivo (exclui ValidationResult e RiskSeverity
// para evitar TS2308: RiskSeverity já é exportado por ./project-planning)
export type {
  ContractAnalysisInput,
  ContractAnalysisOutput,
  ContractAnalysisLanguage,
  ContractType,
  ClauseImportance,
  ContractParty,
  ContractTerm,
  ContractRight,
  ContractObligation,
  RevenueTerm,
  ExclusivityTerm,
  ContractRisk,
  MissingClause,
  ContractAnalysisTemplate,
} from "./contract-analysis";
export {
  CONTRACT_ANALYSIS_SYSTEM_PROMPT,
  CONTRACT_ANALYSIS_DISCLAIMER,
  buildContractAnalysisPrompt,
  parseContractAnalysisResponse,
  validateContractAnalysisInput,
  validateContractAnalysisOutput,
  CONTRACT_ANALYSIS_TEMPLATES,
  getContractAnalysisTemplate,
} from "./contract-analysis";
// catalog-metadata-validator — re-export seletivo (nomes próprios e únicos;
// usa os tipos compartilhados de domain, sem nomes genéricos no barrel)
export type {
  CatalogMetadataValidatorInput,
  CatalogMetadataValidatorOutput,
  CatalogMetadataType,
  CatalogComposer,
  CatalogShare,
  CatalogFieldIssue,
  DuplicateRisk,
  RightsRisk,
  NormalizedMetadata,
  RecommendedFix,
  CatalogMetadataTemplate,
} from "./catalog-metadata-validator";
export {
  CATALOG_METADATA_VALIDATOR_SYSTEM_PROMPT,
  buildCatalogMetadataValidatorPrompt,
  parseCatalogMetadataValidatorResponse,
  validateCatalogMetadataValidatorInput,
  validateCatalogMetadataValidatorOutput,
  CATALOG_METADATA_TEMPLATES,
  getCatalogMetadataTemplate,
} from "./catalog-metadata-validator";
// financial-classification — re-export seletivo (nomes próprios e únicos;
// usa os tipos compartilhados de domain, sem nomes genéricos no barrel)
export type {
  FinancialClassificationInput,
  FinancialClassificationOutput,
  FinancialDirection,
  FinancialRecurrence,
  LinkedEntityType,
  LinkedEntitySuggestion,
  FinancialRisk,
  FinancialRecommendedAction,
  FinancialCostCenterTemplate,
} from "./financial-classification";
export {
  FINANCIAL_CLASSIFICATION_SYSTEM_PROMPT,
  buildFinancialClassificationPrompt,
  parseFinancialClassificationResponse,
  validateFinancialClassificationInput,
  validateFinancialClassificationOutput,
  FINANCIAL_CLASSIFICATION_TEMPLATES,
  getFinancialClassificationTemplate,
} from "./financial-classification";
// crm-followup — re-export seletivo (nomes próprios e únicos;
// usa os tipos compartilhados de domain, sem nomes genéricos no barrel)
export type {
  CrmFollowupInput,
  CrmFollowupOutput,
  CrmLeadType,
  CrmStage,
  CrmObjection,
  CrmTask,
  CrmStageRecommendation,
  CrmRisk,
  CrmStageTemplate,
} from "./crm-followup";
export {
  CRM_FOLLOWUP_SYSTEM_PROMPT,
  buildCrmFollowupPrompt,
  parseCrmFollowupResponse,
  validateCrmFollowupInput,
  validateCrmFollowupOutput,
  CRM_STAGE_TEMPLATES,
  getCrmStageTemplate,
  CRM_LEAD_TYPE_HINTS,
} from "./crm-followup";
// audiovisual-briefing — re-export seletivo (nomes próprios e únicos;
// usa os tipos compartilhados de domain, sem nomes genéricos no barrel)
export type {
  AudiovisualBriefingInput,
  AudiovisualBriefingOutput,
  AudiovisualContentType,
  AudiovisualBudgetLevel,
  AudiovisualAssetType,
  AudiovisualScriptScene,
  AudiovisualScene,
  AudiovisualAsset,
  AudiovisualChecklistItem,
  AudiovisualTeamNeed,
  AudiovisualDeliverable,
  AudiovisualRisk,
  AudiovisualBriefingTemplate,
} from "./audiovisual-briefing";
export {
  AUDIOVISUAL_BRIEFING_SYSTEM_PROMPT,
  buildAudiovisualBriefingPrompt,
  parseAudiovisualBriefingResponse,
  validateAudiovisualBriefingInput,
  validateAudiovisualBriefingOutput,
  AUDIOVISUAL_BRIEFING_TEMPLATES,
  getAudiovisualBriefingTemplate,
} from "./audiovisual-briefing";
// marketing-calendar-builder — re-export seletivo (nomes próprios e únicos;
// usa os tipos compartilhados de domain, sem nomes genéricos no barrel)
export type {
  MarketingCalendarBuilderInput,
  MarketingCalendarBuilderOutput,
  MarketingPlatform,
  MarketingFrequency,
  MarketingCalendarStatus,
  MarketingCalendarEntry,
  ContentPillar,
  MarketingDailyAction,
  PlatformStrategy,
  MarketingCampaignPhase,
  MarketingProductionNeed,
  MarketingFrequencyTemplate,
} from "./marketing-calendar-builder";
export {
  MARKETING_CALENDAR_BUILDER_SYSTEM_PROMPT,
  buildMarketingCalendarBuilderPrompt,
  parseMarketingCalendarBuilderResponse,
  validateMarketingCalendarBuilderInput,
  validateMarketingCalendarBuilderOutput,
  MARKETING_FREQUENCY_TEMPLATES,
  getMarketingFrequencyTemplate,
  MARKETING_PLATFORM_HINTS,
} from "./marketing-calendar-builder";
// artist-profile-analysis — re-export seletivo (nomes próprios e únicos;
// usa os tipos compartilhados de domain, sem nomes genéricos no barrel)
export type {
  ArtistProfileAnalysisInput,
  ArtistProfileAnalysisOutput,
  ArtistPlatformProfile,
  ArtistStrength,
  ArtistWeakness,
  ArtistOpportunity,
  ArtistRisk,
  ArtistRecommendedAction,
  ArtistPlatformRecommendation,
  ArtistAnalysisDimension,
} from "./artist-profile-analysis";
export {
  ARTIST_PROFILE_ANALYSIS_SYSTEM_PROMPT,
  buildArtistProfileAnalysisPrompt,
  parseArtistProfileAnalysisResponse,
  validateArtistProfileAnalysisInput,
  validateArtistProfileAnalysisOutput,
  ARTIST_ANALYSIS_DIMENSIONS,
  ARTIST_FOLLOWERS_TIERS,
  getArtistFollowersTier,
} from "./artist-profile-analysis";
// licensing-opportunity-analysis — re-export seletivo (nomes próprios e únicos;
// usa os tipos compartilhados de domain, sem nomes genéricos no barrel)
export type {
  LicensingOpportunityAnalysisInput,
  LicensingOpportunityAnalysisOutput,
  LicensingUsageType,
  LicensingViability,
  RightsCheckStatus,
  LicensingDecision,
  SuggestedPriceRange,
  RightsCheck,
  LicensingRisk,
  LicensingUsageTemplate,
} from "./licensing-opportunity-analysis";
export {
  LICENSING_OPPORTUNITY_ANALYSIS_SYSTEM_PROMPT,
  LICENSING_ANALYSIS_DISCLAIMER,
  buildLicensingOpportunityAnalysisPrompt,
  parseLicensingOpportunityAnalysisResponse,
  validateLicensingOpportunityAnalysisInput,
  validateLicensingOpportunityAnalysisOutput,
  LICENSING_USAGE_TEMPLATES,
  getLicensingUsageTemplate,
} from "./licensing-opportunity-analysis";
// rights-monitoring-analysis — re-export seletivo (nomes próprios e únicos;
// usa os tipos compartilhados de domain, sem nomes genéricos no barrel)
export type {
  RightsMonitoringAnalysisInput,
  RightsMonitoringAnalysisOutput,
  InfringementRisk,
  RightsMonitoringAction,
  RightsMonitoringRisk,
  RightsMonitoringActionTemplate,
} from "./rights-monitoring-analysis";
export {
  RIGHTS_MONITORING_ANALYSIS_SYSTEM_PROMPT,
  RIGHTS_MONITORING_DISCLAIMER,
  buildRightsMonitoringAnalysisPrompt,
  parseRightsMonitoringAnalysisResponse,
  validateRightsMonitoringAnalysisInput,
  validateRightsMonitoringAnalysisOutput,
  RIGHTS_MONITORING_ACTION_TEMPLATES,
  getRightsMonitoringActionTemplate,
  MATCH_CONFIDENCE_GUIDANCE,
  suggestActionByConfidence,
} from "./rights-monitoring-analysis";
// support-triage — re-export seletivo (nomes próprios e únicos;
// usa os tipos compartilhados de domain, sem nomes genéricos no barrel)
export type {
  SupportTriageInput,
  SupportTriageOutput,
  SupportModule,
  SLARecommendation,
  SupportRecommendedAction,
  SupportCategoryTemplate,
} from "./support-triage";
export {
  SUPPORT_TRIAGE_SYSTEM_PROMPT,
  buildSupportTriagePrompt,
  parseSupportTriageResponse,
  validateSupportTriageInput,
  validateSupportTriageOutput,
  SUPPORT_CATEGORY_TEMPLATES,
  getSupportCategoryTemplate,
  SUPPORT_SLA_REFERENCE,
} from "./support-triage";
