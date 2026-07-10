import type {
  RightsExecution,
  BroadcastDetection,
  CueSheet,
  Setlist,
  EcadImport,
  EcadPeriodo,
  ExecucaoTimelineEvent,
  EcadHistoricoISRC,
} from "../types";

export const MOCK_EXECUCOES_PUBLICAS: RightsExecution[] = [];
export const MOCK_BROADCAST_DETECTIONS: BroadcastDetection[] = [];
export const MOCK_CUE_SHEETS: CueSheet[] = [];
export const MOCK_SETLISTS: Setlist[] = [];
export const MOCK_ECAD_IMPORTS: EcadImport[] = [];
export const MOCK_ECAD_PERIODOS: EcadPeriodo[] = [];
export const MOCK_TIMELINE_BY_ISRC: Record<string, ExecucaoTimelineEvent[]> = {};
export const MOCK_ECAD_HISTORICO_ISRC: Record<string, EcadHistoricoISRC[]> = {};
