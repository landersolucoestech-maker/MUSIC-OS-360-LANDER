/**
 * modules/reports/computed-fields/projects-musicas.field.ts  ·  Parte 87
 *
 * Resolver dedicado para a aba filha "Músicas do Projeto"
 * (PROJECTS_CONTRACT.childSheets, report-form-contracts.ts). `musicas[]` não
 * tem coluna física em `projects` — é normalizada em `project_tracks` +
 * `project_track_participants` (migration
 * ProjectsFormFieldAlignment20260718000013). O motor genérico de export/
 * import (SQL direto sobre UMA tabela) não suporta essa relação 1:N; este
 * módulo é o único ponto de acesso a essas duas tabelas a partir do domínio
 * de Relatórios.
 *
 * Cada música vira UMA LINHA da aba "Músicas do Projeto" (nunca uma célula
 * JSON — Parte 87, Bloco 6). `duracao` combina duracao_min/duracao_seg no
 * mesmo formato "MIN:SEG" que o modal exibe sob um único Label.
 * compositores/interpretes/produtores são texto separado por ", " (campo
 * `multi` do childSheet) — mesma convenção já usada em outros contratos para
 * listas simples de nomes.
 */
import { randomUUID } from 'crypto';
import type { DataSource, QueryRunner } from 'typeorm';

export interface MusicaFieldItem {
  nome: string;
  soloFeat: string | null;
  originalRemix: string | null;
  instrumental: string | null;
  duracao: string;
  genero: string | null;
  idioma: string | null;
  compositores: string[];
  interpretes: string[];
  produtores: string[];
  letra: string | null;
  audioUrl: string | null;
  ordem: number;
}

type TrackRole = 'compositor' | 'interprete' | 'produtor';

interface TrackRow {
  id: string;
  project_id: string;
  nome: string;
  solo_feat: string | null;
  original_remix: string | null;
  instrumental: string | null;
  duracao_min: string | null;
  duracao_seg: string | null;
  genero: string | null;
  idioma: string | null;
  letra: string | null;
  audio_url: string | null;
  ordem: number;
}

interface ParticipantRow {
  project_track_id: string;
  nome: string;
  role: TrackRole;
}

function formatDuracao(min: string | null, seg: string | null): string {
  if (!min && !seg) return '';
  return `${min ?? '0'}:${(seg ?? '0').padStart(2, '0')}`;
}

function parseDuracao(value: string | null | undefined): { min: string | null; seg: string | null } {
  const raw = (value ?? '').trim();
  if (!raw) return { min: null, seg: null };
  const [min, seg] = raw.split(':').map((s) => s.trim());
  return { min: min || null, seg: seg || null };
}

/** Export: busca musicas[] de N projetos de uma vez (evita N+1), uma linha por música. */
export async function fetchProjectsMusicasForExport(
  ds: DataSource,
  tenantId: string,
  projectIds: string[],
): Promise<Map<string, MusicaFieldItem[]>> {
  const out = new Map<string, MusicaFieldItem[]>();
  if (projectIds.length === 0) return out;

  const tracks = (await ds.query(
    `SELECT "id", "project_id", "nome", "solo_feat", "original_remix", "instrumental",
            "duracao_min", "duracao_seg", "genero", "idioma", "letra", "audio_url", "ordem"
       FROM "project_tracks"
      WHERE "tenant_id" = $1 AND "project_id" = ANY($2::uuid[])
      ORDER BY "ordem" ASC`,
    [tenantId, projectIds],
  )) as TrackRow[];

  const trackIds = tracks.map((t) => t.id);
  const participants: ParticipantRow[] = trackIds.length
    ? ((await ds.query(
        `SELECT "project_track_id", "nome", "role"
           FROM "project_track_participants"
          WHERE "tenant_id" = $1 AND "project_track_id" = ANY($2::uuid[])
          ORDER BY "ordem" ASC`,
        [tenantId, trackIds],
      )) as ParticipantRow[])
    : [];

  const byTrack = new Map<string, ParticipantRow[]>();
  for (const p of participants) {
    const list = byTrack.get(p.project_track_id) ?? [];
    list.push(p);
    byTrack.set(p.project_track_id, list);
  }
  const namesByRole = (trackId: string, role: TrackRole): string[] =>
    (byTrack.get(trackId) ?? []).filter((p) => p.role === role).map((p) => p.nome);

  for (const t of tracks) {
    const list = out.get(t.project_id) ?? [];
    list.push({
      nome: t.nome,
      soloFeat: t.solo_feat,
      originalRemix: t.original_remix,
      instrumental: t.instrumental,
      duracao: formatDuracao(t.duracao_min, t.duracao_seg),
      genero: t.genero,
      idioma: t.idioma,
      compositores: namesByRole(t.id, 'compositor'),
      interpretes: namesByRole(t.id, 'interprete'),
      produtores: namesByRole(t.id, 'produtor'),
      letra: t.letra,
      audioUrl: t.audio_url,
      ordem: t.ordem,
    });
    out.set(t.project_id, list);
  }

  return out;
}

/** Import (create-only, dentro da transação do commit): insere musicas[] de UM projeto recém-criado. */
export async function insertProjectsMusicasForImport(
  qr: QueryRunner,
  tenantId: string,
  projectId: string,
  musicas: unknown,
): Promise<void> {
  if (!Array.isArray(musicas)) return;

  let ordem = 0;
  for (const raw of musicas) {
    if (raw === null || typeof raw !== 'object') continue;
    const m = raw as Record<string, unknown>;
    const trackId = randomUUID();
    const { min: duracaoMin, seg: duracaoSeg } = parseDuracao(m.duracao as string | undefined);

    await qr.query(
      `INSERT INTO "project_tracks"
         ("id", "tenant_id", "project_id", "nome", "solo_feat", "original_remix",
          "instrumental", "duracao_min", "duracao_seg", "genero", "idioma", "letra",
          "audio_url", "ordem")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        trackId, tenantId, projectId,
        String(m.nome ?? ''),
        (m.soloFeat as string) || null,
        (m.originalRemix as string) || null,
        (m.instrumental as string) || null,
        duracaoMin,
        duracaoSeg,
        (m.genero as string) || null,
        (m.idioma as string) || null,
        (m.letra as string) || null,
        (m.audioUrl as string) || null,
        ordem++,
      ],
    );

    const roleFields: Array<[TrackRole, unknown]> = [
      ['compositor', m.compositores], ['interprete', m.interpretes], ['produtor', m.produtores],
    ];
    for (const [role, list] of roleFields) {
      if (!Array.isArray(list)) continue;
      let pOrdem = 0;
      for (const nome of list) {
        if (typeof nome !== 'string' || nome.trim().length === 0) continue;
        await qr.query(
          `INSERT INTO "project_track_participants"
             ("id", "tenant_id", "project_track_id", "nome", "role", "ordem")
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [randomUUID(), tenantId, trackId, nome.trim(), role, pOrdem++],
        );
      }
    }
  }
}
