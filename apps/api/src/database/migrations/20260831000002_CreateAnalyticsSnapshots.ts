import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 20260831000002_CreateAnalyticsSnapshots
 *
 * Fase 3 — Estágio da Carreira + Benchmark de Mercado. Busca prévia
 * (SEARCH BEFORE CREATE) confirmou que não existe, em nenhuma tabela do
 * schema, um armazenamento de resultado analítico versionado — o único
 * campo relacionado (`artista.estagio_carreira` na UI) nunca é populado por
 * nenhum código real (grep confirma zero escritor), e o módulo
 * `musicIntelligenceEngine` (marketing/IA Criativa) usa heurísticas de texto
 * para prompt de LLM, não um engine determinístico — domínio inteiramente
 * diferente, não reaproveitável aqui.
 *
 * Ambas as tabelas seguem o mesmo padrão append-only de
 * `artist_metric_snapshots` (20260831000001): nenhum UPDATE/DELETE
 * concedido a musicos_app — cada cálculo grava uma nova linha, nunca
 * sobrescreve a anterior, mesmo quando engine_version muda (item 38: "não
 * sobrescrever histórico").
 */
export class CreateAnalyticsSnapshots20260831000002 implements MigrationInterface {
  name = 'CreateAnalyticsSnapshots20260831000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE career_stage_snapshots (
        id                   uuid NOT NULL DEFAULT gen_random_uuid(),
        tenant_id            uuid NOT NULL,
        artist_id            uuid NOT NULL,
        engine_version       varchar(20) NOT NULL,
        status               varchar(30) NOT NULL,
        score                numeric(3,1),
        classification       varchar(50),
        confidence           smallint,
        coverage             numeric(4,3),
        dimensions           jsonb NOT NULL DEFAULT '[]',
        positive_factors     jsonb NOT NULL DEFAULT '[]',
        bottlenecks          jsonb NOT NULL DEFAULT '[]',
        input_provenance     jsonb NOT NULL DEFAULT '[]',
        calculated_at        timestamptz NOT NULL,
        created_at           timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT career_stage_snapshots_pkey PRIMARY KEY (id),
        CONSTRAINT career_stage_snapshots_artist_fkey FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_career_stage_snapshots_tenant_artist ON career_stage_snapshots (tenant_id, artist_id)`);
    await queryRunner.query(`CREATE INDEX idx_career_stage_snapshots_calculated_at ON career_stage_snapshots (calculated_at)`);

    await queryRunner.query(`ALTER TABLE career_stage_snapshots ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE career_stage_snapshots FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      CREATE POLICY super_admin_full_access ON career_stage_snapshots
        AS PERMISSIVE FOR ALL TO authenticated
        USING (app_is_super_admin()) WITH CHECK (app_is_super_admin())
    `);
    await queryRunner.query(`
      CREATE POLICY tenant_isolation ON career_stage_snapshots
        AS PERMISSIVE FOR ALL TO authenticated
        USING (tenant_id = private_get_tenant_id()) WITH CHECK (tenant_id = private_get_tenant_id())
    `);
    await queryRunner.query(`ALTER TABLE career_stage_snapshots OWNER TO musicos_migrator`);
    await queryRunner.query(`GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON career_stage_snapshots TO musicos_migrator`);
    await queryRunner.query(`GRANT SELECT, INSERT ON career_stage_snapshots TO musicos_app`);

    await queryRunner.query(`
      CREATE TABLE market_benchmark_snapshots (
        id                   uuid NOT NULL DEFAULT gen_random_uuid(),
        tenant_id            uuid NOT NULL,
        artist_id            uuid NOT NULL,
        engine_version       varchar(20) NOT NULL,
        status               varchar(30) NOT NULL,
        score                numeric(5,2),
        label                varchar(50),
        cohort_definition    jsonb NOT NULL DEFAULT '{}',
        sample_size          smallint NOT NULL DEFAULT 0,
        fallback_level       smallint,
        metrics              jsonb NOT NULL DEFAULT '[]',
        calculated_at        timestamptz NOT NULL,
        created_at           timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT market_benchmark_snapshots_pkey PRIMARY KEY (id),
        CONSTRAINT market_benchmark_snapshots_artist_fkey FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_market_benchmark_snapshots_tenant_artist ON market_benchmark_snapshots (tenant_id, artist_id)`);
    await queryRunner.query(`CREATE INDEX idx_market_benchmark_snapshots_calculated_at ON market_benchmark_snapshots (calculated_at)`);

    await queryRunner.query(`ALTER TABLE market_benchmark_snapshots ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE market_benchmark_snapshots FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      CREATE POLICY super_admin_full_access ON market_benchmark_snapshots
        AS PERMISSIVE FOR ALL TO authenticated
        USING (app_is_super_admin()) WITH CHECK (app_is_super_admin())
    `);
    await queryRunner.query(`
      CREATE POLICY tenant_isolation ON market_benchmark_snapshots
        AS PERMISSIVE FOR ALL TO authenticated
        USING (tenant_id = private_get_tenant_id()) WITH CHECK (tenant_id = private_get_tenant_id())
    `);
    await queryRunner.query(`ALTER TABLE market_benchmark_snapshots OWNER TO musicos_migrator`);
    await queryRunner.query(`GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON market_benchmark_snapshots TO musicos_migrator`);
    await queryRunner.query(`GRANT SELECT, INSERT ON market_benchmark_snapshots TO musicos_app`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS market_benchmark_snapshots`);
    await queryRunner.query(`DROP TABLE IF EXISTS career_stage_snapshots`);
  }
}
