/**
 * modules/ai/application/RunSkill.usecase.ts
 *
 * UseCase genérico READ-ONLY para executar as 12 Skills novas via SkillEngine.
 *
 * Garantias:
 *  — somente leitura: executa a skill e devolve o resultado;
 *  — NÃO grava, NÃO emite eventos, NÃO usa filas, NÃO chama módulos de negócio,
 *    NÃO cria notificações nem automações;
 *  — NÃO altera o `parsed` das skills;
 *  — restrito às 12 skills novas (skills antigas não são despachadas aqui).
 *
 * Proveniência (model vs heuristic-fallback) é calculada ao redor do output
 * por skill-provenance.ts, sem tocar no contrato das skills.
 */

import { MOCK_MODE } from "@/shared/lib/env";
import type { AIProviderName, AIModelId } from "../domain/ai.types";
import { getSkillEngine } from "../skills/SkillEngine";
import { buildSkillProvenance } from "./skill-provenance";
import type { SkillProvenance } from "./skill-provenance";

import type {
  ProjectPlanningInput,
  ProjectPlanningOutput,
  ReleaseChecklistInput,
  ReleaseChecklistOutput,
  ContractAnalysisInput,
  ContractAnalysisOutput,
  CatalogMetadataValidatorInput,
  CatalogMetadataValidatorOutput,
  FinancialClassificationInput,
  FinancialClassificationOutput,
  CrmFollowupInput,
  CrmFollowupOutput,
  AudiovisualBriefingInput,
  AudiovisualBriefingOutput,
  MarketingCalendarBuilderInput,
  MarketingCalendarBuilderOutput,
  ArtistProfileAnalysisInput,
  ArtistProfileAnalysisOutput,
  LicensingOpportunityAnalysisInput,
  LicensingOpportunityAnalysisOutput,
  RightsMonitoringAnalysisInput,
  RightsMonitoringAnalysisOutput,
  SupportTriageInput,
  SupportTriageOutput,
} from "../skills";

// ─── Conjunto restrito de skills despacháveis ─────────────────────────────────

export type RunnableSkillName =
  | "project-planning"
  | "release-checklist"
  | "contract-analysis"
  | "catalog-metadata-validator"
  | "financial-classification"
  | "crm-followup"
  | "audiovisual-briefing"
  | "marketing-calendar-builder"
  | "artist-profile-analysis"
  | "licensing-opportunity-analysis"
  | "rights-monitoring-analysis"
  | "support-triage";

// ─── União discriminada de inputs (skill → input específico) ──────────────────

export type RunSkillInput =
  | { skill: "project-planning";               tenantId?: string; input: ProjectPlanningInput }
  | { skill: "release-checklist";              tenantId?: string; input: ReleaseChecklistInput }
  | { skill: "contract-analysis";              tenantId?: string; input: ContractAnalysisInput }
  | { skill: "catalog-metadata-validator";     tenantId?: string; input: CatalogMetadataValidatorInput }
  | { skill: "financial-classification";       tenantId?: string; input: FinancialClassificationInput }
  | { skill: "crm-followup";                   tenantId?: string; input: CrmFollowupInput }
  | { skill: "audiovisual-briefing";           tenantId?: string; input: AudiovisualBriefingInput }
  | { skill: "marketing-calendar-builder";     tenantId?: string; input: MarketingCalendarBuilderInput }
  | { skill: "artist-profile-analysis";        tenantId?: string; input: ArtistProfileAnalysisInput }
  | { skill: "licensing-opportunity-analysis"; tenantId?: string; input: LicensingOpportunityAnalysisInput }
  | { skill: "rights-monitoring-analysis";     tenantId?: string; input: RightsMonitoringAnalysisInput }
  | { skill: "support-triage";                 tenantId?: string; input: SupportTriageInput };

// ─── União dos outputs estruturados ───────────────────────────────────────────

export type SkillParsedOutput =
  | ProjectPlanningOutput
  | ReleaseChecklistOutput
  | ContractAnalysisOutput
  | CatalogMetadataValidatorOutput
  | FinancialClassificationOutput
  | CrmFollowupOutput
  | AudiovisualBriefingOutput
  | MarketingCalendarBuilderOutput
  | ArtistProfileAnalysisOutput
  | LicensingOpportunityAnalysisOutput
  | RightsMonitoringAnalysisOutput
  | SupportTriageOutput;

// ─── Resultado ────────────────────────────────────────────────────────────────

export interface RunSkillResult {
  skill: RunnableSkillName;
  parsed: SkillParsedOutput;
  provider: AIProviderName;
  model: AIModelId;
  provenance: SkillProvenance;
}

// ─── UseCase ─────────────────────────────────────────────────────────────────

export class RunSkillUseCase {
  private readonly engine = getSkillEngine();

  /**
   * executeSync — executa a skill selecionada e devolve `{ parsed, provider, model, provenance }`.
   * READ-ONLY: nenhum efeito colateral além da chamada à própria skill.
   * A validação de input é delegada ao método da skill (lança AIError em input inválido).
   */
  async executeSync(request: RunSkillInput): Promise<RunSkillResult> {
    const tenantId = request.tenantId?.trim() || "default";
    const engine = this.engine;

    let parsed: SkillParsedOutput;
    let provider: AIProviderName;
    let model: AIModelId;

    switch (request.skill) {
      case "project-planning": {
        const r = await engine.generateProjectPlan(request.input, tenantId);
        parsed = r.parsed; provider = r.provider; model = r.model;
        break;
      }
      case "release-checklist": {
        const r = await engine.generateReleaseChecklist(request.input, tenantId);
        parsed = r.parsed; provider = r.provider; model = r.model;
        break;
      }
      case "contract-analysis": {
        const r = await engine.analyzeContract(request.input, tenantId);
        parsed = r.parsed; provider = r.provider; model = r.model;
        break;
      }
      case "catalog-metadata-validator": {
        const r = await engine.validateCatalogMetadata(request.input, tenantId);
        parsed = r.parsed; provider = r.provider; model = r.model;
        break;
      }
      case "financial-classification": {
        const r = await engine.classifyFinancialTransaction(request.input, tenantId);
        parsed = r.parsed; provider = r.provider; model = r.model;
        break;
      }
      case "crm-followup": {
        const r = await engine.generateCrmFollowup(request.input, tenantId);
        parsed = r.parsed; provider = r.provider; model = r.model;
        break;
      }
      case "audiovisual-briefing": {
        const r = await engine.generateAudiovisualBriefing(request.input, tenantId);
        parsed = r.parsed; provider = r.provider; model = r.model;
        break;
      }
      case "marketing-calendar-builder": {
        const r = await engine.buildMarketingCalendar(request.input, tenantId);
        parsed = r.parsed; provider = r.provider; model = r.model;
        break;
      }
      case "artist-profile-analysis": {
        const r = await engine.analyzeArtistProfile(request.input, tenantId);
        parsed = r.parsed; provider = r.provider; model = r.model;
        break;
      }
      case "licensing-opportunity-analysis": {
        const r = await engine.analyzeLicensingOpportunity(request.input, tenantId);
        parsed = r.parsed; provider = r.provider; model = r.model;
        break;
      }
      case "rights-monitoring-analysis": {
        const r = await engine.analyzeRightsMonitoring(request.input, tenantId);
        parsed = r.parsed; provider = r.provider; model = r.model;
        break;
      }
      case "support-triage": {
        const r = await engine.triageSupportTicket(request.input, tenantId);
        parsed = r.parsed; provider = r.provider; model = r.model;
        break;
      }
      default: {
        // Exaustividade: se um caso novo for adicionado à união, o compilador acusa aqui.
        const _exhaustive: never = request;
        throw new Error(`RunSkill: skill não suportada — ${JSON.stringify(_exhaustive)}`);
      }
    }

    const provenance = buildSkillProvenance({
      skill: request.skill,
      parsed,
      provider,
      mockMode: MOCK_MODE,
    });

    return { skill: request.skill, parsed, provider, model, provenance };
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _instance: RunSkillUseCase | null = null;

export function getRunSkillUseCase(): RunSkillUseCase {
  if (!_instance) _instance = new RunSkillUseCase();
  return _instance;
}
