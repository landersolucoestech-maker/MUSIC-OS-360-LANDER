/**
 * modules/ai/skills/audiovisual-briefing/index.ts
 *
 * Camada de compatibilidade: a lógica canônica vem do pacote @music-os-360/ai-skills.
 * Apenas o template permanece local. Re-export seletivo (sem ValidationResult, evita TS2308).
 */

export {
  AUDIOVISUAL_BRIEFING_SYSTEM_PROMPT,
  buildAudiovisualBriefingPrompt,
  parseAudiovisualBriefingResponse,
  validateAudiovisualBriefingInput,
  validateAudiovisualBriefingOutput,
} from "@music-os-360/ai-skills";

export type {
  AudiovisualBriefingInput,
  AudiovisualBriefingOutput,
  AudiovisualContentType,
  AudiovisualBudgetLevel,
  AudiovisualAsset,
  AudiovisualAssetType,
  AudiovisualChecklistItem,
  AudiovisualDeliverable,
  AudiovisualRisk,
  AudiovisualScene,
  AudiovisualScriptScene,
  AudiovisualTeamNeed,
} from "@music-os-360/ai-skills";

export * from "./templates/audiovisual-briefing.template";
