import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 20260831000003_CreateMarketReferenceMetrics
 *
 * Fase 3.1 — corrige o defeito conceitual do Market Benchmark ("coorte =
 * artistas do mesmo tenant" não é mercado — tenant é fronteira de
 * segurança/ownership, não população de mercado). A coorte real agora vem
 * de artistas EXTERNOS descobertos via Soundcharts `/related` (candidate
 * discovery real, confirmado ao vivo) e suas próprias métricas Soundcharts
 * (`/audience/{platform}`, `/streaming/spotify/listening`, buscadas
 * diretamente pelo UUID Soundcharts do candidato — sem precisar do link
 * cadastrado, porque o candidato não é um artista do tenant).
 *
 * `market_reference_metrics` é um CACHE TÉCNICO deliberadamente SEM
 * tenant_id e SEM RLS — não contém nenhum dado de propriedade de tenant,
 * apenas métricas públicas de artistas externos (terceiros, não clientes do
 * produto) usadas como referência de mercado. Compartilhado entre todos os
 * tenants por design (item 9/10 da Fase 3.1: "não duplicar milhares de
 * artistas por tenant sem necessidade" — o mesmo artista externo relacionado
 * a dois artistas de tenants diferentes reaproveita a mesma linha de cache).
 * Diferente de artist_metric_snapshots (append-only, auditoria de dado do
 * PRÓPRIO tenant): esta tabela é um cache com TTL, permite UPDATE
 * (upsert por refresh), porque não é histórico auditável de negócio — é
 * side-cache de uma chamada de API idempotente e pública.
 */
export class CreateMarketReferenceMetrics20260831000003 implements MigrationInterface {
  name = 'CreateMarketReferenceMetrics20260831000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE market_reference_metrics (
        id                     uuid NOT NULL DEFAULT gen_random_uuid(),
        candidate_uuid         text NOT NULL,
        candidate_name         text,
        candidate_country_code varchar(2),
        metric                 varchar(100) NOT NULL,
        value                  numeric,
        unit                   varchar(20) NOT NULL DEFAULT 'count',
        observed_at            timestamptz,
        fetched_at             timestamptz NOT NULL,
        source_provider        varchar(50) NOT NULL DEFAULT 'soundcharts',
        created_at             timestamptz NOT NULL DEFAULT now(),
        updated_at             timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT market_reference_metrics_pkey PRIMARY KEY (id),
        CONSTRAINT market_reference_metrics_unique_point UNIQUE (candidate_uuid, metric)
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_market_reference_metrics_candidate ON market_reference_metrics (candidate_uuid)`);
    await queryRunner.query(`CREATE INDEX idx_market_reference_metrics_fetched_at ON market_reference_metrics (fetched_at)`);

    // Sem RLS: nenhuma coluna de tenant, nenhum dado de propriedade de
    // tenant — ver comentário do arquivo. Nunca exposta diretamente por
    // nenhum endpoint tenant-scoped; consumida só internamente pelo
    // MarketBenchmarkService.
    await queryRunner.query(`ALTER TABLE market_reference_metrics OWNER TO musicos_migrator`);
    await queryRunner.query(`GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON market_reference_metrics TO musicos_migrator`);
    await queryRunner.query(`GRANT SELECT, INSERT, UPDATE ON market_reference_metrics TO musicos_app`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS market_reference_metrics`);
  }
}
