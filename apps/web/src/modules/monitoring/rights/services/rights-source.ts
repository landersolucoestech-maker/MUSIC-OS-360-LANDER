/**
 * modules/monitoring/rights/services/rights-source.ts
 *
 * Gate de exposição dos mocks de Rights Monitoring.
 * Em produção, retorna empty arrays — o backend não tem endpoints reais ainda
 * para execuções públicas / detecções de broadcast / cue sheets / setlists.
 * (O endpoint /content-detections existe mas é genérico — uma futura integração
 * deve consumi-lo aqui.)
 */
import type {
  RightsExecution, BroadcastDetection, CueSheet, Setlist, EcadPeriodo,
  ExecucaoTimelineEvent, EcadHistoricoISRC,
} from "../types";

export const RIGHTS_DATA_IS_MOCK = false as const;

export const RIGHTS_EXECUCOES: RightsExecution[] =
  [];
export const RIGHTS_BROADCAST_DETECTIONS: BroadcastDetection[] =
  [];
export const RIGHTS_CUE_SHEETS: CueSheet[] = [];
export const RIGHTS_SETLISTS: Setlist[]    = [];
export const RIGHTS_ECAD_PERIODOS: EcadPeriodo[] =
  [];
export const RIGHTS_TIMELINE_BY_ISRC: Record<string, ExecucaoTimelineEvent[]> =
  {};
export const RIGHTS_ECAD_HISTORICO_ISRC: Record<string, EcadHistoricoISRC[]> =
  {};
