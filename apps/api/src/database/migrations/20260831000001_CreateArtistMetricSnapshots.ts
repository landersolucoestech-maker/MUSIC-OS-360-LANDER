import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 20260831000001_CreateArtistMetricSnapshots
 *
 * Fase 2 — Time-Series Foundation. `artist_platform_profiles` (índice único
 * (tenant_id, artist_id, platform)) é current-state puro: cada sync faz
 * UPSERT e sobrescreve followers/subscribers/monthly_listeners/raw_payload —
 * comportamento confirmado lendo ArtistPlatformProfilesService.upsertSuccess
 * antes desta migration. Não existe, em nenhuma tabela do schema, um
 * armazenamento append-only de métrica por (artista, plataforma, métrica,
 * tempo) — busca prévia em domain_event_log/audit_logs/activity_logs
 * confirmou que nenhuma é adequada (event_type/aggregate_id genéricos, sem
 * coluna de métrica/valor/observed_at tipada, sem índice para range query
 * artist+metric+time).
 *
 * `artist_metric_snapshots` é somente-acréscimo por design: nenhum
 * UPDATE/DELETE é concedido a musicos_app (grants abaixo), e a unicidade
 * (tenant_id, artist_id, platform, metric, observed_at) é a chave de
 * idempotência — o mesmo observed_at nunca duplica logicamente (retry seguro
 * via ON CONFLICT DO NOTHING no código, não nesta migration).
 */
export class CreateArtistMetricSnapshots20260831000001 implements MigrationInterface {
  name = 'CreateArtistMetricSnapshots20260831000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE artist_metric_snapshots (
        id                         uuid NOT NULL DEFAULT gen_random_uuid(),
        tenant_id                  uuid NOT NULL,
        artist_id                  uuid NOT NULL,
        platform                   varchar(50) NOT NULL,
        metric                     varchar(100) NOT NULL,
        value                      numeric NOT NULL,
        unit                       varchar(20) NOT NULL DEFAULT 'count',
        source_provider            varchar(50) NOT NULL DEFAULT 'soundcharts',
        registered_identifier      text,
        provider_entity_id         text,
        primary_identity_status    varchar(50),
        cross_platform_status      varchar(50),
        observed_at                timestamptz NOT NULL,
        fetched_at                 timestamptz,
        recorded_at                timestamptz NOT NULL DEFAULT now(),
        normalizer_version         smallint NOT NULL DEFAULT 1,
        raw_payload                jsonb NOT NULL DEFAULT '{}',
        created_at                 timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT artist_metric_snapshots_pkey PRIMARY KEY (id),
        CONSTRAINT artist_metric_snapshots_artist_fkey FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE CASCADE,
        CONSTRAINT artist_metric_snapshots_unique_point
          UNIQUE (tenant_id, artist_id, platform, metric, observed_at)
      )
    `);

    // Índice líder (tenant_id, artist_id, platform, metric, observed_at) já
    // vem da UNIQUE constraint acima e cobre a consulta típica "artist +
    // metric + time range" (Fase 2, item 43) sem índice adicional.
    await queryRunner.query(`CREATE INDEX idx_artist_metric_snapshots_tenant ON artist_metric_snapshots (tenant_id)`);
    await queryRunner.query(`CREATE INDEX idx_artist_metric_snapshots_observed_at ON artist_metric_snapshots (observed_at)`);

    await queryRunner.query(`ALTER TABLE artist_metric_snapshots ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE artist_metric_snapshots FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      CREATE POLICY super_admin_full_access ON artist_metric_snapshots
        AS PERMISSIVE FOR ALL TO authenticated
        USING (app_is_super_admin()) WITH CHECK (app_is_super_admin())
    `);
    await queryRunner.query(`
      CREATE POLICY tenant_isolation ON artist_metric_snapshots
        AS PERMISSIVE FOR ALL TO authenticated
        USING (tenant_id = private_get_tenant_id()) WITH CHECK (tenant_id = private_get_tenant_id())
    `);

    await queryRunner.query(`ALTER TABLE artist_metric_snapshots OWNER TO musicos_migrator`);
    await queryRunner.query(`GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON artist_metric_snapshots TO musicos_migrator`);
    // Somente SELECT + INSERT para o app — append-only por design (item 15:
    // "IMMUTABLE / APPEND-ORIENTED"), sem UPDATE/DELETE mesmo por engano.
    await queryRunner.query(`GRANT SELECT, INSERT ON artist_metric_snapshots TO musicos_app`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS artist_metric_snapshots`);
  }
}
