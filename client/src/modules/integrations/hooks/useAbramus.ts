import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "sonner";
import { MOCK_DATA, MOCK_USER_ID, saveMockData } from "@/shared/data/mockData";
import { mockAbramusProvider } from "@/modules/integrations/providers/mock/mock-rights.provider";
import { api } from "@/shared/lib/api-client";
import { MOCK_MODE } from "@/shared/lib/env";
import type {
  RegisterObraInput,
  RegisterFonogramaInput,
  RegistrationResult,
  RegistrationHistoryEntry,
  GenerateISWCInput,
  GenerateISWCResult,
  GenerateISRCInput,
  GenerateISRCResult,
  ArtistSearchResult,
} from "@/modules/integrations/dto";

// ─── Storage helpers (MOCK_MODE only) ─────────────────────────────────────────
const CRED_KEY  = "musicos360_abramus_credentials";
const SCHED_KEY = "musicos360_abramus_schedule";

interface StoredCreds {
  username: string;
  base_url?: string;
  saved_at: string;
}

function readCreds(): StoredCreds | null {
  if (!MOCK_MODE) return null;
  try { return JSON.parse(sessionStorage.getItem(CRED_KEY) || "null"); } catch { return null; }
}
function writeCreds(c: StoredCreds) {
  try { sessionStorage.setItem(CRED_KEY, JSON.stringify(c)); } catch { /* ignore */ }
}
function clearCreds() {
  try { sessionStorage.removeItem(CRED_KEY); } catch { /* ignore */ }
}
function readSchedule(): AbramusSyncSchedule {
  try { return (sessionStorage.getItem(SCHED_KEY) as AbramusSyncSchedule) || "off"; } catch { return "off"; }
}
function writeSchedule(s: AbramusSyncSchedule) {
  try { sessionStorage.setItem(SCHED_KEY, s); } catch { /* ignore */ }
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface AbramusSyncCategorySummary {
  fetched: number;
  inserted: number;
  updated: number;
  errors: number;
}

export interface AbramusSyncSummary {
  started_at: string;
  finished_at: string;
  duration_ms: number;
  obras: AbramusSyncCategorySummary;
  fonogramas: AbramusSyncCategorySummary;
  total_fetched: number;
  total_inserted: number;
  total_updated: number;
  total_errors: number;
  truncated?: boolean;
}

export type AbramusSyncSchedule = "off" | "daily" | "weekly";

export interface AbramusStatus {
  connected: boolean;
  status?: string;
  base_url?: string | null;
  username?: string | null;
  last_error?: string | null;
  last_sync_at?: string | null;
  last_sync_summary?: AbramusSyncSummary | null;
  sync_schedule?: AbramusSyncSchedule;
  next_sync_at?: string | null;
}

export interface AbramusSearchResult {
  external_id: string;
  titulo: string;
  iswc?: string | null;
  isrc?: string | null;
  duracao?: string | null;
  genero?: string | null;
  compositores?: string[] | null;
  letristas?: string[] | null;
  gravadora?: string | null;
  produtores?: string[] | null;
  data_registro?: string | null;
  artista_nome?: string | null;
}

export type AbramusKind = "obras" | "fonogramas";

export interface AbramusSearchResponse {
  results: AbramusSearchResult[];
  total?: number;
  has_more?: boolean;
  error?: string;
}

export interface AbramusLocalMatch {
  id: string;
  titulo: string;
}

// ─── Mock ABRAMUS database ────────────────────────────────────────────────────

const ABRAMUS_OBRAS: AbramusSearchResult[] = [
  { external_id: "ABR-001-2025", titulo: "Noite de Luz", iswc: "T-123.456.789-0", genero: "Pop", compositores: ["Vitória Carvalho", "Lucas Mendes"], artista_nome: "Vitória Lunar", duracao: "3:42", data_registro: "2025-01-10" },
  { external_id: "ABR-002-2025", titulo: "Beira do Rio", iswc: "T-234.567.890-1", genero: "Forró", compositores: ["Grupo Raiz Nordestina"], artista_nome: "Grupo Raiz Nordestina", duracao: "4:15", data_registro: "2025-01-12" },
  { external_id: "ABR-003-2025", titulo: "Frequência 440", iswc: "T-345.678.901-2", genero: "Eletrônico", compositores: ["Marcus Oliveira"], artista_nome: "DJ Marcus Flow", duracao: "5:30", data_registro: "2025-01-15" },
  { external_id: "ABR-004-2025", titulo: "Amor de Interior", iswc: "T-456.789.012-3", genero: "Sertanejo", compositores: ["Ana Beatriz Santos", "Rodolfo Lima"], artista_nome: "Ana Beatriz Santos", duracao: "3:58", data_registro: "2025-01-18" },
  { external_id: "ABR-005-2025", titulo: "Suíte Brasileira nº 1", iswc: "T-567.890.123-4", genero: "MPB", compositores: ["Trio Bossa Moderna"], artista_nome: "Trio Bossa Moderna", duracao: "7:20", data_registro: "2025-01-20" },
  { external_id: "ABR-006-2025", titulo: "Cidade Mágica", iswc: "T-678.901.234-5", genero: "Pop", compositores: ["Vitória Carvalho", "Pedro Alves"], artista_nome: "Vitória Lunar", duracao: "3:25", data_registro: "2025-02-01" },
  { external_id: "ABR-007-2025", titulo: "Xote da Saudade", iswc: "T-789.012.345-6", genero: "Forró", compositores: ["Grupo Raiz Nordestina"], artista_nome: "Grupo Raiz Nordestina", duracao: "4:02", data_registro: "2025-02-05" },
  { external_id: "ABR-008-2025", titulo: "Trap do Norte", iswc: "T-890.123.456-7", genero: "Trap", compositores: ["Pedro Alves", "Renan Costa Pereira"], artista_nome: "Pedro Breaks", duracao: "2:58", data_registro: "2025-02-10" },
  { external_id: "ABR-009-2025", titulo: "Sonho Azul", iswc: "T-901.234.567-8", genero: "Sertanejo", compositores: ["Ana Beatriz Santos"], artista_nome: "Ana Beatriz Santos", duracao: "4:30", data_registro: "2025-02-14" },
  { external_id: "ABR-010-2025", titulo: "Flow Noturno", iswc: "T-012.345.678-9", genero: "Eletrônico", compositores: ["Marcus Oliveira", "DJ Set Crew"], artista_nome: "DJ Marcus Flow", duracao: "6:15", data_registro: "2025-02-18" },
  { external_id: "ABR-011-2025", titulo: "Recomeço", iswc: "T-112.345.678-0", genero: "Pop", compositores: ["Vitória Carvalho"], artista_nome: "Vitória Lunar", duracao: "3:55", data_registro: "2025-03-01" },
  { external_id: "ABR-012-2025", titulo: "Festa na Roça", iswc: "T-212.345.678-1", genero: "Forró", compositores: ["Grupo Raiz Nordestina", "Ana Beatriz Santos"], artista_nome: "Grupo Raiz Nordestina", duracao: "3:40", data_registro: "2025-03-05" },
  { external_id: "ABR-013-2025", titulo: "Madrugada Eletrônica", iswc: "T-312.345.678-2", genero: "Eletrônico", compositores: ["Marcus Oliveira"], artista_nome: "DJ Marcus Flow", duracao: "7:45", data_registro: "2025-03-10" },
  { external_id: "ABR-014-2025", titulo: "Saudade de Minas", iswc: "T-412.345.678-3", genero: "Sertanejo", compositores: ["Ana Beatriz Santos"], artista_nome: "Ana Beatriz Santos", duracao: "4:12", data_registro: "2025-03-14" },
  { external_id: "ABR-015-2025", titulo: "Voo Livre", iswc: "T-512.345.678-4", genero: "MPB", compositores: ["Trio Bossa Moderna"], artista_nome: "Trio Bossa Moderna", duracao: "5:08", data_registro: "2025-03-18" },
  { external_id: "ABR-017-2025", titulo: "Baião Moderno", iswc: "T-712.345.678-6", genero: "Forró", compositores: ["Grupo Raiz Nordestina"], artista_nome: "Grupo Raiz Nordestina", duracao: "3:55", data_registro: "2025-04-01" },
  { external_id: "ABR-018-2025", titulo: "Estrela do Sul", iswc: "T-812.345.678-7", genero: "MPB", compositores: ["Vitória Carvalho", "Trio Bossa Moderna"], artista_nome: "Vitória Lunar", duracao: "4:40", data_registro: "2025-04-05" },
  { external_id: "ABR-019-2025", titulo: "Ritmo da Favela", iswc: "T-912.345.678-8", genero: "Funk", compositores: ["Pedro Alves", "Renan Costa Pereira"], artista_nome: "Pedro Breaks", duracao: "3:22", data_registro: "2025-04-10" },
  { external_id: "ABR-020-2025", titulo: "Chuva de Julho", iswc: "T-022.345.678-9", genero: "Sertanejo", compositores: ["Ana Beatriz Santos"], artista_nome: "Ana Beatriz Santos", duracao: "4:05", data_registro: "2025-04-14" },
  { external_id: "ABR-101-2025", titulo: "Lua Cheia", iswc: "T-101.001.001-0", genero: "Pop", compositores: ["Vitória Carvalho"], artista_nome: "Vitória Lunar", duracao: "3:50", data_registro: "2025-05-02" },
  { external_id: "ABR-102-2025", titulo: "Reza Forte", iswc: "T-102.001.001-0", genero: "Forró", compositores: ["Grupo Raiz Nordestina"], artista_nome: "Grupo Raiz Nordestina", duracao: "4:10", data_registro: "2025-05-05" },
  { external_id: "ABR-103-2025", titulo: "Bass Drop 2026", iswc: "T-103.001.001-0", genero: "Eletrônico", compositores: ["Marcus Oliveira"], artista_nome: "DJ Marcus Flow", duracao: "5:55", data_registro: "2025-05-08" },
  { external_id: "ABR-104-2025", titulo: "Cerrado", iswc: "T-104.001.001-0", genero: "Sertanejo", compositores: ["Ana Beatriz Santos"], artista_nome: "Ana Beatriz Santos", duracao: "3:45", data_registro: "2025-05-12" },
  { external_id: "ABR-105-2025", titulo: "Improviso Jazz", iswc: "T-105.001.001-0", genero: "MPB", compositores: ["Trio Bossa Moderna"], artista_nome: "Trio Bossa Moderna", duracao: "6:30", data_registro: "2025-05-15" },
  { external_id: "ABR-106-2025", titulo: "Memórias do Sertão", iswc: "T-106.001.001-0", genero: "Sertanejo", compositores: ["Ana Beatriz Santos", "Rodolfo Lima"], artista_nome: "Ana Beatriz Santos", duracao: "4:20", data_registro: "2025-05-18" },
  { external_id: "ABR-107-2025", titulo: "A Estrada", iswc: "T-107.001.001-0", genero: "Hip-Hop", compositores: ["Pedro Alves"], artista_nome: "Pedro Breaks", duracao: "3:15", data_registro: "2025-05-20" },
  { external_id: "ABR-108-2025", titulo: "Dança da Lua", iswc: "T-108.001.001-0", genero: "Gospel", compositores: ["Larissa Mendes"], artista_nome: "Larissa Voz", duracao: "4:00", data_registro: "2025-05-22" },
  { external_id: "ABR-109-2025", titulo: "Pele de Vidro", iswc: "T-109.001.001-0", genero: "Eletrônico", compositores: ["Marcus Oliveira"], artista_nome: "DJ Marcus Flow", duracao: "5:20", data_registro: "2025-05-25" },
  { external_id: "ABR-110-2025", titulo: "Raízes", iswc: "T-110.001.001-0", genero: "Forró", compositores: ["Grupo Raiz Nordestina"], artista_nome: "Grupo Raiz Nordestina", duracao: "3:35", data_registro: "2025-05-28" },
];

const ABRAMUS_FONOGRAMAS: AbramusSearchResult[] = [
  { external_id: "ABR-001-2025", titulo: "Noite de Luz", isrc: "BRMSC2500001", genero: "Pop", compositores: ["Vitória Carvalho", "Lucas Mendes"], gravadora: "MusicOS 360", produtores: ["Rafael Santana"], artista_nome: "Vitória Lunar", duracao: "3:42", data_registro: "2025-01-10" },
  { external_id: "ABR-002-2025", titulo: "Beira do Rio", isrc: "BRMSC2500002", genero: "Forró", compositores: ["Grupo Raiz Nordestina"], gravadora: "MusicOS 360", produtores: ["Rafael Santana"], artista_nome: "Grupo Raiz Nordestina", duracao: "4:15", data_registro: "2025-01-12" },
  { external_id: "ABR-003-2025", titulo: "Frequência 440", isrc: "BRMSC2500003", genero: "Eletrônico", compositores: ["Marcus Oliveira"], gravadora: "Marcus Flow Music", produtores: ["Marcus Oliveira"], artista_nome: "DJ Marcus Flow", duracao: "5:30", data_registro: "2025-01-15" },
  { external_id: "ABR-004-2025", titulo: "Amor de Interior", isrc: "BRMSC2500004", genero: "Sertanejo", compositores: ["Ana Beatriz Santos", "Rodolfo Lima"], gravadora: "MusicOS 360", produtores: ["Rafael Santana"], artista_nome: "Ana Beatriz Santos", duracao: "3:58", data_registro: "2025-01-18" },
  { external_id: "ABR-005-2025", titulo: "Suíte Brasileira nº 1", isrc: "BRMSC2500005", genero: "MPB", compositores: ["Trio Bossa Moderna"], gravadora: "Sony Music", produtores: ["Rafael Santana"], artista_nome: "Trio Bossa Moderna", duracao: "7:20", data_registro: "2025-01-20" },
  { external_id: "ABR-007-2025", titulo: "Xote da Saudade", isrc: "BRMSC2500007", genero: "Forró", compositores: ["Grupo Raiz Nordestina"], gravadora: "MusicOS 360", produtores: ["Rafael Santana"], artista_nome: "Grupo Raiz Nordestina", duracao: "4:02", data_registro: "2025-02-05" },
  { external_id: "ABR-008-2025", titulo: "Trap do Norte", isrc: "BRMSC2500008", genero: "Trap", compositores: ["Pedro Alves", "Renan Costa Pereira"], gravadora: "MusicOS 360", produtores: ["Pedro Alves"], artista_nome: "Pedro Breaks", duracao: "2:58", data_registro: "2025-02-10" },
  { external_id: "ABR-010-2025", titulo: "Flow Noturno", isrc: "BRMSC2500010", genero: "Eletrônico", compositores: ["Marcus Oliveira", "DJ Set Crew"], gravadora: "Marcus Flow Music", produtores: ["Marcus Oliveira"], artista_nome: "DJ Marcus Flow", duracao: "6:15", data_registro: "2025-02-18" },
  { external_id: "ABR-012-2025", titulo: "Festa na Roça", isrc: "BRMSC2500012", genero: "Forró", compositores: ["Grupo Raiz Nordestina", "Ana Beatriz Santos"], gravadora: "MusicOS 360", produtores: ["Rafael Santana"], artista_nome: "Grupo Raiz Nordestina", duracao: "3:40", data_registro: "2025-03-05" },
  { external_id: "ABR-014-2025", titulo: "Saudade de Minas", isrc: "BRMSC2500014", genero: "Sertanejo", compositores: ["Ana Beatriz Santos"], gravadora: "MusicOS 360", produtores: ["Rafael Santana"], artista_nome: "Ana Beatriz Santos", duracao: "4:12", data_registro: "2025-03-14" },
  { external_id: "ABR-015-2025", titulo: "Voo Livre", isrc: "BRMSC2500015", genero: "MPB", compositores: ["Trio Bossa Moderna"], gravadora: "Sony Music", produtores: ["Rafael Santana"], artista_nome: "Trio Bossa Moderna", duracao: "5:08", data_registro: "2025-03-18" },
  { external_id: "ABR-017-2025", titulo: "Baião Moderno", isrc: "BRMSC2500017", genero: "Forró", compositores: ["Grupo Raiz Nordestina"], gravadora: "MusicOS 360", produtores: ["Rafael Santana"], artista_nome: "Grupo Raiz Nordestina", duracao: "3:55", data_registro: "2025-04-01" },
  { external_id: "ABR-019-2025", titulo: "Ritmo da Favela", isrc: "BRMSC2500019", genero: "Funk", compositores: ["Pedro Alves", "Renan Costa Pereira"], gravadora: "MusicOS 360", produtores: ["Pedro Alves"], artista_nome: "Pedro Breaks", duracao: "3:22", data_registro: "2025-04-10" },
  { external_id: "ABR-F-101", titulo: "Lua Cheia", isrc: "BRMSC2600001", genero: "Pop", compositores: ["Vitória Carvalho"], gravadora: "MusicOS 360", produtores: ["Rafael Santana"], artista_nome: "Vitória Lunar", duracao: "3:50", data_registro: "2025-05-02" },
  { external_id: "ABR-F-102", titulo: "Reza Forte", isrc: "BRMSC2600002", genero: "Forró", compositores: ["Grupo Raiz Nordestina"], gravadora: "MusicOS 360", produtores: ["Rafael Santana"], artista_nome: "Grupo Raiz Nordestina", duracao: "4:10", data_registro: "2025-05-05" },
  { external_id: "ABR-F-103", titulo: "Bass Drop 2026", isrc: "BRMSC2600003", genero: "Eletrônico", compositores: ["Marcus Oliveira"], gravadora: "Marcus Flow Music", produtores: ["Marcus Oliveira"], artista_nome: "DJ Marcus Flow", duracao: "5:55", data_registro: "2025-05-08" },
  { external_id: "ABR-F-104", titulo: "Cerrado", isrc: "BRMSC2600004", genero: "Sertanejo", compositores: ["Ana Beatriz Santos"], gravadora: "MusicOS 360", produtores: ["Rafael Santana"], artista_nome: "Ana Beatriz Santos", duracao: "3:45", data_registro: "2025-05-12" },
  { external_id: "ABR-F-105", titulo: "Improviso Jazz", isrc: "BRMSC2600005", genero: "MPB", compositores: ["Trio Bossa Moderna"], gravadora: "Sony Music", produtores: ["Rafael Santana"], artista_nome: "Trio Bossa Moderna", duracao: "6:30", data_registro: "2025-05-15" },
  { external_id: "ABR-F-106", titulo: "Memórias do Sertão", isrc: "BRMSC2600006", genero: "Sertanejo", compositores: ["Ana Beatriz Santos", "Rodolfo Lima"], gravadora: "MusicOS 360", produtores: ["Rafael Santana"], artista_nome: "Ana Beatriz Santos", duracao: "4:20", data_registro: "2025-05-18" },
  { external_id: "ABR-F-107", titulo: "A Estrada", isrc: "BRMSC2600007", genero: "Hip-Hop", compositores: ["Pedro Alves"], gravadora: "MusicOS 360", produtores: ["Pedro Alves"], artista_nome: "Pedro Breaks", duracao: "3:15", data_registro: "2025-05-20" },
  { external_id: "ABR-F-108", titulo: "Dança da Lua", isrc: "BRMSC2600008", genero: "Gospel", compositores: ["Larissa Mendes"], gravadora: "MusicOS 360", produtores: ["Rafael Santana"], artista_nome: "Larissa Voz", duracao: "4:00", data_registro: "2025-05-22" },
  { external_id: "ABR-F-109", titulo: "Pele de Vidro", isrc: "BRMSC2600009", genero: "Eletrônico", compositores: ["Marcus Oliveira"], gravadora: "Marcus Flow Music", produtores: ["Marcus Oliveira"], artista_nome: "DJ Marcus Flow", duracao: "5:20", data_registro: "2025-05-25" },
  { external_id: "ABR-F-110", titulo: "Raízes", isrc: "BRMSC2600010", genero: "Forró", compositores: ["Grupo Raiz Nordestina"], gravadora: "MusicOS 360", produtores: ["Rafael Santana"], artista_nome: "Grupo Raiz Nordestina", duracao: "3:35", data_registro: "2025-05-28" },
];

// ─── Search helper ────────────────────────────────────────────────────────────
function searchAbramus(db: AbramusSearchResult[], query: string): AbramusSearchResult[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  return db.filter((r) => {
    const haystack = [
      r.titulo, r.artista_nome, r.genero, r.iswc, r.isrc,
      ...(r.compositores ?? []), ...(r.produtores ?? []),
    ].filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(q);
  });
}

// ─── Local-lookup helper ──────────────────────────────────────────────────────
function buildLocalMap(kind: AbramusKind, externalIds: string[]): Map<string, AbramusLocalMatch> {
  const table = kind === "obras" ? "obras" : "fonogramas";
  const rows = (MOCK_DATA[table] ?? []) as Array<Record<string, unknown>>;
  const map = new Map<string, AbramusLocalMatch>();
  for (const id of externalIds) {
    const match = rows.find((r) => r.cod_abramus === id || r.origem_externa_id === id);
    if (match) map.set(id, { id: match.id as string, titulo: match.titulo as string });
  }
  return map;
}

// ─── Import helper ────────────────────────────────────────────────────────────
function importRecord(kind: AbramusKind, external_id: string, record: AbramusSearchResult): Record<string, unknown> {
  const now    = new Date().toISOString();
  const baseId = `mock-abr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  if (kind === "obras") {
    const newObra: Record<string, unknown> = {
      id: baseId, user_id: MOCK_USER_ID, titulo: record.titulo,
      compositor: record.compositores?.[0] ?? null,
      compositores: record.compositores?.join(", ") ?? null,
      co_compositores: record.compositores?.slice(1).join(", ") ?? null,
      letristas: record.letristas?.join(", ") ?? null,
      detentores: "MusicOS Publishing", editora: "MusicOS Publishing",
      isrc: record.isrc ?? null, iswc: record.iswc ?? null,
      cod_abramus: external_id, cod_ecad: null,
      tipo: "musica", genero: record.genero ?? null, status: "registrado",
      duracao: record.duracao ?? null,
      origem_externa: "abramus", origem_externa_id: external_id,
      origem_externa_sincronizado_em: now,
      projeto_id: null, artista_id: null, created_at: now, updated_at: now,
    };
    const arr = (MOCK_DATA["obras"] ?? (MOCK_DATA["obras"] = [])) as Record<string, unknown>[];
    arr.unshift(newObra);
    saveMockData();
    return newObra;
  } else {
    const newFono: Record<string, unknown> = {
      id: baseId, user_id: MOCK_USER_ID, titulo: record.titulo,
      obra_id: null, artista_id: null,
      isrc: record.isrc ?? null, duracao: record.duracao ?? null,
      tipo: "original", status: "registrado",
      compositores: record.compositores?.join(", ") ?? null,
      interpretes: record.artista_nome ?? null,
      produtores: record.produtores?.join(", ") ?? null,
      gravadora: record.gravadora ?? "MusicOS 360",
      cod_abramus: external_id, cod_ecad: null,
      genero_musical: record.genero ?? null,
      origem_externa: "abramus", origem_externa_id: external_id,
      origem_externa_sincronizado_em: now,
      data_registro: record.data_registro ?? null, created_at: now, updated_at: now,
    };
    const arr = (MOCK_DATA["fonogramas"] ?? (MOCK_DATA["fonogramas"] = [])) as Record<string, unknown>[];
    arr.unshift(newFono);
    saveMockData();
    return newFono;
  }
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useAbramusStatus() {
  return useQuery<AbramusStatus>({
    queryKey: ["abramus", "status"],
    queryFn: async () => {
      if (!MOCK_MODE) {
        return api.get<AbramusStatus>("/integrations/abramus/status");
      }
      const creds = readCreds();
      if (!creds) return { connected: false, status: "disconnected", sync_schedule: readSchedule() };
      return {
        connected: true, status: "ok",
        username: creds.username, base_url: creds.base_url ?? null,
        last_error: null, last_sync_at: null, last_sync_summary: null,
        sync_schedule: readSchedule(), next_sync_at: null,
      };
    },
    staleTime: MOCK_MODE ? Infinity : 30_000,
  });
}

export function useAbramusSaveCredentials() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { username: string; password: string; base_url?: string }) => {
      if (!input.username.trim() || !input.password.trim()) {
        throw new Error("Usuário e senha são obrigatórios.");
      }
      if (!MOCK_MODE) {
        return api.post("/integrations/abramus/configure", {
          username: input.username.trim(),
          password: input.password,
          baseUrl:  input.base_url?.trim() ?? "",
        });
      }
      writeCreds({ username: input.username.trim(), base_url: input.base_url?.trim(), saved_at: new Date().toISOString() });
      return { ok: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["abramus", "status"] });
      toast.success("Credenciais ABRAMUS salvas. Conectado com sucesso.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useAbramusDeleteCredentials() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!MOCK_MODE) {
        return api.delete("/integrations/abramus/disconnect");
      }
      clearCreds();
      return { ok: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["abramus", "status"] });
      toast.success("Integração ABRAMUS desconectada.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useAbramusSearch(kind: AbramusKind, query: string) {
  const trimmed = query.trim();
  return useQuery<AbramusSearchResponse>({
    queryKey: ["abramus", "search", kind, trimmed],
    queryFn: async () => {
      if (MOCK_MODE) {
        const creds = readCreds();
        if (!creds) return { results: [], error: "not_configured" };
        const db = kind === "obras" ? ABRAMUS_OBRAS : ABRAMUS_FONOGRAMAS;
        const results = searchAbramus(db, trimmed);
        return { results, total: results.length, has_more: false };
      }
      return api.get<AbramusSearchResponse>(
        `/integrations/abramus/search-${kind === "obras" ? "work" : "work"}?q=${encodeURIComponent(trimmed)}`,
      );
    },
    enabled: trimmed.length >= 2,
    staleTime: 30_000,
  });
}

export function useAbramusSearchArtists(query: string) {
  const trimmed = query.trim();
  return useQuery<ArtistSearchResult[]>({
    queryKey: ["abramus", "search-artists", trimmed],
    queryFn: async () => {
      if (!MOCK_MODE) {
        const res = await api.get<{ results?: ArtistSearchResult[] }>(
          `/integrations/abramus/search-artist?q=${encodeURIComponent(trimmed)}&limit=10`,
        );
        return res?.results ?? (res as unknown as ArtistSearchResult[]) ?? [];
      }
      const creds = readCreds();
      if (!creds) return [];
      return mockAbramusProvider.searchArtists({ query: trimmed, limit: 10 });
    },
    enabled: trimmed.length >= 2,
    staleTime: 30_000,
  });
}

export function useAbramusImport(kind: AbramusKind) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { external_id: string; record?: AbramusSearchResult }): Promise<{ record?: AbramusSearchResult }> => {
      const creds = MOCK_MODE ? readCreds() : { username: "backend" };
      if (!creds) throw new Error("ABRAMUS não está conectado. Configure as credenciais primeiro.");

      const db = kind === "obras" ? ABRAMUS_OBRAS : ABRAMUS_FONOGRAMAS;
      const rec = input.record ?? db.find((r) => r.external_id === input.external_id);
      if (!rec) throw new Error(`Registro ${input.external_id} não encontrado no banco ABRAMUS.`);

      const existing = buildLocalMap(kind, [input.external_id]).get(input.external_id);
      if (existing) return { record: rec };

      importRecord(kind, input.external_id, rec);
      return { record: rec };
    },
    onSuccess: (_, vars) => {
      const table = kind === "obras" ? ["obras"] : ["fonogramas"];
      queryClient.invalidateQueries({ queryKey: table });
      queryClient.invalidateQueries({ queryKey: ["abramus", "local-lookup"] });
      toast.success(
        kind === "obras"
          ? "Obra importada do ABRAMUS com sucesso."
          : "Fonograma importado do ABRAMUS com sucesso.",
      );
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useAbramusSyncAll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (_input?: { kinds?: AbramusKind[] }): Promise<AbramusSyncSummary> => {
      const creds = MOCK_MODE ? readCreds() : { username: "backend" };
      if (!creds) throw new Error("ABRAMUS não está conectado. Configure as credenciais primeiro.");

      const kinds: AbramusKind[] = _input?.kinds ?? ["obras", "fonogramas"];
      const started_at = new Date().toISOString();

      const summary: AbramusSyncSummary = {
        started_at, finished_at: started_at, duration_ms: 0,
        obras:      { fetched: 0, inserted: 0, updated: 0, errors: 0 },
        fonogramas: { fetched: 0, inserted: 0, updated: 0, errors: 0 },
        total_fetched: 0, total_inserted: 0, total_updated: 0, total_errors: 0,
      };

      for (const kind of kinds) {
        const db  = kind === "obras" ? ABRAMUS_OBRAS : ABRAMUS_FONOGRAMAS;
        const cat = summary[kind];
        cat.fetched = db.length;
        for (const rec of db) {
          try {
            const existing = buildLocalMap(kind, [rec.external_id]).get(rec.external_id);
            if (!existing) { importRecord(kind, rec.external_id, rec); cat.inserted++; }
            else cat.updated++;
          } catch { cat.errors++; }
        }
      }

      summary.finished_at    = new Date().toISOString();
      summary.duration_ms    = new Date(summary.finished_at).getTime() - new Date(started_at).getTime();
      summary.total_fetched  = summary.obras.fetched  + summary.fonogramas.fetched;
      summary.total_inserted = summary.obras.inserted + summary.fonogramas.inserted;
      summary.total_updated  = summary.obras.updated  + summary.fonogramas.updated;
      summary.total_errors   = summary.obras.errors   + summary.fonogramas.errors;

      return summary;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["obras"] });
      queryClient.invalidateQueries({ queryKey: ["fonogramas"] });
      queryClient.invalidateQueries({ queryKey: ["abramus", "local-lookup"] });
      toast.success(`Sincronização concluída: ${data.total_inserted} novos, ${data.total_updated} já existentes.`);
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useAbramusLocalLookup(kind: AbramusKind, externalIds: string[]) {
  const ids = useMemo(
    () => Array.from(new Set(externalIds.filter((id) => typeof id === "string" && id.length > 0))).sort(),
    [externalIds],
  );
  return useQuery<Map<string, AbramusLocalMatch>>({
    queryKey: ["abramus", "local-lookup", kind, ids],
    queryFn: async () => buildLocalMap(kind, ids),
    enabled: ids.length > 0,
    staleTime: 10_000,
  });
}

export function useAbramusSetSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (schedule: AbramusSyncSchedule) => {
      writeSchedule(schedule);
      return { ok: true };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["abramus", "status"] }),
    onError:   (err: Error) => toast.error(err.message),
  });
}

export function useAbramusRegistrationHistory(kind: AbramusKind, localId: string) {
  return useQuery<RegistrationHistoryEntry[]>({
    queryKey: ["abramus", "registration-history", kind, localId],
    queryFn: async () => {
      const creds = MOCK_MODE ? readCreds() : { username: "backend" };
      if (!creds) return [];
      const rightsKind = kind === "obras" ? "obra" : "fonograma";
      return mockAbramusProvider.getRegistrationHistory(rightsKind, localId);
    },
    enabled: Boolean(localId),
    staleTime: 60_000,
  });
}

export function useAbramusRegisterObra() {
  const queryClient = useQueryClient();
  return useMutation<RegistrationResult, Error, RegisterObraInput>({
    mutationFn: async (input) => {
      const creds = MOCK_MODE ? readCreds() : { username: "backend" };
      if (!creds) throw new Error("ABRAMUS não está conectado. Configure as credenciais primeiro.");
      return mockAbramusProvider.registerObra(input);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["obras"] });
      queryClient.invalidateQueries({ queryKey: ["abramus", "registration-history"] });
      if (data.iswc) {
        const obras = (MOCK_DATA["obras"] ?? []) as Array<Record<string, unknown>>;
        const idx = obras.findIndex((o) => o.id === data.local_id);
        if (idx >= 0) {
          obras[idx] = { ...obras[idx], iswc: data.iswc, cod_abramus: data.external_id, status: "registrado" };
          saveMockData();
        }
      }
      toast.success(`Obra registrada na ABRAMUS. Código: ${data.code}${data.iswc ? ` | ISWC: ${data.iswc}` : ""}`);
    },
    onError: (err) => toast.error(`Erro ao registrar obra: ${err.message}`),
  });
}

export function useAbramusRegisterFonograma() {
  const queryClient = useQueryClient();
  return useMutation<RegistrationResult, Error, RegisterFonogramaInput>({
    mutationFn: async (input) => {
      const creds = MOCK_MODE ? readCreds() : { username: "backend" };
      if (!creds) throw new Error("ABRAMUS não está conectado. Configure as credenciais primeiro.");
      return mockAbramusProvider.registerFonograma(input);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["fonogramas"] });
      queryClient.invalidateQueries({ queryKey: ["abramus", "registration-history"] });
      if (data.isrc) {
        const fonogramas = (MOCK_DATA["fonogramas"] ?? []) as Array<Record<string, unknown>>;
        const idx = fonogramas.findIndex((f) => f.id === data.local_id);
        if (idx >= 0) {
          fonogramas[idx] = { ...fonogramas[idx], isrc: data.isrc, cod_abramus: data.external_id, status: "registrado" };
          saveMockData();
        }
      }
      toast.success(`Fonograma registrado na ABRAMUS. Código: ${data.code}${data.isrc ? ` | ISRC: ${data.isrc}` : ""}`);
    },
    onError: (err) => toast.error(`Erro ao registrar fonograma: ${err.message}`),
  });
}

export function useAbramusGenerateISWC() {
  const queryClient = useQueryClient();
  return useMutation<GenerateISWCResult, Error, GenerateISWCInput>({
    mutationFn: async (input) => {
      const creds = MOCK_MODE ? readCreds() : { username: "backend" };
      if (!creds) throw new Error("ABRAMUS não está conectado. Configure as credenciais primeiro.");
      return mockAbramusProvider.generateISWC(input);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["obras"] });
      const obras = (MOCK_DATA["obras"] ?? []) as Array<Record<string, unknown>>;
      const idx = obras.findIndex((o) => o.id === data.local_obra_id);
      if (idx >= 0) { obras[idx] = { ...obras[idx], iswc: data.iswc }; saveMockData(); }
      const label = data.source === "existing" ? "ISWC existente confirmado" : "ISWC gerado";
      toast.success(`${label}: ${data.iswc}`);
    },
    onError: (err) => toast.error(`Erro ao gerar ISWC: ${err.message}`),
  });
}

export function useAbramusGenerateISRC() {
  const queryClient = useQueryClient();
  return useMutation<GenerateISRCResult, Error, GenerateISRCInput>({
    mutationFn: async (input) => {
      const creds = MOCK_MODE ? readCreds() : { username: "backend" };
      if (!creds) throw new Error("ABRAMUS não está conectado. Configure as credenciais primeiro.");
      return mockAbramusProvider.generateISRC(input);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["fonogramas"] });
      const fonogramas = (MOCK_DATA["fonogramas"] ?? []) as Array<Record<string, unknown>>;
      const idx = fonogramas.findIndex((f) => f.id === data.local_fonograma_id);
      if (idx >= 0) { fonogramas[idx] = { ...fonogramas[idx], isrc: data.isrc }; saveMockData(); }
      const label = data.source === "existing" ? "ISRC existente confirmado" : "ISRC gerado";
      toast.success(`${label}: ${data.isrc}`);
    },
    onError: (err) => toast.error(`Erro ao gerar ISRC: ${err.message}`),
  });
}
