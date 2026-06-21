export {
  GenerateContentUseCase,
  getGenerateContentUseCase,
} from "./GenerateContent.usecase";
export type {
  GenerateContentInput,
  GenerateContentResult,
} from "./GenerateContent.usecase";

export {
  GenerateCampaignUseCase,
  getGenerateCampaignUseCase,
} from "./GenerateCampaign.usecase";
export type {
  GenerateCampaignInput,
  GenerateCampaignResult,
} from "./GenerateCampaign.usecase";

export {
  GenerateLaunchStrategyUseCase,
  getGenerateLaunchStrategyUseCase,
} from "./GenerateLaunchStrategy.usecase";
export type {
  GenerateLaunchStrategyInput,
  GenerateLaunchStrategyResult,
} from "./GenerateLaunchStrategy.usecase";

// Fiação read-only das 12 Skills novas (usecase genérico + proveniência)
export {
  RunSkillUseCase,
  getRunSkillUseCase,
} from "./RunSkill.usecase";
export type {
  RunSkillInput,
  RunSkillResult,
  RunnableSkillName,
  SkillParsedOutput,
} from "./RunSkill.usecase";
export { buildSkillProvenance } from "./skill-provenance";
export type {
  SkillProvenance,
  SkillProvenanceSource,
  BuildSkillProvenanceParams,
} from "./skill-provenance";
