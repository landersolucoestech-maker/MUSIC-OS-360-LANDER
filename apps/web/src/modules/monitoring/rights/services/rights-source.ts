/**
 * modules/monitoring/rights/services/rights-source.ts
 *
 * Gate de exposição dos mocks de Rights Monitoring.
 * Em produção, retorna empty arrays — o backend não tem endpoints reais ainda
 * para execuções públicas / detecções de broadcast / cue sheets / setlists.
 * (O endpoint /content-detections existe mas é genérico — uma futura integração
 * deve consumi-lo aqui.)
 */
import { IS_PROD } from "@/shared/lib/env";
import type {
  RightsExecution, BroadcastDetection, CueSheet, Setlist, EcadPeriodo,
  ExecucaoTimelineEvent, EcadHistoricoISRC,
} from "../types";
import {
  MOCK_EXECUCOES_PUBLICAS,
  MOCK_BROADCAST_DETECTIONS,
  MOCK_CUE_SHEETS,
  MOCK_SETLISTS,
  MOCK_ECAD_PERIODOS,
  MOCK_TIMELINE_BY_ISRC,
  MOCK_ECAD_HISTORICO_ISRC,
} from "./mock-data";

export const RIGHTS_DATA_IS_MOCK: boolean = !IS_PROD;

export const RIGHTS_EXECUCOES: RightsExecution[] =
  IS_PROD ? [] : MOCK_EXECUCOES_PUBLICAS;
export const RIGHTS_BROADCAST_DETECTIONS: BroadcastDetection[] =
  IS_PROD ? [] : MOCK_BROADCAST_DETECTIONS;
export const RIGHTS_CUE_SHEETS: CueSheet[] = IS_PROD ? [] : MOCK_CUE_SHEETS;
export const RIGHTS_SETLISTS: Setlist[]    = IS_PROD ? [] : MOCK_SETLISTS;
export const RIGHTS_ECAD_PERIODOS: EcadPeriodo[] =
  IS_PROD ? [] : MOCK_ECAD_PERIODOS;
export const RIGHTS_TIMELINE_BY_ISRC: Record<string, ExecucaoTimelineEvent[]> =
  IS_PROD ? {} : MOCK_TIMELINE_BY_ISRC;
export const RIGHTS_ECAD_HISTORICO_ISRC: Record<string, EcadHistoricoISRC[]> =
  IS_PROD ? {} : MOCK_ECAD_HISTORICO_ISRC;
