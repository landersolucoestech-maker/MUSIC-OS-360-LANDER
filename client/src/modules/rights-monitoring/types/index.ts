/**
 * Tipos de domínio — Rights Monitoring (Execução Pública / ECAD)
 * NÃO misturar com streaming/DSP.
 */

export type ExecutionType =
  | "radio_fm"
  | "radio_am"
  | "tv_aberta"
  | "tv_fechada"
  | "show_ao_vivo"
  | "web_radio"
  | "casa_noturna"
  | "evento"
  | "cue_sheet"
  | "streaming_publico";

export type ExecutionStatus = "confirmado" | "pendente" | "divergencia" | "nao_reportado";

export interface RightsExecution {
  id: string;
  obra_titulo: string;
  artista: string;
  isrc: string;
  origem: string;
  tipo_execucao: ExecutionType;
  data_hora: string;
  match_ecad: boolean;
  valor_estimado: number;
  status: ExecutionStatus;
}

export interface BroadcastDetection {
  id: string;
  obra_titulo: string;
  artista: string;
  isrc: string;
  emissora: string;
  canal: string;
  tipo: "radio" | "tv" | "web_radio";
  data_hora: string;
  duracao_segundos: number;
  valor_estimado: number;
  status: ExecutionStatus;
}

export interface CueSheet {
  id: string;
  producao: string;
  canal: string;
  episodio?: string;
  data_exibicao: string;
  obras: CueSheetItem[];
  status: "enviado" | "pendente" | "aprovado" | "divergencia";
}

export interface CueSheetItem {
  obra_titulo: string;
  isrc: string;
  compositor: string;
  publisher: string;
  duracao_segundos: number;
  tipo_uso: "tema" | "trilha" | "incidental" | "tema_abertura";
}

export interface Setlist {
  id: string;
  artista: string;
  evento: string;
  local: string;
  data: string;
  musicas: SetlistItem[];
  status: "enviado" | "pendente" | "confirmado";
}

export interface SetlistItem {
  ordem: number;
  obra_titulo: string;
  isrc: string;
  compositor: string;
  duracao_segundos: number;
}

export interface EcadImport {
  id: string;
  arquivo: string;
  periodo: string;
  data_importacao: string;
  total_execucoes: number;
  total_obras: number;
  valor_total: number;
  status: "processado" | "pendente" | "erro" | "parcial";
  linhas_ok: number;
  linhas_erro: number;
}

export interface EcadPeriodo {
  id: string;
  periodo: string;
  valor_total: number;
  status: string;
  data_referencia: string;
  observacoes?: string;
}
