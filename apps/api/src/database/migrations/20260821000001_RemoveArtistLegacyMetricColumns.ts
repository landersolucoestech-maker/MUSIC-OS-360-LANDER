import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Remove 9 colunas físicas de `artists` órfãs desde a migration
 * ArtistsFormFieldColumns20260712000001, que as criou com a intenção de dar
 * a cada campo do formulário sua própria coluna. Essa intenção nunca foi
 * concluída: o service (`ArtistsService`) continuou (ou voltou a) persistir
 * esses mesmos campos em `metadata` (jsonb), via METADATA_FIELDS derivado de
 * `report-form-contracts.ts`. `ArtistEntity` nunca mapeou estas 9 colunas —
 * nenhum SELECT/INSERT/UPDATE do TypeORM as toca.
 *
 * Auditoria (Métricas 09/10/11, Artists Schema 11 — 2026-08-21), grep
 * exaustivo em apps/api e apps/web, incluindo handlers de automação fora do
 * módulo artists (leads/contracts/external-data): zero leitura/escrita fora
 * de migrations, do script `verify-canonical-column-order.ts` (só confere
 * ordem física) e dos dumps de schema (drizzle/, migrations-complete.sql).
 *
 * Comparação físico vs metadata no DEV real antes deste drop (3 artistas
 * ativos, população total, não amostra):
 *   - spotify_ouvintes, youtube_inscritos, deezer_fas, instagram_seguidores,
 *     tiktok_seguidores, apple_music_albuns, soundcloud_seguidores: 0 valores
 *     não-nulos em NENHUM dos dois lados, em todos os 3 artistas.
 *   - instagram/tiktok: 1 artista (Dj Stay) tem valor nos dois lados; tiktok
 *     idêntico; instagram difere só por barra final
 *     ("...djstayofc/" vs "...djstayofc") — mesmo handle, sem dado histórico
 *     distinto preso na coluna física.
 * Nenhuma linha tinha dado físico ausente em metadata (physical_only = 0 em
 * todas as 9 colunas) — não há DATA_MIGRATION_REQUIRED.
 *
 * `status_cadastro` foi auditada e INTENCIONALMENTE MANTIDA — ao contrário
 * das 9 acima, ELA É mapeada por ArtistEntity (@Column real) e é escrita por
 * uma automação real fora do módulo artists: `LeadEventsHandler` (módulo
 * leads) cria o ArtistEntity da conversão de lead com
 * `status_cadastro: ArtistStatusCadastro.ATIVO` explícito. Dropar a coluna
 * sem also remover o `@Column`/o `ArtistStatusCadastro` do entity e esse
 * write quebraria a conversão de lead→artista em runtime. Fora de escopo
 * desta limpeza "segura agora" — decisão separada e deliberada.
 *
 * `tipo`/`status` (as duas outras colunas com "status" no nome) também NÃO
 * são tocadas aqui — auditoria anterior confirmou CANONICAL para ambas.
 *
 * down() recria as 9 colunas com tipo/default/nullability originais
 * (ver RebuildArtistsInCanonicalFormOrder20260719000001.originalColumns) —
 * mas não restaura dado, já que nenhum foi perdido (nada fora de metadata).
 */
export class RemoveArtistLegacyMetricColumns20260821000001
  implements MigrationInterface
{
  name = 'RemoveArtistLegacyMetricColumns20260821000001';

  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE public."artists"
        DROP COLUMN IF EXISTS "spotify_ouvintes",
        DROP COLUMN IF EXISTS "youtube_inscritos",
        DROP COLUMN IF EXISTS "deezer_fas",
        DROP COLUMN IF EXISTS "instagram_seguidores",
        DROP COLUMN IF EXISTS "tiktok_seguidores",
        DROP COLUMN IF EXISTS "apple_music_albuns",
        DROP COLUMN IF EXISTS "soundcloud_seguidores",
        DROP COLUMN IF EXISTS "instagram",
        DROP COLUMN IF EXISTS "tiktok"
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE public."artists"
        ADD COLUMN IF NOT EXISTS "spotify_ouvintes" integer,
        ADD COLUMN IF NOT EXISTS "youtube_inscritos" integer,
        ADD COLUMN IF NOT EXISTS "deezer_fas" integer,
        ADD COLUMN IF NOT EXISTS "instagram_seguidores" integer,
        ADD COLUMN IF NOT EXISTS "tiktok_seguidores" integer,
        ADD COLUMN IF NOT EXISTS "apple_music_albuns" integer,
        ADD COLUMN IF NOT EXISTS "soundcloud_seguidores" integer,
        ADD COLUMN IF NOT EXISTS "instagram" text,
        ADD COLUMN IF NOT EXISTS "tiktok" text
    `);
  }
}
