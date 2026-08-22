import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Remove `artists.tipo` (formação do artista: solo/banda/duo/trio/grupo/
 * coletivo) — decisão de produto (Artists Schema 15): o conceito deixou de
 * fazer parte do domínio Artist, não foi normalizado nem substituído.
 *
 * Auditoria antes do drop (2026-08-21):
 *   - ArtistEntity nunca teve `tipo` como propriedade real de negócio além
 *     do próprio armazenamento (nenhuma leitura/filtro/exibição usava o
 *     valor) — confirmado por grep exaustivo em apps/api e apps/web.
 *   - Nenhuma CHECK constraint, índice, view, função ou trigger referencia
 *     `artists.tipo` em nenhuma migration existente.
 *   - Único consumidor de escrita fora do próprio `ArtistsService.create()`
 *     era `LeadEventsHandler` (conversão lead→artista, sempre gravava
 *     'solo') — removido junto na mesma limpeza de código desta parte.
 *   - Seed operacional (`03_operational_seed.ts`) e ~9 scripts de
 *     verify/smoke também gravavam/enviavam 'solo' — todos ajustados.
 *
 * down() recria a coluna com o tipo/default/nullability originais (ver
 * RebuildArtistsInCanonicalFormOrder20260719000001.originalColumns:
 * `tipo varchar(50) NOT NULL DEFAULT 'solo'`) — mas não restaura dado, já
 * que 100% das linhas reais em DEV tinham o mesmo valor 'solo' (nenhuma
 * variação a preservar).
 */
export class DropArtistTipoColumn20260821000002 implements MigrationInterface {
  name = 'DropArtistTipoColumn20260821000002';

  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE public."artists"
        DROP COLUMN IF EXISTS "tipo"
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE public."artists"
        ADD COLUMN IF NOT EXISTS "tipo" varchar(50) NOT NULL DEFAULT 'solo'
    `);
  }
}
