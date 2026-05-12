/**
 * integrations/providers/mock/mock-music-monitoring.provider.ts
 *
 * Implementação mock de IMusicMonitoringProvider (ACRCloud-style).
 * Simula fingerprint, relatórios de execução, alertas e projetos de monitoramento.
 *
 * MIGRAÇÃO FUTURA: ACRCloudProvider implementa IMusicMonitoringProvider com API real.
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
import { MONITORING_PROJECTS_KEY, MONITORING_ALERTS_KEY } from "@/shared/integrations/contracts/music-monitoring.contract";

// ─── Helpers internos ─────────────────────────────────────────────────────────

function ri(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

// ─── Catálogo mock ────────────────────────────────────────────────────────────

const MOCK_CATALOG: MusicSearchResult[] = [
  { external_id: "acr-001", titulo: "Noite de Luz",         artista: "Vitória Lunar",          isrc: "BRMSC2500001", iswc: "T-123.456.789-0", genero: "Pop",         gravadora: "MusicOS 360",    duracao_segundos: 222, data_lancamento: "2025-01-10", total_plays_30d: 128_420 },
  { external_id: "acr-002", titulo: "Beira do Rio",          artista: "Grupo Raiz Nordestina",  isrc: "BRMSC2500002", iswc: "T-234.567.890-1", genero: "Forró",       gravadora: "MusicOS 360",    duracao_segundos: 255, data_lancamento: "2025-01-12", total_plays_30d: 89_310 },
  { external_id: "acr-003", titulo: "Frequência 440",        artista: "DJ Marcus Flow",         isrc: "BRMSC2500003", iswc: "T-345.678.901-2", genero: "Eletrônico",  gravadora: "Marcus Flow Music", duracao_segundos: 330, data_lancamento: "2025-01-15", total_plays_30d: 205_780 },
  { external_id: "acr-004", titulo: "Amor de Interior",     artista: "Ana Beatriz Santos",     isrc: "BRMSC2500004", iswc: "T-456.789.012-3", genero: "Sertanejo",   gravadora: "MusicOS 360",    duracao_segundos: 238, data_lancamento: "2025-01-18", total_plays_30d: 312_940 },
  { external_id: "acr-005", titulo: "Suíte Brasileira nº 1",artista: "Trio Bossa Moderna",     isrc: "BRMSC2500005", iswc: "T-567.890.123-4", genero: "MPB",         gravadora: "Sony Music",     duracao_segundos: 440, data_lancamento: "2025-01-20", total_plays_30d: 44_210 },
  { external_id: "acr-006", titulo: "Trap do Norte",         artista: "Pedro Breaks",           isrc: "BRMSC2500008", iswc: "T-890.123.456-7", genero: "Trap",        gravadora: "MusicOS 360",    duracao_segundos: 178, data_lancamento: "2025-02-10", total_plays_30d: 567_130 },
  { external_id: "acr-007", titulo: "Sonho Azul",            artista: "Ana Beatriz Santos",     isrc: "BRMSC2500009", iswc: "T-901.234.567-8", genero: "Sertanejo",   gravadora: "MusicOS 360",    duracao_segundos: 270, data_lancamento: "2025-02-14", total_plays_30d: 198_450 },
  { external_id: "acr-008", titulo: "Flow Noturno",          artista: "DJ Marcus Flow",         isrc: "BRMSC2500010", iswc: "T-012.345.678-9", genero: "Eletrônico",  gravadora: "Marcus Flow Music", duracao_segundos: 375, data_lancamento: "2025-02-18", total_plays_30d: 143_820 },
  { external_id: "acr-009", titulo: "Recomeço",              artista: "Vitória Lunar",          isrc: "BRMSC2500011", iswc: "T-112.345.678-0", genero: "Pop",         gravadora: "MusicOS 360",    duracao_segundos: 235, data_lancamento: "2025-03-01", total_plays_30d: 88_760 },
  { external_id: "acr-010", titulo: "Ritmo da Favela",       artista: "Pedro Breaks",           isrc: "BRMSC2500019", iswc: "T-912.345.678-8", genero: "Funk",        gravadora: "MusicOS 360",    duracao_segundos: 202, data_lancamento: "2025-04-10", total_plays_30d: 421_690 },
];

const SOURCES: MonitoringSourceType[] = ["radio", "tv", "streaming", "video", "podcast", "public"];
const SOURCE_NAMES: string[] = [
  "Rádio CBN", "Rádio Globo", "TV Globo", "SBT", "Record TV",
  "Spotify Brasil", "Deezer", "YouTube Music", "Apple Music",
  "YouTube", "TikTok", "Instagram Reels", "Podcast Brasil",
  "Shopping Morumbi", "Bar do Zé",
];

// ─── Alertas mock iniciais ────────────────────────────────────────────────────

const INITIAL_ALERTS: MonitoringAlert[] = [
  {
    id:             "alert-001",
    type:           "unauthorized_use",
    severity:       "critical",
    titulo:         "Trap do Norte",
    artista:        "Pedro Breaks",
    isrc:           "BRMSC2500008",
    source_name:    "YouTube",
    message:        'Uso não autorizado detectado: "Trap do Norte" usada em canal sem licença. 23 vídeos identificados nos últimos 7 dias.',
    detected_at:    daysAgo(2),
    acknowledged:   false,
    local_fonograma_id: "fono-008",
  },
  {
    id:             "alert-002",
    type:           "high_play_count",
    severity:       "warning",
    titulo:         "Amor de Interior",
    artista:        "Ana Beatriz Santos",
    isrc:           "BRMSC2500004",
    source_name:    "Spotify Brasil",
    message:        '"Amor de Interior" ultrapassou 300 mil execuções em streaming neste mês — pico 3× acima da média histórica.',
    detected_at:    daysAgo(1),
    acknowledged:   false,
    local_fonograma_id: "fono-004",
  },
  {
    id:             "alert-003",
    type:           "new_territory",
    severity:       "info",
    titulo:         "Frequência 440",
    artista:        "DJ Marcus Flow",
    isrc:           "BRMSC2500003",
    source_name:    "Deezer",
    message:        '"Frequência 440" detectada em execução na França e Portugal pela primeira vez. Verifique acordos de licenciamento internacional.',
    detected_at:    daysAgo(3),
    acknowledged:   false,
    local_fonograma_id: "fono-003",
  },
  {
    id:             "alert-004",
    type:           "unregistered_track",
    severity:       "warning",
    titulo:         "Dança da Lua",
    artista:        "Larissa Voz",
    isrc:           null,
    source_name:    "Rádio CBN",
    message:        '"Dança da Lua" detectada em transmissão sem ISRC registrado. Registre o fonograma para garantir arrecadação correta.',
    detected_at:    daysAgo(5),
    acknowledged:   false,
  },
  {
    id:             "alert-005",
    type:           "royalty_discrepancy",
    severity:       "warning",
    titulo:         "Noite de Luz",
    artista:        "Vitória Lunar",
    isrc:           "BRMSC2500001",
    source_name:    "ABRAMUS",
    message:        'Arrecadação de "Noite de Luz" no ECAD está 40% abaixo do esperado com base nas execuções detectadas. Solicite auditoria.',
    detected_at:    daysAgo(7),
    acknowledged:   true,
    acknowledged_at: daysAgo(6),
    local_fonograma_id: "fono-001",
  },
];

// ─── Projetos mock iniciais ───────────────────────────────────────────────────

const INITIAL_PROJECTS: MonitoringProject[] = [
  {
    id:                  "proj-001",
    name:                "Catálogo MusicOS 360",
    artista_nome:        null,
    isrcs:               ["BRMSC2500001", "BRMSC2500002", "BRMSC2500003", "BRMSC2500004", "BRMSC2500005"],
    iswcs:               [],
    sources:             ["radio", "tv", "streaming", "video"],
    countries:           ["BR"],
    active:              true,
    created_at:          daysAgo(30),
    last_detection_at:   daysAgo(0),
    total_detections:    1_247,
  },
  {
    id:                  "proj-002",
    name:                "Vitória Lunar — Monitoramento",
    artista_nome:        "Vitória Lunar",
    isrcs:               ["BRMSC2500001", "BRMSC2500011"],
    iswcs:               ["T-123.456.789-0", "T-112.345.678-0"],
    sources:             ["streaming", "video", "radio"],
    countries:           [],
    active:              true,
    created_at:          daysAgo(20),
    last_detection_at:   daysAgo(1),
    total_detections:    328,
  },
  {
    id:                  "proj-003",
    name:                "Pedro Breaks — Anti-pirataria",
    artista_nome:        "Pedro Breaks",
    isrcs:               ["BRMSC2500008", "BRMSC2500019"],
    iswcs:               [],
    sources:             ["video", "public"],
    countries:           [],
    active:              false,
    created_at:          daysAgo(45),
    last_detection_at:   daysAgo(10),
    total_detections:    89,
  },
];

// ─── Storage helpers ──────────────────────────────────────────────────────────

function readProjects(): MonitoringProject[] {
  try {
    return JSON.parse(localStorage.getItem(MONITORING_PROJECTS_KEY) || "null") ?? [...INITIAL_PROJECTS];
  } catch { return [...INITIAL_PROJECTS]; }
}
function writeProjects(p: MonitoringProject[]): void {
  try { localStorage.setItem(MONITORING_PROJECTS_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}
function readAlerts(): MonitoringAlert[] {
  try {
    return JSON.parse(localStorage.getItem(MONITORING_ALERTS_KEY) || "null") ?? [...INITIAL_ALERTS];
  } catch { return [...INITIAL_ALERTS]; }
}
function writeAlerts(a: MonitoringAlert[]): void {
  try { localStorage.setItem(MONITORING_ALERTS_KEY, JSON.stringify(a)); } catch { /* ignore */ }
}

// ─── Provider ────────────────────────────────────────────────────────────────

export class MockMusicMonitoringProvider implements IMusicMonitoringProvider {
  readonly provider_name = "ACRCloud (MOCK)";

  // ── Fingerprint ─────────────────────────────────────────────────────────────

  async identify(input: FingerprintInput): Promise<FingerprintResult> {
    const fingerprintId = `fp-${uid()}`;
    const processingStart = Date.now();

    // Simular latência de processamento
    await new Promise((r) => setTimeout(r, ri(200, 600)));

    // 85% de chance de match
    if (Math.random() < 0.85) {
      const track = MOCK_CATALOG[ri(0, MOCK_CATALOG.length - 1)];
      const score = ri(78, 100);
      const best: FingerprintMatch = {
        score,
        titulo:            track.titulo,
        artista:           track.artista,
        isrc:              track.isrc ?? null,
        iswc:              track.iswc ?? null,
        album:             null,
        gravadora:         track.gravadora ?? null,
        duracao_segundos:  track.duracao_segundos ?? null,
        data_lancamento:   track.data_lancamento ?? null,
        genero:            track.genero ?? null,
        external_id:       track.external_id,
        offset_segundos:   ri(0, 60),
        local_obra_id:     null,
        local_fonograma_id: null,
      };
      return {
        matched:            true,
        matches:            [best],
        best_match:         best,
        processing_time_ms: Date.now() - processingStart,
        fingerprint_id:     fingerprintId,
        detected_at:        new Date().toISOString(),
      };
    }

    return {
      matched:            false,
      matches:            [],
      best_match:         null,
      processing_time_ms: Date.now() - processingStart,
      fingerprint_id:     fingerprintId,
      detected_at:        new Date().toISOString(),
    };
  }

  // ── Relatórios de execução ──────────────────────────────────────────────────

  async getPlayReports(query: PlayReportQuery): Promise<PlayReport[]> {
    const limit = query.limit ?? 50;
    const reports: PlayReport[] = [];
    const statuses: PlayReport["status"][] = ["pending", "confirmed", "confirmed", "confirmed", "paid"];

    for (let i = 0; i < limit; i++) {
      const track = MOCK_CATALOG[i % MOCK_CATALOG.length];
      const sourceType = query.source_type ?? SOURCES[ri(0, SOURCES.length - 1)];
      const duration = ri(10, track.duracao_segundos ?? 240);
      const royalty = Math.floor(duration * ri(1, 5));

      reports.push({
        id:                    `play-${uid()}-${i}`,
        titulo:                track.titulo,
        artista:               track.artista,
        isrc:                  track.isrc ?? null,
        iswc:                  track.iswc ?? null,
        source_type:           sourceType,
        source_name:           SOURCE_NAMES[ri(0, SOURCE_NAMES.length - 1)],
        country:               ["BR", "BR", "BR", "PT", "FR"][ri(0, 4)],
        played_at:             daysAgo(ri(0, 30)),
        duration_seconds:      duration,
        estimated_audience:    ri(500, 5_000_000),
        estimated_royalty_cents: royalty,
        local_fonograma_id:    null,
        local_obra_id:         null,
        status:                statuses[ri(0, statuses.length - 1)],
      });
    }

    // Ordenar por data decrescente
    reports.sort((a, b) => b.played_at.localeCompare(a.played_at));
    return reports;
  }

  async getPlayReportSummary(query: PlayReportQuery): Promise<PlayReportSummary> {
    const reports = await this.getPlayReports({ ...query, limit: 200 });
    const totalDuration = reports.reduce((s, r) => s + r.duration_seconds, 0);
    const totalRoyalty = reports.reduce((s, r) => s + (r.estimated_royalty_cents ?? 0), 0);

    const bySource: Record<MonitoringSourceType, number> = {
      radio: 0, tv: 0, streaming: 0, video: 0, podcast: 0, venue: 0, public: 0, unknown: 0,
    };
    const byCountry: Record<string, number> = {};

    for (const r of reports) {
      bySource[r.source_type] = (bySource[r.source_type] ?? 0) + 1;
      if (r.country) byCountry[r.country] = (byCountry[r.country] ?? 0) + 1;
    }

    return {
      total_plays:              reports.length,
      total_duration_seconds:   totalDuration,
      estimated_royalty_cents:  totalRoyalty,
      by_source:                bySource,
      by_country:               byCountry,
      period_from:              query.date_from ?? daysAgo(30),
      period_to:                query.date_to   ?? new Date().toISOString(),
    };
  }

  // ── Alertas ─────────────────────────────────────────────────────────────────

  async getAlerts(options?: { unacknowledged_only?: boolean; limit?: number }): Promise<MonitoringAlert[]> {
    let alerts = readAlerts();
    if (options?.unacknowledged_only) {
      alerts = alerts.filter((a) => !a.acknowledged);
    }
    if (options?.limit) {
      alerts = alerts.slice(0, options.limit);
    }
    return alerts.sort((a, b) => b.detected_at.localeCompare(a.detected_at));
  }

  async acknowledgeAlert(alertId: string): Promise<void> {
    const alerts = readAlerts();
    const idx = alerts.findIndex((a) => a.id === alertId);
    if (idx >= 0) {
      alerts[idx] = { ...alerts[idx], acknowledged: true, acknowledged_at: new Date().toISOString() };
      writeAlerts(alerts);
    }
  }

  // ── Pesquisa ─────────────────────────────────────────────────────────────────

  async search(query: MusicSearchQuery): Promise<MusicSearchResult[]> {
    const q = query.query.trim().toLowerCase();
    if (q.length < 2) return [];
    const limit = query.limit ?? 10;
    const results = MOCK_CATALOG.filter((t) => {
      const haystack = [t.titulo, t.artista, t.isrc, t.iswc, t.genero].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(q);
    });
    return results.slice(0, limit);
  }

  // ── Projectos ─────────────────────────────────────────────────────────────────

  async createProject(input: CreateMonitoringProjectInput): Promise<MonitoringProject> {
    const projects = readProjects();
    const project: MonitoringProject = {
      id:                  `proj-${uid()}`,
      name:                input.name,
      artista_nome:        input.artista_nome ?? null,
      isrcs:               input.isrcs ?? [],
      iswcs:               input.iswcs ?? [],
      sources:             input.sources ?? ["radio", "tv", "streaming", "video"],
      countries:           input.countries ?? [],
      active:              true,
      created_at:          new Date().toISOString(),
      last_detection_at:   null,
      total_detections:    0,
    };
    projects.push(project);
    writeProjects(projects);
    return project;
  }

  async listProjects(): Promise<MonitoringProject[]> {
    return readProjects().sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async toggleProject(projectId: string, active: boolean): Promise<MonitoringProject> {
    const projects = readProjects();
    const idx = projects.findIndex((p) => p.id === projectId);
    if (idx < 0) throw new Error(`Projeto ${projectId} não encontrado.`);
    projects[idx] = { ...projects[idx], active };
    writeProjects(projects);
    return projects[idx];
  }

  // ── Saúde ──────────────────────────────────────────────────────────────────

  async verifyConnection(): Promise<{ ok: boolean; quota_remaining?: number; plan?: string }> {
    return { ok: true, quota_remaining: 4_800, plan: "Professional" };
  }
}

export const mockMusicMonitoringProvider = new MockMusicMonitoringProvider();
