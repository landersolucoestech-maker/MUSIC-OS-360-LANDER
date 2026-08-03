import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 20260803000002_FixDefaultPrivilegesCreatorRole
 *
 * Parte 80 — corrige uma suposição incorreta da migration anterior
 * (20260802000001_GrantMusicosAppOnAllTables): ela configurou
 * `ALTER DEFAULT PRIVILEGES FOR ROLE musicos_migrator`, esperando que isso
 * protegesse toda tabela tenant-scoped futura. Não protege nada: Postgres
 * aplica default privileges ao role que efetivamente executa o CREATE TABLE,
 * não ao owner final. Toda migration deste projeto roda via DATABASE_URL
 * conectado como `postgres` (confirmado com SELECT current_user nesta
 * Parte) — o `ALTER TABLE ... OWNER TO musicos_migrator` de cada migration
 * só troca o dono DEPOIS da criação; não reescreve default privileges.
 *
 * Prova concreta: a migration 20260803000001_CreateClientAttachments criou
 * `client_attachments` seguindo o padrão de sempre (RLS + OWNER TO
 * musicos_migrator) e, mesmo assim, `musicos_app` ficou sem nenhum grant —
 * seria o mesmo "column/relation does not exist" silencioso das Partes 78/79
 * na primeira leitura real da tabela, só que desta vez a causa é ausência
 * de SELECT, não schema drift.
 *
 * Corrige a fonte da verdade: default privileges no role que REALMENTE cria
 * os objetos (postgres). Migrations futuras passam a herdar os grants
 * automaticamente, sem exigir GRANT explícito por tabela — mas cada
 * migration continua concedendo explicitamente por segurança (defesa em
 * profundidade, mesmo padrão já usado em todas as RebuildXInCanonicalFormOrder).
 */
export class FixDefaultPrivilegesCreatorRole20260803000002 implements MigrationInterface {
  name = 'FixDefaultPrivilegesCreatorRole20260803000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const [{ current_user: creatorRole }] = await queryRunner.query(`SELECT current_user`);

    await queryRunner.query(`
      ALTER DEFAULT PRIVILEGES FOR ROLE "${creatorRole}" IN SCHEMA public
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO musicos_app
    `);
    await queryRunner.query(`
      ALTER DEFAULT PRIVILEGES FOR ROLE "${creatorRole}" IN SCHEMA public
        GRANT USAGE, SELECT ON SEQUENCES TO musicos_app
    `);

    // Corrige retroativamente a tabela criada pela migration imediatamente
    // anterior, antes desta correção existir.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'client_attachments') THEN
          EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.client_attachments TO musicos_app';
        END IF;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const [{ current_user: creatorRole }] = await queryRunner.query(`SELECT current_user`);
    await queryRunner.query(`
      ALTER DEFAULT PRIVILEGES FOR ROLE "${creatorRole}" IN SCHEMA public
        REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM musicos_app
    `);
    await queryRunner.query(`
      ALTER DEFAULT PRIVILEGES FOR ROLE "${creatorRole}" IN SCHEMA public
        REVOKE USAGE, SELECT ON SEQUENCES FROM musicos_app
    `);
    await queryRunner.query(`REVOKE ALL ON TABLE public.client_attachments FROM musicos_app`);
  }
}
