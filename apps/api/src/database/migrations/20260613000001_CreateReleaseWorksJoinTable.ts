import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Cria a join table M2M `release_works` (ReleaseEntity @ManyToMany WorkEntity).
 * A relação já existe nas entities (entities.ts), mas a tabela física nunca foi
 * criada por migration — só no dump consolidado. Esta migration materializa a
 * tabela de forma reversível e não-destrutiva.
 *
 * Chaves: PK composta (release_id, work_id). FKs com ON DELETE CASCADE para que
 * a remoção de um release/obra limpe automaticamente os vínculos. Índice no lado
 * inverso (work_id) para navegação Work → Releases.
 */
export class CreateReleaseWorksJoinTable20260613000001 implements MigrationInterface {
  name = 'CreateReleaseWorksJoinTable20260613000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "release_works" (
        "release_id" uuid NOT NULL,
        "work_id" uuid NOT NULL,
        CONSTRAINT "PK_release_works" PRIMARY KEY ("release_id", "work_id"),
        CONSTRAINT "FK_release_works_release"
          FOREIGN KEY ("release_id") REFERENCES "releases"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_release_works_work"
          FOREIGN KEY ("work_id") REFERENCES "works"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_release_works_work"
      ON "release_works" ("work_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_release_works_release"
      ON "release_works" ("release_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_release_works_release"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_release_works_work"');
    await queryRunner.query('DROP TABLE IF EXISTS "release_works"');
  }
}
