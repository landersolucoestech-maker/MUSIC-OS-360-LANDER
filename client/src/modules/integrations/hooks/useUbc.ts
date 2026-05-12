/**
 * modules/integrations/hooks/useUbc.ts
 *
 * Hook completo para integração UBC (União Brasileira de Compositores).
 *
 * Funcionalidades:
 *   - Credenciais (número de filiado + senha ou token de API)
 *   - Pesquisa de obras e artistas na base UBC
 *   - Importação de obras para o catálogo local
 *   - Registro de novas obras (composições) na UBC
 *   - Geração automática de ISWC via UBC
 *   - Geração de ISRC para fonogramas vinculados
 *   - Sincronização em lote do catálogo
 *   - Agendamento de sincronização automática
 *   - Histórico de operações de registro
 *
 * Contrato: @/shared/integrations/contracts/rights.contract → IRightsProvider
 * Mock:     @/integrations/providers/mock/mock-rights.provider → MockRightsProvider("ubc")
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "sonner";
import { MOCK_DATA, MOCK_USER_ID, saveMockData } from "@/shared/data/mockData";
import { mockUbcProvider } from "@/modules/integrations/providers/mock/mock-rights.provider";
import type {
  RegisterObraInput,
  RegistrationResult,
  RegistrationHistoryEntry,
  GenerateISWCInput,
  GenerateISWCResult,
  GenerateISRCInput,
  GenerateISRCResult,
  ArtistSearchResult,
} from "@/integrations/dto";
import type { IntegrationRuntimeStatus } from "@/shared/integrations/types";

// ─── Storage helpers ──────────────────────────────────────────────────────────

const CRED_KEY  = "musicos360_ubc_credentials";
const SCHED_KEY = "musicos360_ubc_schedule";

interface StoredCreds {
  numero_filiado: string;
  username:       string;
  base_url?:      string;
  saved_at:       string;
}

function readCreds(): StoredCreds | null {
  try { return JSON.parse(localStorage.getItem(CRED_KEY) || "null"); } catch { return null; }
}
function writeCreds(c: StoredCreds) {
  try { localStorage.setItem(CRED_KEY, JSON.stringify(c)); } catch { /* ignore */ }
}
function clearCreds() {
  try { localStorage.removeItem(CRED_KEY); } catch { /* ignore */ }
}
function readSchedule(): UbcSyncSchedule {
  try { return (localStorage.getItem(SCHED_KEY) as UbcSyncSchedule) || "off"; } catch { return "off"; }
}
function writeSchedule(s: UbcSyncSchedule) {
  try { localStorage.setItem(SCHED_KEY, s); } catch { /* ignore */ }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UbcSyncCategorySummary {
  fetched:  number;
  inserted: number;
  updated:  number;
  errors:   number;
}

export interface UbcSyncSummary {
  started_at:     string;
  finished_at:    string;
  duration_ms:    number;
  obras:          UbcSyncCategorySummary;
  total_fetched:  number;
  total_inserted: number;
  total_updated:  number;
  total_errors:   number;
  truncated?:     boolean;
}

export type UbcSyncSchedule = "off" | "daily" | "weekly";

export interface UbcStatus extends IntegrationRuntimeStatus {
  integration_id:      "ubc";
  numero_filiado?:     string | null;
  username?:           string | null;
  base_url?:           string | null;
  ultimo_relatorio_em?: string | null;
  sync_schedule?:      UbcSyncSchedule;
  next_sync_at?:       string | null;
  last_sync_at?:       string | null;
  last_sync_summary?:  UbcSyncSummary | null;
}

export interface UbcSearchResult {
  external_id:     string;
  titulo:          string;
  iswc?:           string | null;
  genero?:         string | null;
  compositores?:   string[] | null;
  letristas?:      string[] | null;
  editora?:        string | null;
  duracao?:        string | null;
  data_registro?:  string | null;
  artista_nome?:   string | null;
}

export type UbcKind = "obras";

export interface UbcSearchResponse {
  results:   UbcSearchResult[];
  total?:    number;
  has_more?: boolean;
  error?:    string;
}

export interface UbcLocalMatch {
  id:     string;
  titulo: string;
}

// ─── Banco mock UBC ───────────────────────────────────────────────────────────
// Obras registradas na UBC (composições musicais)

const UBC_OBRAS: UbcSearchResult[] = [
  { external_id: "UBC-001-2025", titulo: "Noite de Luz",         iswc: "T-123.456.789-0", genero: "Pop",       compositores: ["Vitória Carvalho", "Lucas Mendes"],   artista_nome: "Vitória Lunar",         duracao: "3:42", data_registro: "2025-01-10" },
  { external_id: "UBC-002-2025", titulo: "Beira do Rio",          iswc: "T-234.567.890-1", genero: "Forró",     compositores: ["Grupo Raiz Nordestina"],              artista_nome: "Grupo Raiz Nordestina",  duracao: "4:15", data_registro: "2025-01-12" },
  { external_id: "UBC-003-2025", titulo: "Frequência 440",        iswc: "T-345.678.901-2", genero: "Eletrônico",compositores: ["Marcus Oliveira"],                    artista_nome: "DJ Marcus Flow",         duracao: "5:30", data_registro: "2025-01-15" },
  { external_id: "UBC-004-2025", titulo: "Amor de Interior",     iswc: "T-456.789.012-3", genero: "Sertanejo", compositores: ["Ana Beatriz Santos", "Rodolfo Lima"],  artista_nome: "Ana Beatriz Santos",     duracao: "3:58", data_registro: "2025-01-18" },
  { external_id: "UBC-005-2025", titulo: "Suíte Brasileira nº 1",iswc: "T-567.890.123-4", genero: "MPB",       compositores: ["Trio Bossa Moderna"],                 artista_nome: "Trio Bossa Moderna",     duracao: "7:20", data_registro: "2025-01-20" },
  { external_id: "UBC-006-2025", titulo: "Trap do Norte",         iswc: "T-890.123.456-7", genero: "Trap",      compositores: ["Pedro Alves", "Renan Costa Pereira"], artista_nome: "Pedro Breaks",           duracao: "2:58", data_registro: "2025-02-10" },
  { external_id: "UBC-007-2025", titulo: "Sonho Azul",            iswc: "T-901.234.567-8", genero: "Sertanejo", compositores: ["Ana Beatriz Santos"],                 artista_nome: "Ana Beatriz Santos",     duracao: "4:30", data_registro: "2025-02-14" },
  { external_id: "UBC-008-2025", titulo: "Recomeço",              iswc: "T-112.345.678-0", genero: "Pop",       compositores: ["Vitória Carvalho"],                   artista_nome: "Vitória Lunar",         duracao: "3:55", data_registro: "2025-03-01" },
  { external_id: "UBC-009-2025", titulo: "Ritmo da Favela",       iswc: "T-912.345.678-8", genero: "Funk",      compositores: ["Pedro Alves", "Renan Costa Pereira"], artista_nome: "Pedro Breaks",           duracao: "3:22", data_registro: "2025-04-10" },
  { external_id: "UBC-010-2025", titulo: "Voo Livre",             iswc: "T-512.345.678-4", genero: "MPB",       compositores: ["Trio Bossa Moderna"],                 artista_nome: "Trio Bossa Moderna",     duracao: "5:08", data_registro: "2025-03-18" },
  // Registros EXCLUSIVOS do banco UBC (ainda não importados localmente)
  { external_id: "UBC-101-2025", titulo: "Manhã de Chuva",        iswc: "T-201.001.001-0", genero: "MPB",       compositores: ["Vitória Carvalho"],                   artista_nome: "Vitória Lunar",         duracao: "4:05", data_registro: "2025-05-02" },
  { external_id: "UBC-102-2025", titulo: "Forró do Semiárido",    iswc: "T-202.001.001-0", genero: "Forró",     compositores: ["Grupo Raiz Nordestina"],              artista_nome: "Grupo Raiz Nordestina",  duracao: "3:52", data_registro: "2025-05-05" },
  { external_id: "UBC-103-2025", titulo: "Sintetizador Br",       iswc: "T-203.001.001-0", genero: "Eletrônico",compositores: ["Marcus Oliveira"],                    artista_nome: "DJ Marcus Flow",         duracao: "6:10", data_registro: "2025-05-08" },
  { external_id: "UBC-104-2025", titulo: "Sertão Profundo",       iswc: "T-204.001.001-0", genero: "Sertanejo", compositores: ["Ana Beatriz Santos"],                 artista_nome: "Ana Beatriz Santos",     duracao: "4:00", data_registro: "2025-05-12" },
  { external_id: "UBC-105-2025", titulo: "Choro Contemporâneo",   iswc: "T-205.001.001-0", genero: "MPB",       compositores: ["Trio Bossa Moderna"],                 artista_nome: "Trio Bossa Moderna",     duracao: "5:45", data_registro: "2025-05-15" },
  { external_id: "UBC-106-2025", titulo: "Gospel Urbano",         iswc: "T-206.001.001-0", genero: "Gospel",    compositores: ["Larissa Mendes"],                     artista_nome: "Larissa Voz",            duracao: "3:30", data_registro: "2025-05-18" },
  { external_id: "UBC-107-2025", titulo: "Rap Consciente",        iswc: "T-207.001.001-0", genero: "Hip-Hop",   compositores: ["Pedro Alves"],                        artista_nome: "Pedro Breaks",           duracao: "3:45", data_registro: "2025-05-20" },
];

// ─── Helpers internos ─────────────────────────────────────────────────────────

function searchUbc(db: UbcSearchResult[], query: string): UbcSearchResult[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  return db.filter((r) => {
    const haystack = [
      r.titulo, r.artista_nome, r.genero, r.iswc,
      ...(r.compositores ?? []), ...(r.letristas ?? []),
    ].filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(q);
  });
}

function buildLocalMap(externalIds: string[]): Map<string, UbcLocalMatch> {
  const rows = (MOCK_DATA["obras"] ?? []) as Array<Record<string, unknown>>;
  const map = new Map<string, UbcLocalMatch>();
  for (const id of externalIds) {
    const match = rows.find((r) => r.cod_ubc === id || r.origem_externa_id === id);
    if (match) {
      map.set(id, { id: match.id as string, titulo: match.titulo as string });
    }
  }
  return map;
}

function importObraRecord(external_id: string, record: UbcSearchResult): void {
  const now = new Date().toISOString();
  const newObra: Record<string, unknown> = {
    id:         `mock-ubc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    user_id:    MOCK_USER_ID,
    titulo:     record.titulo,
    compositor: record.compositores?.[0] ?? null,
    compositores: record.compositores?.join(", ") ?? null,
    co_compositores: record.compositores?.slice(1).join(", ") ?? null,
    letristas:  record.letristas?.join(", ") ?? null,
    detentores: "MusicOS Publishing",
    editora:    record.editora ?? "MusicOS Publishing",
    iswc:       record.iswc ?? null,
    isrc:       null,
    cod_ubc:    external_id,
    cod_abramus: null,
    cod_ecad:   null,
    tipo:       "musica",
    genero:     record.genero ?? null,
    status:     "registrado",
    duracao:    record.duracao ?? null,
    origem_externa: "ubc",
    origem_externa_id: external_id,
    origem_externa_sincronizado_em: now,
    projeto_id: null,
    artista_id: null,
    created_at: now,
    updated_at: now,
  };
  const arr = (MOCK_DATA["obras"] ?? (MOCK_DATA["obras"] = [])) as Record<string, unknown>[];
  arr.unshift(newObra);
  saveMockData();
}

// ─── Hook: Status ────────────────────────────────────────────────────────────

export function useUbcStatus() {
  return useQuery<UbcStatus>({
    queryKey: ["integrations", "ubc", "status"],
    queryFn: async (): Promise<UbcStatus> => {
      const creds = readCreds();
      if (!creds) {
        return {
          integration_id:  "ubc",
          status:          "disconnected",
          connected:       false,
          numero_filiado:  null,
          username:        null,
          base_url:        null,
          last_error:      null,
          last_checked_at: new Date().toISOString(),
          sync_schedule:   readSchedule(),
          next_sync_at:    null,
          last_sync_at:    null,
          last_sync_summary: null,
        };
      }
      return {
        integration_id:  "ubc",
        status:          "connected",
        connected:       true,
        numero_filiado:  creds.numero_filiado,
        username:        creds.username,
        base_url:        creds.base_url ?? null,
        last_error:      null,
        last_checked_at: new Date().toISOString(),
        sync_schedule:   readSchedule(),
        next_sync_at:    null,
        last_sync_at:    null,
        last_sync_summary: null,
      };
    },
    staleTime: Infinity,
  });
}

// ─── Hook: Salvar credenciais ─────────────────────────────────────────────────

export function useUbcSaveCredentials() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { numero_filiado: string; username: string; password: string; base_url?: string }) => {
      if (!input.numero_filiado.trim()) throw new Error("Número de filiado é obrigatório.");
      if (!input.username.trim())       throw new Error("Usuário é obrigatório.");
      if (!input.password.trim())       throw new Error("Senha é obrigatória.");
      writeCreds({
        numero_filiado: input.numero_filiado.trim(),
        username:       input.username.trim(),
        base_url:       input.base_url?.trim(),
        saved_at:       new Date().toISOString(),
      });
      return { ok: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations", "ubc", "status"] });
      toast.success("Credenciais UBC salvas. Conectado com sucesso.");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

// ─── Hook: Desconectar ────────────────────────────────────────────────────────

export function useUbcDeleteCredentials() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      clearCreds();
      return { ok: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations", "ubc", "status"] });
      toast.success("Integração UBC desconectada.");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

// ─── Hook: Pesquisa de obras ──────────────────────────────────────────────────

export function useUbcSearch(query: string) {
  const trimmed = query.trim();
  return useQuery<UbcSearchResponse>({
    queryKey: ["ubc", "search", trimmed],
    queryFn: async () => {
      const creds = readCreds();
      if (!creds) return { results: [], error: "not_configured" };
      const results = searchUbc(UBC_OBRAS, trimmed);
      return { results, total: results.length, has_more: false };
    },
    enabled: trimmed.length >= 2,
    staleTime: 30_000,
  });
}

// ─── Hook: Pesquisa de artistas/compositores ──────────────────────────────────

export function useUbcSearchArtists(query: string) {
  const trimmed = query.trim();
  return useQuery<ArtistSearchResult[]>({
    queryKey: ["ubc", "search-artists", trimmed],
    queryFn: async () => {
      const creds = readCreds();
      if (!creds) return [];
      return mockUbcProvider.searchArtists({ query: trimmed, limit: 10 });
    },
    enabled: trimmed.length >= 2,
    staleTime: 30_000,
  });
}

// ─── Hook: Importar obra ──────────────────────────────────────────────────────

export function useUbcImport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { external_id: string; record?: UbcSearchResult }): Promise<{ record?: UbcSearchResult }> => {
      const creds = readCreds();
      if (!creds) throw new Error("UBC não está conectado. Configure as credenciais primeiro.");
      const rec = input.record ?? UBC_OBRAS.find((r) => r.external_id === input.external_id);
      if (!rec) throw new Error(`Registro ${input.external_id} não encontrado no banco UBC.`);
      const existing = buildLocalMap([input.external_id]).get(input.external_id);
      if (existing) return { record: rec };
      importObraRecord(input.external_id, rec);
      return { record: rec };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["obras"] });
      queryClient.invalidateQueries({ queryKey: ["ubc", "local-lookup"] });
      toast.success("Obra importada da UBC com sucesso.");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

// ─── Hook: Sincronização em lote ──────────────────────────────────────────────

export function useUbcSyncAll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<UbcSyncSummary> => {
      const creds = readCreds();
      if (!creds) throw new Error("UBC não está conectado. Configure as credenciais primeiro.");
      const started_at = new Date().toISOString();
      const summary: UbcSyncSummary = {
        started_at,
        finished_at:    started_at,
        duration_ms:    0,
        obras:          { fetched: 0, inserted: 0, updated: 0, errors: 0 },
        total_fetched:  0,
        total_inserted: 0,
        total_updated:  0,
        total_errors:   0,
      };
      for (const rec of UBC_OBRAS) {
        summary.obras.fetched++;
        try {
          const existing = buildLocalMap([rec.external_id]).get(rec.external_id);
          if (!existing) {
            importObraRecord(rec.external_id, rec);
            summary.obras.inserted++;
          } else {
            summary.obras.updated++;
          }
        } catch {
          summary.obras.errors++;
        }
      }
      summary.finished_at    = new Date().toISOString();
      summary.duration_ms    = new Date(summary.finished_at).getTime() - new Date(started_at).getTime();
      summary.total_fetched  = summary.obras.fetched;
      summary.total_inserted = summary.obras.inserted;
      summary.total_updated  = summary.obras.updated;
      summary.total_errors   = summary.obras.errors;
      return summary;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["obras"] });
      queryClient.invalidateQueries({ queryKey: ["ubc", "local-lookup"] });
      toast.success(`Sincronização UBC concluída: ${data.total_inserted} novos, ${data.total_updated} já existentes.`);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

// ─── Hook: Agendamento ────────────────────────────────────────────────────────

export function useUbcSetSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (schedule: UbcSyncSchedule) => {
      writeSchedule(schedule);
      return { ok: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations", "ubc", "status"] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

// ─── Hook: Local lookup ───────────────────────────────────────────────────────

export function useUbcLocalLookup(externalIds: string[]) {
  const ids = useMemo(
    () => Array.from(new Set(externalIds.filter((id) => typeof id === "string" && id.length > 0))).sort(),
    [externalIds],
  );
  return useQuery<Map<string, UbcLocalMatch>>({
    queryKey: ["ubc", "local-lookup", ids],
    queryFn: async () => buildLocalMap(ids),
    enabled: ids.length > 0,
    staleTime: 10_000,
  });
}

// ─── Hook: Histórico de registro ──────────────────────────────────────────────

export function useUbcRegistrationHistory(localId: string) {
  return useQuery<RegistrationHistoryEntry[]>({
    queryKey: ["ubc", "registration-history", localId],
    queryFn: async () => {
      const creds = readCreds();
      if (!creds) return [];
      return mockUbcProvider.getRegistrationHistory("obra", localId);
    },
    enabled: Boolean(localId),
    staleTime: 60_000,
  });
}

// ─── Hook: Registrar obra na UBC ─────────────────────────────────────────────

export function useUbcRegisterObra() {
  const queryClient = useQueryClient();
  return useMutation<RegistrationResult, Error, RegisterObraInput>({
    mutationFn: async (input) => {
      const creds = readCreds();
      if (!creds) throw new Error("UBC não está conectado. Configure as credenciais primeiro.");
      return mockUbcProvider.registerObra(input);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["obras"] });
      queryClient.invalidateQueries({ queryKey: ["ubc", "registration-history"] });
      if (data.iswc) {
        const obras = (MOCK_DATA["obras"] ?? []) as Array<Record<string, unknown>>;
        const idx = obras.findIndex((o) => o.id === data.local_id);
        if (idx >= 0) {
          obras[idx] = { ...obras[idx], iswc: data.iswc, cod_ubc: data.external_id, status: "registrado" };
          saveMockData();
        }
      }
      toast.success(`Obra registrada na UBC. Código: ${data.code}${data.iswc ? ` | ISWC: ${data.iswc}` : ""}`);
    },
    onError: (err) => {
      toast.error(`Erro ao registrar obra na UBC: ${err.message}`);
    },
  });
}

// ─── Hook: Gerar ISWC via UBC ────────────────────────────────────────────────

export function useUbcGenerateISWC() {
  const queryClient = useQueryClient();
  return useMutation<GenerateISWCResult, Error, GenerateISWCInput>({
    mutationFn: async (input) => {
      const creds = readCreds();
      if (!creds) throw new Error("UBC não está conectado. Configure as credenciais primeiro.");
      return mockUbcProvider.generateISWC(input);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["obras"] });
      const obras = (MOCK_DATA["obras"] ?? []) as Array<Record<string, unknown>>;
      const idx = obras.findIndex((o) => o.id === data.local_obra_id);
      if (idx >= 0) {
        obras[idx] = { ...obras[idx], iswc: data.iswc };
        saveMockData();
      }
      const sourceLabel = data.source === "existing" ? "ISWC existente confirmado" : "ISWC gerado via UBC";
      toast.success(`${sourceLabel}: ${data.iswc}`);
    },
    onError: (err) => {
      toast.error(`Erro ao gerar ISWC via UBC: ${err.message}`);
    },
  });
}

// ─── Hook: Gerar ISRC via UBC ────────────────────────────────────────────────

export function useUbcGenerateISRC() {
  const queryClient = useQueryClient();
  return useMutation<GenerateISRCResult, Error, GenerateISRCInput>({
    mutationFn: async (input) => {
      const creds = readCreds();
      if (!creds) throw new Error("UBC não está conectado. Configure as credenciais primeiro.");
      return mockUbcProvider.generateISRC(input);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["fonogramas"] });
      const fonogramas = (MOCK_DATA["fonogramas"] ?? []) as Array<Record<string, unknown>>;
      const idx = fonogramas.findIndex((f) => f.id === data.local_fonograma_id);
      if (idx >= 0) {
        fonogramas[idx] = { ...fonogramas[idx], isrc: data.isrc };
        saveMockData();
      }
      const sourceLabel = data.source === "existing" ? "ISRC existente confirmado" : "ISRC gerado via UBC";
      toast.success(`${sourceLabel}: ${data.isrc}`);
    },
    onError: (err) => {
      toast.error(`Erro ao gerar ISRC via UBC: ${err.message}`);
    },
  });
}
