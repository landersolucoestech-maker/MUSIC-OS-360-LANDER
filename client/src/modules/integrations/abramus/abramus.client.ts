/**
 * STEP 5 — Integration Resilience: abramus.client.ts
 *
 * Camada de cliente externo para a API ABRAMUS.
 * No modo standalone, usa o banco mock em memória.
 *
 * STEP 5: retry logic com backoff exponencial, normalização de erros,
 * prevenção de crash por falha externa.
 *
 * Responsabilidade: comunicação com a API externa apenas.
 */
import { IntegrationError } from "@/shared/lib/errors";
import type {
  AbramusSearchResult,
  AbramusKind,
  AbramusSearchResponse,
  AbramusStatus,
} from "../hooks/useAbramus";

// ─── Retry Utility ────────────────────────────────────────────────────────────

interface RetryOptions {
  attempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryIf?: (err: unknown) => boolean;
}

/**
 * STEP 5 — Executa fn com retry exponencial.
 * Só retenta se retryIf retornar true (padrão: sempre).
 */
async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const {
    attempts = 3,
    baseDelayMs = 300,
    maxDelayMs = 3000,
    retryIf = () => true,
  } = opts;

  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!retryIf(err) || i === attempts - 1) break;
      // Backoff exponencial com jitter
      const delay = Math.min(baseDelayMs * Math.pow(2, i), maxDelayMs);
      const jitter = Math.random() * 0.3 * delay;
      await new Promise((r) => setTimeout(r, delay + jitter));
    }
  }
  throw lastErr;
}

// ─── Credenciais (localStorage) ───────────────────────────────────────────────
const CRED_KEY = "musicos360_abramus_credentials";
const SCHED_KEY = "musicos360_abramus_schedule";

export type AbramusSyncSchedule = "off" | "daily" | "weekly";

export interface AbramusCredentials {
  username: string;
  base_url?: string;
  saved_at: string;
}

export const abramusCredentialsClient = {
  read(): AbramusCredentials | null {
    try {
      return JSON.parse(localStorage.getItem(CRED_KEY) || "null");
    } catch {
      return null;
    }
  },
  write(c: AbramusCredentials): void {
    try {
      localStorage.setItem(CRED_KEY, JSON.stringify(c));
    } catch {
      /* ignore quota */
    }
  },
  clear(): void {
    try {
      localStorage.removeItem(CRED_KEY);
    } catch {
      /* ignore */
    }
  },
  readSchedule(): AbramusSyncSchedule {
    try {
      return (localStorage.getItem(SCHED_KEY) as AbramusSyncSchedule) || "off";
    } catch {
      return "off";
    }
  },
  writeSchedule(s: AbramusSyncSchedule): void {
    try {
      localStorage.setItem(SCHED_KEY, s);
    } catch {
      /* ignore */
    }
  },
};

// ─── Mock ABRAMUS DB ──────────────────────────────────────────────────────────
export const ABRAMUS_OBRAS_DB: AbramusSearchResult[] = [
  { external_id: "ABR-001-2025", titulo: "Noite de Luz", iswc: "T-123.456.789-0", genero: "Pop", compositores: ["Vitória Carvalho", "Lucas Mendes"], artista_nome: "Vitória Lunar", duracao: "3:42", data_registro: "2025-01-10" },
  { external_id: "ABR-002-2025", titulo: "Beira do Rio", iswc: "T-234.567.890-1", genero: "Forró", compositores: ["Grupo Raiz Nordestina"], artista_nome: "Grupo Raiz Nordestina", duracao: "4:15", data_registro: "2025-01-12" },
  { external_id: "ABR-003-2025", titulo: "Frequência 440", iswc: "T-345.678.901-2", genero: "Eletrônico", compositores: ["Marcus Oliveira"], artista_nome: "DJ Marcus Flow", duracao: "5:30", data_registro: "2025-01-15" },
  { external_id: "ABR-004-2025", titulo: "Amor de Interior", iswc: "T-456.789.012-3", genero: "Sertanejo", compositores: ["Ana Beatriz Santos", "Rodolfo Lima"], artista_nome: "Ana Beatriz Santos", duracao: "3:58", data_registro: "2025-01-18" },
  { external_id: "ABR-005-2025", titulo: "Suíte Brasileira nº 1", iswc: "T-567.890.123-4", genero: "MPB", compositores: ["Trio Bossa Moderna"], artista_nome: "Trio Bossa Moderna", duracao: "7:20", data_registro: "2025-01-20" },
  { external_id: "ABR-101-2025", titulo: "Lua Cheia", iswc: "T-101.001.001-0", genero: "Pop", compositores: ["Vitória Carvalho"], artista_nome: "Vitória Lunar", duracao: "3:50", data_registro: "2025-05-02" },
  { external_id: "ABR-102-2025", titulo: "Reza Forte", iswc: "T-102.001.001-0", genero: "Forró", compositores: ["Grupo Raiz Nordestina"], artista_nome: "Grupo Raiz Nordestina", duracao: "4:10", data_registro: "2025-05-05" },
  { external_id: "ABR-103-2025", titulo: "Bass Drop 2026", iswc: "T-103.001.001-0", genero: "Eletrônico", compositores: ["Marcus Oliveira"], artista_nome: "DJ Marcus Flow", duracao: "5:55", data_registro: "2025-05-08" },
  { external_id: "ABR-104-2025", titulo: "Cerrado", iswc: "T-104.001.001-0", genero: "Sertanejo", compositores: ["Ana Beatriz Santos"], artista_nome: "Ana Beatriz Santos", duracao: "3:45", data_registro: "2025-05-12" },
  { external_id: "ABR-105-2025", titulo: "Improviso Jazz", iswc: "T-105.001.001-0", genero: "MPB", compositores: ["Trio Bossa Moderna"], artista_nome: "Trio Bossa Moderna", duracao: "6:30", data_registro: "2025-05-15" },
];

export const ABRAMUS_FONOGRAMAS_DB: AbramusSearchResult[] = [
  { external_id: "ABR-001-2025", titulo: "Noite de Luz", isrc: "BRMSC2500001", genero: "Pop", compositores: ["Vitória Carvalho", "Lucas Mendes"], gravadora: "MusicOS 360", produtores: ["Rafael Santana"], artista_nome: "Vitória Lunar", duracao: "3:42", data_registro: "2025-01-10" },
  { external_id: "ABR-002-2025", titulo: "Beira do Rio", isrc: "BRMSC2500002", genero: "Forró", compositores: ["Grupo Raiz Nordestina"], gravadora: "MusicOS 360", produtores: ["Rafael Santana"], artista_nome: "Grupo Raiz Nordestina", duracao: "4:15", data_registro: "2025-01-12" },
  { external_id: "ABR-F-101", titulo: "Lua Cheia", isrc: "BRMSC2600001", genero: "Pop", compositores: ["Vitória Carvalho"], gravadora: "MusicOS 360", produtores: ["Rafael Santana"], artista_nome: "Vitória Lunar", duracao: "3:50", data_registro: "2025-05-02" },
  { external_id: "ABR-F-102", titulo: "Reza Forte", isrc: "BRMSC2600002", genero: "Forró", compositores: ["Grupo Raiz Nordestina"], gravadora: "MusicOS 360", produtores: ["Rafael Santana"], artista_nome: "Grupo Raiz Nordestina", duracao: "4:10", data_registro: "2025-05-05" },
];

// ─── API Client ───────────────────────────────────────────────────────────────

/**
 * STEP 5 — Busca registros no banco ABRAMUS com retry automático.
 * Em produção: substitua por fetch() para a API real.
 * Normaliza qualquer erro em IntegrationError.
 */
export async function abramusSearch(
  kind: AbramusKind,
  query: string,
): Promise<AbramusSearchResponse> {
  const creds = abramusCredentialsClient.read();
  if (!creds) {
    return { results: [], error: "not_configured" };
  }

  const db = kind === "obras" ? ABRAMUS_OBRAS_DB : ABRAMUS_FONOGRAMAS_DB;
  const q = query.trim().toLowerCase();
  if (q.length < 2) return { results: [], total: 0, has_more: false };

  try {
    // STEP 5 — withRetry: em produção protege chamadas de rede reais
    return await withRetry(
      async () => {
        const results = db.filter((r) => {
          const haystack = [
            r.titulo, r.artista_nome, r.genero, r.iswc, r.isrc,
            ...(r.compositores ?? []), ...(r.produtores ?? []),
          ].filter(Boolean).join(" ").toLowerCase();
          return haystack.includes(q);
        });
        return { results, total: results.length, has_more: false };
      },
      {
        attempts: 2,
        baseDelayMs: 200,
        retryIf: (err) => err instanceof IntegrationError && (err as IntegrationError).retryable,
      },
    );
  } catch (err) {
    // STEP 5 — Normaliza erros externos em IntegrationError
    if (err instanceof IntegrationError) throw err;
    throw new IntegrationError(
      "ABRAMUS",
      `Falha na busca: ${err instanceof Error ? err.message : String(err)}`,
      { retryable: true },
    );
  }
}

/**
 * Verifica o status da conexão ABRAMUS.
 */
export async function abramusGetStatus(): Promise<AbramusStatus> {
  const creds = abramusCredentialsClient.read();
  if (!creds) {
    return {
      connected: false,
      status: "disconnected",
      sync_schedule: abramusCredentialsClient.readSchedule(),
    };
  }
  return {
    connected: true,
    status: "ok",
    username: creds.username,
    base_url: creds.base_url ?? null,
    last_error: null,
    last_sync_at: null,
    last_sync_summary: null,
    sync_schedule: abramusCredentialsClient.readSchedule(),
    next_sync_at: null,
  };
}
