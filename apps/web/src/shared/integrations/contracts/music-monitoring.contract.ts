/**
 * shared/integrations/contracts/music-monitoring.contract.ts
 *
 * Contrato de monitoramento musical por fingerprint (ACRCloud-style).
 *
 * Cobre:
 *   - Identificação de músicas por fingerprint de áudio
 *   - Relatórios de execução em rádio, TV, plataformas digitais
 *   - Alertas em tempo real de uso não autorizado
 *   - Busca de artistas, obras e fonogramas no banco do provedor
 *   - Configuração de projetos de monitoramento por artista/obra
 *
 * ESTADO ACTUAL:
 *   - ACRCloud: mock funcional (useACRCloud.ts + mock-music-monitoring.provider.ts)
 *
 * MIGRAÇÃO FUTURA:
 *   - ACRCloudProvider implementa IMusicMonitoringProvider com a API real
 */

// ─── Identificação de fonte ────────────────────────────────────────────────────

export type MonitoringSourceType =
  | "radio"        // Rádio AM/FM
  | "tv"           // Televisão aberta / cable
  | "streaming"    // Spotify, Deezer, YouTube Music, Apple Music
  | "video"        // YouTube, TikTok, Instagram Reels
  | "podcast"      // Podcasts e programas de áudio
  | "venue"        // Shows, eventos ao vivo
  | "public"       // Ambientes comerciais (loja, restaurante)
  | "unknown";

// ─── DTOs de fingerprint ───────────────────────────────────────────────────────

export interface FingerprintInput {
  /** Áudio em base64 ou URL pública do trecho */
  audio_data: string;
  /** Duração do trecho em segundos (padrão: 10s) */
  duration_seconds?: number;
  /** Fonte do trecho para contexto */
  source_type?: MonitoringSourceType;
  /** Nome da estação/plataforma (ex.: "Rádio CBN", "Spotify") */
  source_name?: string;
}

export interface FingerprintMatch {
  /** Confidence score 0–100 */
  score: number;
  titulo: string;
  artista: string;
  isrc?: string | null;
  iswc?: string | null;
  album?: string | null;
  gravadora?: string | null;
  duracao_segundos?: number | null;
  data_lancamento?: string | null;
  genero?: string | null;
  /** Identificador interno do ACRCloud */
  external_id: string;
  /** Posição no trecho onde a música foi detectada (segundos) */
  offset_segundos?: number | null;
  /** ID local da obra/fonograma se cruzamento for bem-sucedido */
  local_work_id?: string | null;
  local_fonograma_id?: string | null;
}

export interface FingerprintResult {
  matched: boolean;
  matches: FingerprintMatch[];
  best_match?: FingerprintMatch | null;
  processing_time_ms: number;
  fingerprint_id: string;
  detected_at: string;
}

// ─── DTOs de relatórios de execução ──────────────────────────────────────────

export interface PlayReport {
  id: string;
  titulo: string;
  artista: string;
  isrc?: string | null;
  iswc?: string | null;
  source_type: MonitoringSourceType;
  source_name: string;
  /** País de execução (ISO 3166-1 alpha-2) */
  country?: string | null;
  played_at: string;
  duration_seconds: number;
  /** Estimativa de audiência da execução */
  estimated_audience?: number | null;
  /** Valor informado por plataforma externa em centavos (BRL); sem cálculo interno */
  external_reported_amount_cents?: number | null;
  /** ID local do fonograma se cruzamento for bem-sucedido */
  local_fonograma_id?: string | null;
  local_work_id?: string | null;
  status: "pending" | "confirmed" | "disputed" | "paid";
}

export interface PlayReportQuery {
  isrc?: string;
  iswc?: string;
  artista?: string;
  titulo?: string;
  source_type?: MonitoringSourceType;
  /** Período inicial "YYYY-MM-DD" */
  date_from?: string;
  /** Período final "YYYY-MM-DD" */
  date_to?: string;
  limit?: number;
  offset?: number;
}

export interface PlayReportSummary {
  total_plays: number;
  total_duration_seconds: number;
  external_reported_amount_cents: number;
  by_source: Record<MonitoringSourceType, number>;
  by_country: Record<string, number>;
  period_from: string;
  period_to: string;
}

// ─── DTOs de alertas ──────────────────────────────────────────────────────────

export type AlertSeverity = "critical" | "warning" | "info";

export type AlertType =
  | "unauthorized_use"       // Uso sem licença detectado
  | "high_play_count"        // Pico de execuções inesperado
  | "new_territory"          // Detecção em novo país/região
  | "unregistered_track"     // Fingerprint sem registro de ISRC/ISWC
  | "external_data_discrepancy"    // Arrecadação abaixo do esperado
  | "source_new"             // Nova fonte de execução detectada
  | "sync_required";         // Sincronização necessária

export interface MonitoringAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  titulo: string;
  artista?: string | null;
  isrc?: string | null;
  iswc?: string | null;
  source_name?: string | null;
  message: string;
  detected_at: string;
  acknowledged: boolean;
  acknowledged_at?: string | null;
  local_work_id?: string | null;
  local_fonograma_id?: string | null;
}

// ─── DTOs de projetos de monitoramento ───────────────────────────────────────

export interface MonitoringProject {
  id: string;
  name: string;
  artista_nome?: string | null;
  /** ISRCs a monitorar */
  isrcs: string[];
  /** ISWCs a monitorar */
  iswcs: string[];
  /** Fontes a monitorar */
  sources: MonitoringSourceType[];
  /** Países a monitorar (ISO 3166-1 alpha-2, empty = todos) */
  countries: string[];
  active: boolean;
  created_at: string;
  last_detection_at?: string | null;
  total_detections: number;
}

export interface CreateMonitoringProjectInput {
  name: string;
  artista_nome?: string;
  isrcs?: string[];
  iswcs?: string[];
  sources?: MonitoringSourceType[];
  countries?: string[];
}

// ─── DTOs de busca de catálogo ───────────────────────────────────────────────

export interface MusicSearchQuery {
  query: string;
  field?: "titulo" | "artista" | "isrc" | "iswc" | "all";
  limit?: number;
}

export interface MusicSearchResult {
  external_id: string;
  titulo: string;
  artista: string;
  isrc?: string | null;
  iswc?: string | null;
  album?: string | null;
  gravadora?: string | null;
  duracao_segundos?: number | null;
  data_lancamento?: string | null;
  genero?: string | null;
  total_plays_30d?: number | null;
}

// ─── Contrato ─────────────────────────────────────────────────────────────────

/**
 * IMusicMonitoringProvider — contrato de monitoramento musical por fingerprint.
 *
 * Implementações previstas:
 *   - MockMusicMonitoringProvider  (standalone — dados simulados)
 *   - ACRCloudProvider             (produção — API ACRCloud v2)
 */
export interface IMusicMonitoringProvider {
  readonly provider_name: string;

  /** Identifica uma música por fingerprint de áudio */
  identify(input: FingerprintInput): Promise<FingerprintResult>;

  /** Lista relatórios de execução por filtro */
  getPlayReports(query: PlayReportQuery): Promise<PlayReport[]>;

  /** Resumo de execuções por período */
  getPlayReportSummary(query: PlayReportQuery): Promise<PlayReportSummary>;

  /** Lista alertas activos ou histórico */
  getAlerts(options?: { unacknowledged_only?: boolean; limit?: number }): Promise<MonitoringAlert[]>;

  /** Marca um alerta como lido */
  acknowledgeAlert(alertId: string): Promise<void>;

  /** Pesquisa músicas/artistas no catálogo do provedor */
  search(query: MusicSearchQuery): Promise<MusicSearchResult[]>;

  /** Cria um projecto de monitoramento */
  createProject(input: CreateMonitoringProjectInput): Promise<MonitoringProject>;

  /** Lista projectos de monitoramento */
  listProjects(): Promise<MonitoringProject[]>;

  /** Activa/desactiva um projecto de monitoramento */
  toggleProject(projectId: string, active: boolean): Promise<MonitoringProject>;

  /** Verifica conexão com o provedor */
  verifyConnection(): Promise<{ ok: boolean; quota_remaining?: number; plan?: string }>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const MONITORING_SOURCE_LABELS: Record<MonitoringSourceType, string> = {
  radio:     "Rádio",
  tv:        "TV",
  streaming: "Streaming",
  video:     "Vídeo",
  podcast:   "Podcast",
  venue:     "Show/Evento",
  public:    "Ambiente Público",
  unknown:   "Desconhecido",
};

export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  unauthorized_use:    "Uso Não Autorizado",
  high_play_count:     "Alto Volume de Execuções",
  new_territory:       "Novo Território",
  unregistered_track:  "Faixa Sem Registro",
  external_data_discrepancy: "Discrepância de Recebimentos externos de direitos",
  source_new:          "Nova Fonte Detectada",
  sync_required:       "Sincronização Necessária",
};

/** Chave de localStorage para relatórios de execução cacheados */
export function playReportsStorageKey(isrc: string): string {
  return `musicos360_acrcloud_plays_${isrc}`;
}

/** Chave de localStorage para projectos de monitoramento */
export const MONITORING_PROJECTS_KEY = "musicos360_acrcloud_projects";

/** Chave de localStorage para alertas */
export const MONITORING_ALERTS_KEY = "musicos360_acrcloud_alerts";
