import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 20260905000005_RenameClientProjectCampaignReleaseFks
 *
 * Naming-normalization mandate (Batch 4): every technical identifier must
 * be English. Four more FK families were spelled in Portuguese in
 * cross-module tables:
 *
 *  - `cliente_id` -> `client_id`   (FK to `clients.id`)
 *  - `projeto_id` -> `project_id`  (FK to `projects.id`)
 *  - `campanha_id` -> `campaign_id` (FK to `campaigns.id`)
 *  - `lancamento_id` -> `release_id` (FK to `releases.id` — confirmed by
 *    frontend evidence: `apps/web/.../releases/pages/Lancamentos.tsx` and
 *    `LancamentoViewModal.tsx` operate directly on `ReleaseEntity`/the
 *    `releases` table; there is no separate "Lancamento" entity, resolving
 *    this family's earlier REQUIRES_REVIEW flag)
 *
 * Also includes `artista_projeto_id` -> `artista_project_id` on `shares`
 * (a distinct compound column — "artist's project", not the bare FK — that
 * happened to contain the same `projeto_id` substring).
 *
 * `RENAME COLUMN` is metadata-only in Postgres (no rewrite, no data
 * movement). Guarded with `IF EXISTS` so this is safe to re-run and a
 * no-op if a table doesn't have the column.
 */
export class RenameClientProjectCampaignReleaseFks20260905000005 implements MigrationInterface {
  name = 'RenameClientProjectCampaignReleaseFks20260905000005';

  private readonly renames: Array<{ table: string; from: string; to: string }> = [
    { table: 'contracts', from: 'cliente_id', to: 'client_id' },
    { table: 'invoices', from: 'cliente_id', to: 'client_id' },
    { table: 'client_attachments', from: 'cliente_id', to: 'client_id' },
    { table: 'leads', from: 'cliente_id', to: 'client_id' },
    { table: 'licenses', from: 'cliente_id', to: 'client_id' },
    { table: 'works', from: 'projeto_id', to: 'project_id' },
    { table: 'transactions', from: 'projeto_id', to: 'project_id' },
    { table: 'briefings', from: 'campanha_id', to: 'campaign_id' },
    { table: 'contracts', from: 'lancamento_id', to: 'release_id' },
    { table: 'shares', from: 'lancamento_id', to: 'release_id' },
    { table: 'shares', from: 'artista_projeto_id', to: 'artista_project_id' },
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const { table, from, to } of this.renames) {
      await queryRunner.query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = '${table}' AND column_name = '${from}'
          ) THEN
            ALTER TABLE "${table}" RENAME COLUMN "${from}" TO "${to}";
          END IF;
        END $$;
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const { table, from, to } of this.renames) {
      await queryRunner.query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = '${table}' AND column_name = '${to}'
          ) THEN
            ALTER TABLE "${table}" RENAME COLUMN "${to}" TO "${from}";
          END IF;
        END $$;
      `);
    }
  }
}
