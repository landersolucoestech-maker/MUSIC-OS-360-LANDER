import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Reconstrução física de `campaigns` — auditoria 2026-07-19.
 *
 * ACHADO CRÍTICO (registrado como pendência, NÃO corrigido aqui — fora do
 * escopo de reordenação física): `CreateCampaignDto` usa nomes de campo
 * (title/type/artistId/budget/currency/startsAt/endsAt/platforms) que NÃO
 * batem com as colunas físicas da entidade (nome/tipo/artista_id/orcamento/
 * data_inicio/data_fim) — `CampaignsService.create()` faz apenas um spread
 * do DTO sobre a entidade, então esses campos nunca chegam às colunas
 * reais (nome/tipo, ambas NOT NULL sem default, quebrariam o INSERT). Além
 * disso, não há chamador real no frontend para o recurso REST `/campaigns`
 * — a página "Campanhas" do frontend (`Campanhas.tsx` via
 * `marketingService.campaigns`) opera sobre `/marketing/campaigns`
 * (tabelas `marketing_projects`/`marketing_tasks`, já reconstruídas), um
 * recurso homônimo mas fisicamente distinto. `campaign_tasks`/
 * `campaign_assets` (filhas desta tabela, já reconstruídas nas migrations
 * anteriores) têm DTOs corretos e são exercitadas via
 * `CampaignOperationsService`, mas dependem de uma campanha-mãe que hoje
 * não tem via real de criação.
 *
 * Dado o exposto, esta migration faz APENAS a correção de ordem já
 * comprovadamente segura e no escopo mandatado (bloco de auditoria):
 * `created_by`/`updated_by` estavam ANTES de `deleted_at` — nenhum problema
 * ali é resolvido quanto à nomenclatura DTO×entidade (fica registrado para
 * decisão de produto futura). Zero colunas funcionais reordenadas ou
 * removidas — nome/tipo/status/objetivo/orcamento/data_inicio/data_fim/
 * artista_id/metadata já seguem a ordem de declaração da própria entidade,
 * a única fonte confiável disponível hoje.
 */
export class RebuildCampaignsInCanonicalFormOrder20260719000024 implements MigrationInterface {
  name = 'RebuildCampaignsInCanonicalFormOrder20260719000024';

  private readonly newColumns = `
    id           uuid NOT NULL DEFAULT gen_random_uuid(),
    tenant_id    uuid NOT NULL,
    nome         varchar(255) NOT NULL,
    tipo         varchar(100) NOT NULL,
    status       varchar(50) NOT NULL DEFAULT 'rascunho',
    objetivo     text,
    orcamento    numeric(15,2),
    data_inicio  timestamp,
    data_fim     timestamp,
    artista_id   uuid,
    metadata     jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at   timestamp NOT NULL DEFAULT now(),
    updated_at   timestamp NOT NULL DEFAULT now(),
    created_by   varchar(255),
    updated_by   varchar(255),
    deleted_at   timestamp
  `;

  private readonly copyColumns = [
    'id', 'tenant_id', 'nome', 'tipo', 'status', 'objetivo', 'orcamento', 'data_inicio',
    'data_fim', 'artista_id', 'metadata', 'created_at', 'updated_at', 'created_by',
    'updated_by', 'deleted_at',
  ].join(', ');

  public async up(queryRunner: QueryRunner): Promise<void> {
    const [{ total }] = await queryRunner.query(`SELECT count(*)::int AS total FROM campaigns`);

    await queryRunner.query(`CREATE TABLE campaigns_new (${this.newColumns})`);
    await queryRunner.query(`INSERT INTO campaigns_new (${this.copyColumns}) SELECT ${this.copyColumns} FROM campaigns`);

    const [{ c: newCount }] = await queryRunner.query(`SELECT count(*)::int AS c FROM campaigns_new`);
    if (Number(newCount) !== Number(total)) {
      throw new Error(`RebuildCampaignsInCanonicalFormOrder: contagem divergente (original=${total}, nova=${newCount}) — abortada.`);
    }

    await queryRunner.query(`ALTER TABLE campaigns_new ADD CONSTRAINT campaigns_new_pkey PRIMARY KEY (id)`);
    await queryRunner.query(`ALTER TABLE campaigns_new ADD CONSTRAINT ux_campaigns_id_tenant_new UNIQUE (id, tenant_id)`);
    await queryRunner.query(`CREATE INDEX idx_campaigns_tenant_id_new ON campaigns_new (tenant_id)`);
    await queryRunner.query(`CREATE INDEX idx_campaigns_tenant_active_new ON campaigns_new (tenant_id, deleted_at, created_at DESC) WHERE (deleted_at IS NULL)`);

    // FKs dependentes precisam ser derrubadas antes do rename dance —
    // incluindo as compostas (campaign_id, tenant_id) que dependem do
    // índice único ux_campaigns_id_tenant.
    await queryRunner.query(`ALTER TABLE campaign_tasks DROP CONSTRAINT campaign_tasks_campaign_id_fkey`);
    await queryRunner.query(`ALTER TABLE campaign_tasks DROP CONSTRAINT fk_campaign_tasks_campaign_tenant`);
    await queryRunner.query(`ALTER TABLE campaign_assets DROP CONSTRAINT campaign_assets_campaign_id_fkey`);
    await queryRunner.query(`ALTER TABLE campaign_assets DROP CONSTRAINT fk_campaign_assets_campaign_tenant`);
    await queryRunner.query(`ALTER TABLE briefings DROP CONSTRAINT fk_briefings_campanha_id`);

    await queryRunner.query(`ALTER TABLE campaigns RENAME TO campaigns_old`);
    await queryRunner.query(`ALTER TABLE campaigns_old RENAME CONSTRAINT campaigns_pkey TO campaigns_old_pkey`);
    await queryRunner.query(`ALTER INDEX ux_campaigns_id_tenant RENAME TO ux_campaigns_id_tenant_old`);
    await queryRunner.query(`ALTER INDEX idx_campaigns_tenant_id RENAME TO idx_campaigns_tenant_id_old`);
    await queryRunner.query(`ALTER INDEX idx_campaigns_tenant_active RENAME TO idx_campaigns_tenant_active_old`);

    await queryRunner.query(`ALTER TABLE campaigns_new RENAME TO campaigns`);
    await queryRunner.query(`ALTER INDEX campaigns_new_pkey RENAME TO campaigns_pkey`);
    await queryRunner.query(`ALTER INDEX ux_campaigns_id_tenant_new RENAME TO ux_campaigns_id_tenant`);
    await queryRunner.query(`ALTER INDEX idx_campaigns_tenant_id_new RENAME TO idx_campaigns_tenant_id`);
    await queryRunner.query(`ALTER INDEX idx_campaigns_tenant_active_new RENAME TO idx_campaigns_tenant_active`);

    await queryRunner.query(`ALTER TABLE campaign_tasks ADD CONSTRAINT campaign_tasks_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE campaign_tasks ADD CONSTRAINT fk_campaign_tasks_campaign_tenant FOREIGN KEY (campaign_id, tenant_id) REFERENCES campaigns(id, tenant_id) ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE campaign_assets ADD CONSTRAINT campaign_assets_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE campaign_assets ADD CONSTRAINT fk_campaign_assets_campaign_tenant FOREIGN KEY (campaign_id, tenant_id) REFERENCES campaigns(id, tenant_id) ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE briefings ADD CONSTRAINT fk_briefings_campanha_id FOREIGN KEY (campanha_id) REFERENCES campaigns(id) ON DELETE SET NULL`);

    await queryRunner.query(`ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE campaigns FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      CREATE POLICY tenant_isolation ON campaigns
        AS PERMISSIVE FOR ALL TO authenticated
        USING (tenant_id = private_get_tenant_id()) WITH CHECK (tenant_id = private_get_tenant_id())
    `);
    await queryRunner.query(`
      CREATE POLICY super_admin_full_access ON campaigns
        AS PERMISSIVE FOR ALL TO authenticated
        USING (app_is_super_admin()) WITH CHECK (app_is_super_admin())
    `);

    await queryRunner.query(`ALTER TABLE campaigns OWNER TO musicos_migrator`);
    await queryRunner.query(`GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON campaigns TO musicos_migrator`);

    await queryRunner.query(`DROP TABLE campaigns_old`);
    await queryRunner.query(`ANALYZE campaigns`);
  }

  private readonly originalColumns = `
    id           uuid NOT NULL DEFAULT gen_random_uuid(),
    tenant_id    uuid NOT NULL,
    nome         varchar(255) NOT NULL,
    tipo         varchar(100) NOT NULL,
    status       varchar(50) NOT NULL DEFAULT 'rascunho',
    objetivo     text,
    orcamento    numeric(15,2),
    data_inicio  timestamp,
    data_fim     timestamp,
    artista_id   uuid,
    metadata     jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at   timestamp NOT NULL DEFAULT now(),
    updated_at   timestamp NOT NULL DEFAULT now(),
    deleted_at   timestamp,
    created_by   varchar(255),
    updated_by   varchar(255)
  `;

  private readonly restoreCopyColumns = [
    'id', 'tenant_id', 'nome', 'tipo', 'status', 'objetivo', 'orcamento', 'data_inicio',
    'data_fim', 'artista_id', 'metadata', 'created_at', 'updated_at', 'deleted_at',
    'created_by', 'updated_by',
  ].join(', ');

  public async down(queryRunner: QueryRunner): Promise<void> {
    const [{ total }] = await queryRunner.query(`SELECT count(*)::int AS total FROM campaigns`);

    await queryRunner.query(`CREATE TABLE campaigns_restore (${this.originalColumns})`);
    await queryRunner.query(`INSERT INTO campaigns_restore (${this.restoreCopyColumns}) SELECT ${this.restoreCopyColumns} FROM campaigns`);

    const [{ c: restoredCount }] = await queryRunner.query(`SELECT count(*)::int AS c FROM campaigns_restore`);
    if (Number(restoredCount) !== Number(total)) {
      throw new Error(`RebuildCampaignsInCanonicalFormOrder.down: contagem divergente (original=${total}, restaurada=${restoredCount}) — abortado.`);
    }

    await queryRunner.query(`ALTER TABLE campaigns_restore ADD CONSTRAINT campaigns_restore_pkey PRIMARY KEY (id)`);
    await queryRunner.query(`ALTER TABLE campaigns_restore ADD CONSTRAINT ux_campaigns_id_tenant_restore UNIQUE (id, tenant_id)`);
    await queryRunner.query(`CREATE INDEX idx_campaigns_tenant_id_restore ON campaigns_restore (tenant_id)`);
    await queryRunner.query(`CREATE INDEX idx_campaigns_tenant_active_restore ON campaigns_restore (tenant_id, deleted_at, created_at DESC) WHERE (deleted_at IS NULL)`);

    await queryRunner.query(`ALTER TABLE campaign_tasks DROP CONSTRAINT campaign_tasks_campaign_id_fkey`);
    await queryRunner.query(`ALTER TABLE campaign_tasks DROP CONSTRAINT fk_campaign_tasks_campaign_tenant`);
    await queryRunner.query(`ALTER TABLE campaign_assets DROP CONSTRAINT campaign_assets_campaign_id_fkey`);
    await queryRunner.query(`ALTER TABLE campaign_assets DROP CONSTRAINT fk_campaign_assets_campaign_tenant`);
    await queryRunner.query(`ALTER TABLE briefings DROP CONSTRAINT fk_briefings_campanha_id`);

    await queryRunner.query(`ALTER TABLE campaigns RENAME TO campaigns_canonical`);
    await queryRunner.query(`ALTER TABLE campaigns_canonical RENAME CONSTRAINT campaigns_pkey TO campaigns_canonical_pkey`);
    await queryRunner.query(`ALTER INDEX ux_campaigns_id_tenant RENAME TO ux_campaigns_id_tenant_canonical`);
    await queryRunner.query(`ALTER INDEX idx_campaigns_tenant_id RENAME TO idx_campaigns_tenant_id_canonical`);
    await queryRunner.query(`ALTER INDEX idx_campaigns_tenant_active RENAME TO idx_campaigns_tenant_active_canonical`);

    await queryRunner.query(`ALTER TABLE campaigns_restore RENAME TO campaigns`);
    await queryRunner.query(`ALTER INDEX campaigns_restore_pkey RENAME TO campaigns_pkey`);
    await queryRunner.query(`ALTER INDEX ux_campaigns_id_tenant_restore RENAME TO ux_campaigns_id_tenant`);
    await queryRunner.query(`ALTER INDEX idx_campaigns_tenant_id_restore RENAME TO idx_campaigns_tenant_id`);
    await queryRunner.query(`ALTER INDEX idx_campaigns_tenant_active_restore RENAME TO idx_campaigns_tenant_active`);

    await queryRunner.query(`ALTER TABLE campaign_tasks ADD CONSTRAINT campaign_tasks_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE campaign_tasks ADD CONSTRAINT fk_campaign_tasks_campaign_tenant FOREIGN KEY (campaign_id, tenant_id) REFERENCES campaigns(id, tenant_id) ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE campaign_assets ADD CONSTRAINT campaign_assets_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE campaign_assets ADD CONSTRAINT fk_campaign_assets_campaign_tenant FOREIGN KEY (campaign_id, tenant_id) REFERENCES campaigns(id, tenant_id) ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE briefings ADD CONSTRAINT fk_briefings_campanha_id FOREIGN KEY (campanha_id) REFERENCES campaigns(id) ON DELETE SET NULL`);

    await queryRunner.query(`ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE campaigns FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      CREATE POLICY tenant_isolation ON campaigns
        AS PERMISSIVE FOR ALL TO authenticated
        USING (tenant_id = private_get_tenant_id()) WITH CHECK (tenant_id = private_get_tenant_id())
    `);
    await queryRunner.query(`
      CREATE POLICY super_admin_full_access ON campaigns
        AS PERMISSIVE FOR ALL TO authenticated
        USING (app_is_super_admin()) WITH CHECK (app_is_super_admin())
    `);

    await queryRunner.query(`ALTER TABLE campaigns OWNER TO musicos_migrator`);
    await queryRunner.query(`GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON campaigns TO musicos_migrator`);

    await queryRunner.query(`DROP TABLE campaigns_canonical`);
    await queryRunner.query(`ANALYZE campaigns`);
  }
}
