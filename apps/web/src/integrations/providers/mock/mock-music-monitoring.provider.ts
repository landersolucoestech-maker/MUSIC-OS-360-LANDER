/**
 * integrations/providers/mock/mock-music-monitoring.provider.ts
 *
 * MockMusicMonitoringProvider — implementação de IMusicMonitoringProvider
 * para modo standalone.
 *
 * Simula ACRCloud: fingerprint, relatórios de execução, alertas e projectos
 * de monitoramento com dados mock realistas.
 * Persiste alertas e projectos em localStorage (prefix: musicos360_acrcloud_).
 */

import type {
  IMusicMonitoringProvider,
  FingerprintInput,
  FingerprintResult,
  FingerprintMatch,
  PlayReport,
  PlayReportQuery,
  PlayReportSummary,
  MonitoringAlert,
  MonitoringProject,
  CreateMonitoringProjectInput,
  MusicSearchQuery,
  MusicSearchResult,
  MonitoringSourceType,
  AlertType,
  AlertSeverity,
} from "@/shared/integrations/contracts/music-monitoring.contract";

import {
  MONITORING_PROJECTS_KEY,
  MONITORING_ALERTS_KEY,
} from "@/shared/integrations/contracts/music-monitoring.contract";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function delay(ms = 600): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

function nowISO(): string {
  return new Date().toISOString();
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

function hoursAgo(n: number): string {
  return new Date(Date.now() - n * 3_600_000).toISOString();
}

function uuid(): string {
  return crypto.randomUUID();
}

// ─── Dados mock de catálogo ────────────────────────────────────────────────────

const MOCK_CATALOG: MusicSearchResult[] = [
  { external_id: "ACR-001", titulo: "Noite Estrelada", artista: "Banda Lusofonia", isrc: "BR-MSC-24-00001", iswc: "T-034.521.489-2", album: "Lua Cheia", gravadora: "MUSIC OS Records", duracao_segundos: 312, data_lancamento: "2024-03-15", genero: "MPB", total_plays_30d: 48_200 },
  { external_id: "ACR-002", titulo: "Sertão Profundo", artista: "João Barreto", isrc: "BR-MSC-24-00002", iswc: "T-091.234.567-1", album: "Raízes", gravadora: "MUSIC OS Records", duracao_segundos: 250, data_lancamento: "2024-01-20", genero: "Sertanejo", total_plays_30d: 92_400 },
  { external_id: "ACR-003", titulo: "Ressaca do Amor", artista: "Ana Paula Rodrigues", isrc: "BR-MSC-23-00089", iswc: "T-055.678.123-4", album: "Verão Quente", gravadora: "MUSIC OS Records", duracao_segundos: 235, data_lancamento: "2023-11-10", genero: "Forró", total_plays_30d: 71_100 },
  { external_id: "ACR-004", titulo: "Canto Livre", artista: "Marcelo Siqueira", isrc: null, iswc: null, album: "Libertação", gravadora: "MUSIC OS Records", duracao_segundos: 295, data_lancamento: "2024-04-01", genero: "Rock Brasileiro", total_plays_30d: 18_700 },
  { external_id: "ACR-005", titulo: "Baião de Dois Tempos", artista: "Banda Lusofonia", isrc: "BR-MSC-22-00312", iswc: "T-012.345.678-9", album: "Nordeste", gravadora: "MUSIC OS Records", duracao_segundos: 195, data_lancamento: "2022-06-24", genero: "Baião", total_plays_30d: 34_600 },
  { external_id: "ACR-006", titulo: "Deixa Rolar", artista: "Banda Lusofonia", isrc: "BR-MSC-24-00043", iswc: "T-078.432.100-3", album: "Lua Cheia", gravadora: "MUSIC OS Records", duracao_segundos: 198, data_lancamento: "2024-03-15", genero: "MPB", total_plays_30d: 22_300 },
];

// ─── Dados mock de play reports ───────────────────────────────────────────────

const MOCK_PLAY_REPORTS: PlayReport[] = [
  { id: "PR-001", titulo: "Noite Estrelada", artista: "Banda Lusofonia", isrc: "BR-MSC-24-00001", source_type: "radio",     source_name: "Rádio Globo",           country: "BR", played_at: hoursAgo(2),  duration_seconds: 312, estimated_audience: 1_200_000, estimated_royalty_cents: 480,  local_fonograma_id: "FON-001", status: "confirmed" },
  { id: "PR-002", titulo: "Sertão Profundo",  artista: "João Barreto",     isrc: "BR-MSC-24-00002", source_type: "streaming", source_name: "Spotify",               country: "BR", played_at: hoursAgo(4),  duration_seconds: 250, estimated_audience: 0,         estimated_royalty_cents: 12,   local_fonograma_id: "FON-002", status: "confirmed" },
  { id: "PR-003", titulo: "Noite Estrelada", artista: "Banda Lusofonia", isrc: "BR-MSC-24-00001", source_type: "tv",        source_name: "TV Globo",              country: "BR", played_at: hoursAgo(6),  duration_seconds: 45,  estimated_audience: 8_400_000, estimated_royalty_cents: 2_100, local_fonograma_id: "FON-001", status: "confirmed" },
  { id: "PR-004", titulo: "Ressaca do Amor",  artista: "Ana Paula Rodrigues", isrc: "BR-MSC-23-00089", source_type: "video",  source_name: "YouTube",             country: "BR", played_at: hoursAgo(8),  duration_seconds: 235, estimated_audience: 0,         estimated_royalty_cents: 8,    local_fonograma_id: "FON-003", status: "pending" },
  { id: "PR-005", titulo: "Baião de Dois Tempos", artista: "Banda Lusofonia", isrc: "BR-MSC-22-00312", source_type: "public", source_name: "Restaurante Nordeste", country: "BR", played_at: hoursAgo(10), duration_seconds: 195, estimated_audience: 0,         estimated_royalty_cents: 2,    local_fonograma_id: "FON-005", status: "pending" },
  { id: "PR-006", titulo: "Noite Estrelada", artista: "Banda Lusofonia", isrc: "BR-MSC-24-00001", source_type: "streaming", source_name: "Apple Music",          country: "US", played_at: daysAgo(1),   duration_seconds: 312, estimated_audience: 0,         estimated_royalty_cents: 22,   local_fonograma_id: "FON-001", status: "confirmed" },
  { id: "PR-007", titulo: "Sertão Profundo",  artista: "João Barreto",     isrc: "BR-MSC-24-00002", source_type: "radio",    source_name: "Rádio Itatiaia",        country: "BR", played_at: daysAgo(1),   duration_seconds: 250, estimated_audience: 380_000,   estimated_royalty_cents: 190,  local_fonograma_id: "FON-002", status: "confirmed" },
  { id: "PR-008", titulo: "Canto Livre",      artista: "Marcelo Siqueira", isrc: null,              source_type: "streaming", source_name: "Deezer",              country: "BR", played_at: daysAgo(2),   duration_seconds: 295, estimated_audience: 0,         estimated_royalty_cents: 6,    local_fonograma_id: "FON-004", status: "pending" },
  { id: "PR-009", titulo: "Noite Estrelada", artista: "Banda Lusofonia", isrc: "BR-MSC-24-00001", source_type: "podcast",   source_name: "Podcast Músicas BR",   country: "BR", played_at: daysAgo(3),   duration_seconds: 60,  estimated_audience: 12_000,    estimated_royalty_cents: 18,   local_fonograma_id: "FON-001", status: "pending" },
  { id: "PR-010", titulo: "Ressaca do Amor",  artista: "Ana Paula Rodrigues", isrc: "BR-MSC-23-00089", source_type: "venue",  source_name: "Show São Paulo",      country: "BR", played_at: daysAgo(4),   duration_seconds: 280, estimated_audience: 3_200,     estimated_royalty_cents: 320,  local_fonograma_id: "FON-003", status: "confirmed" },
];

// ─── Dados mock de alertas iniciais ──────────────────────────────────────────

const INITIAL_ALERTS: MonitoringAlert[] = [
  { id: "ALT-001", type: "unauthorized_use",    severity: "critical", titulo: "Noite Estrelada", artista: "Banda Lusofonia", isrc: "BR-MSC-24-00001", source_name: "Rádio Clandestina FM",      message: "Execução detectada em emissora não licenciada — Rádio Clandestina FM.", detected_at: hoursAgo(1),  acknowledged: false, local_fonograma_id: "FON-001" },
  { id: "ALT-002", type: "unregistered_track",  severity: "warning",  titulo: "Canto Livre",     artista: "Marcelo Siqueira",                         source_name: "Spotify",                   message: "Faixa detectada no Spotify sem ISRC registado. Registro necessário.",    detected_at: hoursAgo(3),  acknowledged: false, local_fonograma_id: "FON-004" },
  { id: "ALT-003", type: "new_territory",        severity: "info",     titulo: "Noite Estrelada", artista: "Banda Lusofonia", isrc: "BR-MSC-24-00001", source_name: "Apple Music US",            message: "Primeira detecção nos EUA. Considere licenciamento no território.",     detected_at: daysAgo(1),   acknowledged: false, local_fonograma_id: "FON-001" },
  { id: "ALT-004", type: "high_play_count",      severity: "info",     titulo: "Sertão Profundo", artista: "João Barreto",   isrc: "BR-MSC-24-00002", source_name: "Spotify",                   message: "Volume de execuções 340% acima da média nas últimas 24h.",            detected_at: daysAgo(2),   acknowledged: true,  acknowledged_at: daysAgo(1), local_fonograma_id: "FON-002" },
  { id: "ALT-005", type: "royalty_discrepancy",  severity: "warning",  titulo: "Ressaca do Amor", artista: "Ana Paula Rodrigues", isrc: "BR-MSC-23-00089",                                        message: "Arrecadação ECAD 28% abaixo do esperado para o volume de execuções.", detected_at: daysAgo(3),   acknowledged: false, local_fonograma_id: "FON-003" },
  { id: "ALT-006", type: "sync_required",        severity: "warning",  titulo: "Baião de Dois Tempos", artista: "Banda Lusofonia", isrc: "BR-MSC-22-00312",                                      message: "Último sync há 14 dias. Recomendada sincronização com ABRAMUS.",       detected_at: daysAgo(5),   acknowledged: false, local_fonograma_id: "FON-005" },
];

// ─── Dados mock de projectos iniciais ────────────────────────────────────────

const INITIAL_PROJECTS: MonitoringProject[] = [
  {
    id: "PROJ-001",
    name: "Banda Lusofonia — Monitoramento Completo",
    artista_nome: "Banda Lusofonia",
    isrcs: ["BR-MSC-24-00001", "BR-MSC-22-00312", "BR-MSC-24-00043"],
    iswcs: ["T-034.521.489-2", "T-012.345.678-9"],
    sources: ["radio", "tv", "streaming", "video", "venue"],
    countries: ["BR", "US", "PT"],
    active: true,
    created_at: daysAgo(30),
    last_detection_at: hoursAgo(2),
    total_detections: 1_847,
  },
  {
    id: "PROJ-002",
    name: "João Barreto — Sertanejo BR",
    artista_nome: "João Barreto",
    isrcs: ["BR-MSC-24-00002"],
    iswcs: ["T-091.234.567-1"],
    sources: ["radio", "streaming", "video"],
    countries: ["BR"],
    active: true,
    created_at: daysAgo(20),
    last_detection_at: hoursAgo(4),
    total_detections: 412,
  },
  {
    id: "PROJ-003",
    name: "MUSIC OS Records — Catálogo Geral",
    artista_nome: undefined,
    isrcs: ["BR-MSC-24-00001", "BR-MSC-24-00002", "BR-MSC-23-00089", "BR-MSC-22-00312"],
    iswcs: [],
    sources: ["radio", "tv", "streaming", "video", "podcast", "venue", "public"],
    countries: [],
    active: false,
    created_at: daysAgo(60),
    last_detection_at: daysAgo(15),
    total_detections: 3_201,
  },
];

// ─── localStorage helpers ────────────────────────────────────────────────────

function loadAlerts(): MonitoringAlert[] {
  try {
    const raw = localStorage.getItem(MONITORING_ALERTS_KEY);
    if (raw) return JSON.parse(raw) as MonitoringAlert[];
  } catch { /* fall through */ }
  localStorage.setItem(MONITORING_ALERTS_KEY, JSON.stringify(INITIAL_ALERTS));
  return INITIAL_ALERTS;
}

function saveAlerts(alerts: MonitoringAlert[]): void {
  localStorage.setItem(MONITORING_ALERTS_KEY, JSON.stringify(alerts));
}

function loadProjects(): MonitoringProject[] {
  try {
    const raw = localStorage.getItem(MONITORING_PROJECTS_KEY);
    if (raw) return JSON.parse(raw) as MonitoringProject[];
  } catch { /* fall through */ }
  localStorage.setItem(MONITORING_PROJECTS_KEY, JSON.stringify(INITIAL_PROJECTS));
  return INITIAL_PROJECTS;
}

function saveProjects(projects: MonitoringProject[]): void {
  localStorage.setItem(MONITORING_PROJECTS_KEY, JSON.stringify(projects));
}

// ─── MockMusicMonitoringProvider ──────────────────────────────────────────────

export class MockMusicMonitoringProvider implements IMusicMonitoringProvider {
  readonly provider_name = "ACRCloud (Mock)";

  // ── Fingerprint ─────────────────────────────────────────────────────────────

  async identify(input: FingerprintInput): Promise<FingerprintResult> {
    await delay(1_800);
    const fingerprint_id = `FP-${uuid().slice(0, 12).toUpperCase()}`;
    const detected_at    = nowISO();

    // Simula match com o catálogo mock
    const track = MOCK_CATALOG[Math.floor(Math.random() * MOCK_CATALOG.length)];
    const score  = 82 + Math.floor(Math.random() * 18);

    const bestMatch: FingerprintMatch = {
      score,
      titulo:            track.titulo,
      artista:           track.artista,
      isrc:              track.isrc,
      iswc:              track.iswc,
      album:             track.album,
      gravadora:         track.gravadora,
      duracao_segundos:  track.duracao_segundos,
      data_lancamento:   track.data_lancamento,
      genero:            track.genero,
      external_id:       track.external_id,
      offset_segundos:   Math.floor(Math.random() * 30),
    };

    return {
      matched:           true,
      matches:           [bestMatch],
      best_match:        bestMatch,
      processing_time_ms: 1_200 + Math.floor(Math.random() * 600),
      fingerprint_id,
      detected_at,
    };
  }

  // ── Play Reports ─────────────────────────────────────────────────────────────

  async getPlayReports(query: PlayReportQuery): Promise<PlayReport[]> {
    await delay(500);
    let reports = [...MOCK_PLAY_REPORTS];

    if (query.isrc)        reports = reports.filter(r => r.isrc === query.isrc);
    if (query.artista)     reports = reports.filter(r => r.artista.toLowerCase().includes(query.artista!.toLowerCase()));
    if (query.titulo)      reports = reports.filter(r => r.titulo.toLowerCase().includes(query.titulo!.toLowerCase()));
    if (query.source_type) reports = reports.filter(r => r.source_type === query.source_type);
    if (query.date_from)   reports = reports.filter(r => r.played_at >= query.date_from!);
    if (query.date_to)     reports = reports.filter(r => r.played_at <= query.date_to!);

    const offset = query.offset ?? 0;
    const limit  = query.limit  ?? 50;
    return reports.slice(offset, offset + limit);
  }

  async getPlayReportSummary(query: PlayReportQuery): Promise<PlayReportSummary> {
    const reports = await this.getPlayReports({ ...query, limit: 10_000 });

    const bySource = reports.reduce<Record<MonitoringSourceType, number>>((acc, r) => {
      acc[r.source_type] = (acc[r.source_type] ?? 0) + 1;
      return acc;
    }, {} as Record<MonitoringSourceType, number>);

    const byCountry = reports.reduce<Record<string, number>>((acc, r) => {
      const c = r.country ?? "unknown";
      acc[c] = (acc[c] ?? 0) + 1;
      return acc;
    }, {});

    return {
      total_plays:             reports.length,
      total_duration_seconds:  reports.reduce((s, r) => s + r.duration_seconds, 0),
      estimated_royalty_cents: reports.reduce((s, r) => s + (r.estimated_royalty_cents ?? 0), 0),
      by_source:               bySource,
      by_country:              byCountry,
      period_from:             query.date_from ?? daysAgo(30),
      period_to:               query.date_to   ?? nowISO(),
    };
  }

  // ── Alertas ──────────────────────────────────────────────────────────────────

  async getAlerts(options?: { unacknowledged_only?: boolean; limit?: number }): Promise<MonitoringAlert[]> {
    await delay(300);
    let alerts = loadAlerts();
    if (options?.unacknowledged_only) {
      alerts = alerts.filter(a => !a.acknowledged);
    }
    return alerts.slice(0, options?.limit ?? 50);
  }

  async acknowledgeAlert(alertId: string): Promise<void> {
    await delay(400);
    const alerts = loadAlerts();
    const idx    = alerts.findIndex(a => a.id === alertId);
    if (idx !== -1) {
      alerts[idx] = { ...alerts[idx], acknowledged: true, acknowledged_at: nowISO() };
      saveAlerts(alerts);
    }
  }

  // ── Busca de catálogo ────────────────────────────────────────────────────────

  async search(query: MusicSearchQuery): Promise<MusicSearchResult[]> {
    await delay(400);
    const q     = query.query.toLowerCase();
    const field = query.field ?? "all";
    const limit = query.limit ?? 20;

    const results = MOCK_CATALOG.filter(r => {
      if (field === "titulo")  return r.titulo.toLowerCase().includes(q);
      if (field === "artista") return r.artista.toLowerCase().includes(q);
      if (field === "isrc")    return r.isrc?.toLowerCase().includes(q);
      if (field === "iswc")    return r.iswc?.toLowerCase().includes(q);
      return (
        r.titulo.toLowerCase().includes(q) ||
        r.artista.toLowerCase().includes(q) ||
        r.isrc?.toLowerCase().includes(q) ||
        r.iswc?.toLowerCase().includes(q)
      );
    });

    return results.slice(0, limit);
  }

  // ── Projectos de monitoramento ────────────────────────────────────────────────

  async createProject(input: CreateMonitoringProjectInput): Promise<MonitoringProject> {
    await delay(800);
    const project: MonitoringProject = {
      id:                `PROJ-${uuid().slice(0, 8).toUpperCase()}`,
      name:              input.name,
      artista_nome:      input.artista_nome,
      isrcs:             input.isrcs     ?? [],
      iswcs:             input.iswcs     ?? [],
      sources:           input.sources   ?? ["radio", "streaming", "video"],
      countries:         input.countries ?? [],
      active:            true,
      created_at:        nowISO(),
      last_detection_at: null,
      total_detections:  0,
    };
    const projects = loadProjects();
    projects.unshift(project);
    saveProjects(projects);
    return project;
  }

  async listProjects(): Promise<MonitoringProject[]> {
    await delay(300);
    return loadProjects();
  }

  async toggleProject(projectId: string, active: boolean): Promise<MonitoringProject> {
    await delay(500);
    const projects = loadProjects();
    const idx      = projects.findIndex(p => p.id === projectId);
    if (idx === -1) throw new Error(`Projecto ${projectId} não encontrado.`);
    projects[idx] = { ...projects[idx], active };
    saveProjects(projects);
    return projects[idx];
  }

  // ── Saúde ────────────────────────────────────────────────────────────────────

  async verifyConnection(): Promise<{ ok: boolean; quota_remaining?: number; plan?: string }> {
    await delay(400);
    return { ok: true, quota_remaining: 9_800, plan: "Enterprise (Mock)" };
  }
}

// ─── Instância singleton exportada ───────────────────────────────────────────

export const mockMusicMonitoringProvider = new MockMusicMonitoringProvider();
