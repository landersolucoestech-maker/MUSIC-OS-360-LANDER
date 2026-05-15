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
