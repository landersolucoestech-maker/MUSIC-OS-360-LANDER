import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Sincronização formulário ↔ banco: Lançamentos (releases).
 *
 * REGRA DE PRODUTO (2026-07-12): cada campo do formulário tem a SUA coluna
 * física com o nome EXATO da chave enviada pelo form. `releases` ficou de
 * fora do rollout original (2026-07-12) — o mapper de leitura do frontend
 * (entity-to-form.mapper.ts) já lê estes campos como colunas de topo
 * (l?.genero, l?.copyright, l?.isrc_global, etc.) com fallback para
 * `metadata`, mas o mapper de escrita (form-to-payload.mapper.ts) ainda
 * gravava tudo dentro de `metadata` por não existir DTO/coluna dedicados.
 * Esta migration fecha essa lacuna.
 *
 * `assets` e `cronograma` permanecem jsonb dedicados (não genéricos): cada um
 * tem um conjunto fixo e conhecido de subchaves (7 e 3, respectivamente),
 * já usado hoje como `metadata.assets` / `metadata.cronograma` — não é dado
 * dinâmico/imprevisível, é um sub-registro estruturado com nome próprio,
 * no mesmo padrão de `plataformas` (jsonb já existente nesta entidade).
 */
export class ReleasesFormFieldColumns20260718000010 implements MigrationInterface {
  name = 'ReleasesFormFieldColumns20260718000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "releases"
        ADD COLUMN IF NOT EXISTS "isrc_global" varchar(50),
        ADD COLUMN IF NOT EXISTS "notas_internas" text,
        ADD COLUMN IF NOT EXISTS "observacoes" text,
        ADD COLUMN IF NOT EXISTS "gravadora" varchar(255),
        ADD COLUMN IF NOT EXISTS "copyright" varchar(255),
        ADD COLUMN IF NOT EXISTS "genero" varchar(100),
        ADD COLUMN IF NOT EXISTS "idioma" varchar(50),
        ADD COLUMN IF NOT EXISTS "assets" jsonb,
        ADD COLUMN IF NOT EXISTS "cronograma" jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "releases"
        DROP COLUMN IF EXISTS "isrc_global",
        DROP COLUMN IF EXISTS "notas_internas",
        DROP COLUMN IF EXISTS "observacoes",
        DROP COLUMN IF EXISTS "gravadora",
        DROP COLUMN IF EXISTS "copyright",
        DROP COLUMN IF EXISTS "genero",
        DROP COLUMN IF EXISTS "idioma",
        DROP COLUMN IF EXISTS "assets",
        DROP COLUMN IF EXISTS "cronograma"
    `);
  }
}
