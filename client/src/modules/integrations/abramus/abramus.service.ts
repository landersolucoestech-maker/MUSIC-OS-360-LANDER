/**
 * STEP 7 — Integration Refactor: abramus.service.ts
 *
 * Camada de serviço da integração ABRAMUS.
 * Orquestra a lógica de domínio: importação, lookup local, sincronização.
 *
 * Responsabilidade: lógica de integração de domínio.
 * Usa abramus.client.ts para I/O e storage.ts para persistência local.
 */
import { storage } from "@/shared/lib/storage";
import { MOCK_USER_ID } from "@/shared/data/mockData";
import {
  abramusSearch,
  abramusCredentialsClient,
  ABRAMUS_OBRAS_DB,
  ABRAMUS_FONOGRAMAS_DB,
} from "./abramus.client";
import type { AbramusKind, AbramusSearchResult } from "../hooks/useAbramus";

export interface AbramusLocalMatch {
  id: string;
  titulo: string;
}

/**
 * Busca registros ABRAMUS pelo query.
 */
export async function searchAbramus(kind: AbramusKind, query: string) {
  return abramusSearch(kind, query);
}

/**
 * Verifica se um registro externo já existe localmente.
 * Busca por cod_abramus ou origem_externa_id.
 */
export async function findLocalMatch(
  kind: AbramusKind,
  externalId: string,
): Promise<AbramusLocalMatch | null> {
  const table = kind === "obras" ? "obras" : "fonogramas";
  const rows = await storage.list<Record<string, unknown> & { id: string }>(table);
  const match = rows.find(
    (r) => r.cod_abramus === externalId || r.origem_externa_id === externalId,
  );
  if (!match) return null;
  return {
    id: match.id as string,
    titulo: (match.titulo as string) ?? "—",
  };
}

/**
 * Importa um registro ABRAMUS para o catálogo local.
 * Idempotente: retorna o existente se já importado.
 */
export async function importAbramusRecord(
  kind: AbramusKind,
  externalId: string,
  record?: AbramusSearchResult,
): Promise<{ imported: boolean; id: string }> {
  // Verificar credenciais
  const creds = abramusCredentialsClient.read();
  if (!creds) throw new Error("ABRAMUS não está conectado. Configure as credenciais primeiro.");

  // Verificar se já existe localmente
  const existing = await findLocalMatch(kind, externalId);
  if (existing) return { imported: false, id: existing.id };

  // Buscar o registro no banco ABRAMUS
  const db = kind === "obras" ? ABRAMUS_OBRAS_DB : ABRAMUS_FONOGRAMAS_DB;
  const rec = record ?? db.find((r) => r.external_id === externalId);
  if (!rec) throw new Error(`Registro ${externalId} não encontrado no banco ABRAMUS.`);

  // Montar payload e persistir via storage
  const now = new Date().toISOString();
  const table = kind === "obras" ? "obras" : "fonogramas";

  const payload =
    kind === "obras"
      ? {
          user_id: MOCK_USER_ID,
          titulo: rec.titulo,
          compositor: rec.compositores?.[0] ?? null,
          compositores: rec.compositores?.join(", ") ?? null,
          co_compositores: rec.compositores?.slice(1).join(", ") ?? null,
          letristas: rec.letristas?.join(", ") ?? null,
          detentores: "MusicOS Publishing",
          editora: "MusicOS Publishing",
          isrc: rec.isrc ?? null,
          iswc: rec.iswc ?? null,
          cod_abramus: externalId,
          cod_ecad: null,
          tipo: "musica",
          genero: rec.genero ?? null,
          status: "registrado",
          duracao: rec.duracao ?? null,
          origem_externa: "abramus",
          origem_externa_id: externalId,
          origem_externa_sincronizado_em: now,
          projeto_id: null,
          artista_id: null,
        }
      : {
          user_id: MOCK_USER_ID,
          titulo: rec.titulo,
          obra_id: null,
          artista_id: null,
          isrc: rec.isrc ?? null,
          duracao: rec.duracao ?? null,
          tipo: "original",
          status: "registrado",
          compositores: rec.compositores?.join(", ") ?? null,
          interpretes: rec.artista_nome ?? null,
          produtores: rec.produtores?.join(", ") ?? null,
          gravadora: rec.gravadora ?? "MusicOS 360",
          cod_abramus: externalId,
          cod_ecad: null,
          genero_musical: rec.genero ?? null,
          origem_externa: "abramus",
          origem_externa_id: externalId,
          origem_externa_sincronizado_em: now,
          data_registro: rec.data_registro ?? null,
        };

  const created = await storage.create<Record<string, unknown> & { id: string }>(
    table,
    payload as Omit<Record<string, unknown> & { id: string }, "id" | "user_id" | "created_at" | "updated_at">,
  );

  return { imported: true, id: created.id as string };
}

/**
 * Sincroniza todo o banco ABRAMUS com o catálogo local.
 */
export async function syncAllAbramus(kind: AbramusKind): Promise<{
  inserted: number;
  updated: number;
  errors: number;
}> {
  const creds = abramusCredentialsClient.read();
  if (!creds) throw new Error("ABRAMUS não configurado.");

  const db = kind === "obras" ? ABRAMUS_OBRAS_DB : ABRAMUS_FONOGRAMAS_DB;
  let inserted = 0;
  let errors = 0;

  for (const record of db) {
    try {
      const result = await importAbramusRecord(kind, record.external_id, record);
      if (result.imported) inserted++;
    } catch {
      errors++;
    }
  }

  return { inserted, updated: 0, errors };
}
