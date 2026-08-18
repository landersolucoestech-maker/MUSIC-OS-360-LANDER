import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * ROOT CAUSE do 409 espúrio ao editar Artista (reproduzido: `expectedUpdatedAt`
 * enviado pelo frontend era byte-idêntico ao `updated_at` retornado pela API —
 * e ainda assim `casUpdate` rejeitava com 0 linhas afetadas).
 *
 * `artists.updated_at`/`created_at` eram `timestamp` (SEM timezone) — o único
 * par de colunas assim nesta tabela entre ~80 outras entidades do projeto,
 * que corretamente usam `timestamptz`. Uma coluna `timestamp` naive é
 * ambígua: o driver `pg`/TypeORM, ao LER o valor de volta para a API,
 * interpreta os dígitos crus usando o timezone LOCAL do processo Node (ex.:
 * America/Sao_Paulo, UTC-3) — mas `casUpdate`
 * (common/persistence/optimistic-update.util.ts) compara via SQL usando um
 * cast implícito `timestamp -> timestamptz` que usa o TimeZone da SESSÃO do
 * Postgres (UTC). As duas interpretações divergem exatamente pelo offset do
 * processo Node (3h neste ambiente) — todo CAS de artista estava
 * matematicamente fadado a nunca bater, mesmo sem nenhuma edição concorrente
 * real. Comprovado com SQL direto:
 *   date_trunc('milliseconds', updated_at) = date_trunc('milliseconds', $1::timestamptz)
 *   -> false, com $1 sendo o EXATO valor devolvido pela API segundos antes.
 *
 * `timestamptz` armazena um instante inequívoco — elimina essa classe de bug
 * definitivamente, em qualquer timezone de processo/sessão, sempre.
 *
 * `AT TIME ZONE 'UTC'` no USING é uma conversão não-destrutiva: preserva os
 * dígitos crus já gravados como o mesmo instante UTC (sem tentar "adivinhar"
 * retroativamente qual timezone de processo gravou cada linha histórica —
 * isso é ambíguo e arriscado de inferir por ambiente/deploy). Escopo
 * deliberadamente restrito a `artists` (a tabela do bug reportado); as
 * demais ~39 entidades do projeto com o mesmo padrão `timestamp` sem tz
 * ficam fora desta migration.
 */
export class ArtistsTimestampTzFix20260818000001 implements MigrationInterface {
  name = 'ArtistsTimestampTzFix20260818000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "artists"
        ALTER COLUMN "created_at" TYPE timestamptz USING "created_at" AT TIME ZONE 'UTC',
        ALTER COLUMN "updated_at" TYPE timestamptz USING "updated_at" AT TIME ZONE 'UTC'
    `);
    await queryRunner.query(`ALTER TABLE "artists" ALTER COLUMN "created_at" SET DEFAULT now()`);
    await queryRunner.query(`ALTER TABLE "artists" ALTER COLUMN "updated_at" SET DEFAULT now()`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "artists"
        ALTER COLUMN "created_at" TYPE timestamp USING "created_at" AT TIME ZONE 'UTC',
        ALTER COLUMN "updated_at" TYPE timestamp USING "updated_at" AT TIME ZONE 'UTC'
    `);
    await queryRunner.query(`ALTER TABLE "artists" ALTER COLUMN "created_at" SET DEFAULT now()`);
    await queryRunner.query(`ALTER TABLE "artists" ALTER COLUMN "updated_at" SET DEFAULT now()`);
  }
}
