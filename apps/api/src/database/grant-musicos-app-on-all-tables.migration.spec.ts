import * as fs from 'fs';
import * as path from 'path';
import { isApplicationMigration } from './migration-classification';

/**
 * grant-musicos-app-on-all-tables.migration.spec.ts
 *
 * Guarda permanente (Parte 77): a série "RebuildXInCanonicalFormOrder"
 * (2026-07-19) recriou dezenas de tabelas concedendo grants só a
 * `musicos_migrator`, nunca re-concedendo a `musicos_app` — resultado: 114
 * das ~120 tabelas de `public` ficaram com "permission denied" para o role
 * usado por todo o tráfego normal da aplicação (APP_DATABASE_URL). Isso
 * derrubava /auth/context (500) e qualquer página de domínio real.
 */
const migrationSrc = fs.readFileSync(
  path.resolve(__dirname, 'migrations/20260802000001_GrantMusicosAppOnAllTables.ts'),
  'utf8',
);

describe('GrantMusicosAppOnAllTables20260802000001', () => {
  it('é classificada como APPLICATION (não EXTERNAL_MANAGED) — deve rodar via db:migrate:application', () => {
    expect(isApplicationMigration('GrantMusicosAppOnAllTables20260802000001')).toBe(true);
  });

  it('concede SELECT/INSERT/UPDATE/DELETE às tabelas de leitura-escrita normal', () => {
    expect(migrationSrc).toMatch(/GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public\."\$\{table\}" TO musicos_app/);
  });

  it('concede apenas SELECT/INSERT às tabelas de auditoria/log (nunca editadas nem apagadas pela app)', () => {
    expect(migrationSrc).toMatch(/GRANT SELECT, INSERT ON TABLE public\."\$\{table\}" TO musicos_app/);
    for (const auditTable of ['audit_logs', 'domain_event_log', 'rbac_decision_logs', 'webhook_events']) {
      expect(migrationSrc).toMatch(new RegExp(`'${auditTable}'`));
    }
  });

  it('itera sobre listas de tabelas (não SQL desenrolado) e cobre ~114 tabelas ao todo, cada GRANT condicionado a IF EXISTS', () => {
    // Parametrizado via arrays + loop, não 114 blocos SQL literais — a
    // proteção "só roda se a tabela existir" vem do template reutilizado.
    expect(migrationSrc).toMatch(/IF EXISTS \(SELECT 1 FROM pg_tables/);
    const readWriteBlock = migrationSrc.split('const READ_WRITE_TABLES = [')[1].split('] as const;')[0];
    const appendOnlyBlock = migrationSrc.split('const APPEND_ONLY_TABLES = [')[1].split('] as const;')[0];
    const totalTables = [...readWriteBlock.matchAll(/'[a-z0-9_]+'/g), ...appendOnlyBlock.matchAll(/'[a-z0-9_]+'/g)].length;
    expect(totalTables).toBeGreaterThan(100);
  });

  it('define ALTER DEFAULT PRIVILEGES para musicos_migrator — tabelas FUTURAS já nascem com o grant certo', () => {
    expect(migrationSrc).toMatch(/ALTER DEFAULT PRIVILEGES FOR ROLE musicos_migrator IN SCHEMA public/);
    expect(migrationSrc).toMatch(/GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO musicos_app/);
    expect(migrationSrc).toMatch(/GRANT USAGE, SELECT ON SEQUENCES TO musicos_app/);
  });

  it('down() reverte tanto os grants por tabela quanto os default privileges', () => {
    expect(migrationSrc).toMatch(/async down/);
    const downBlock = migrationSrc.split('async down')[1];
    expect(downBlock).toMatch(/REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM musicos_app/);
    expect(downBlock).toMatch(/REVOKE ALL ON TABLE public/);
  });

  it('nunca usa DROP TABLE nem qualquer DDL destrutivo — só GRANT/REVOKE', () => {
    expect(migrationSrc).not.toMatch(/DROP\s+TABLE/i);
    expect(migrationSrc).not.toMatch(/TRUNCATE/i);
  });

  it('está registrada no index.ts de migrations', () => {
    const indexSrc = fs.readFileSync(path.resolve(__dirname, 'migrations/index.ts'), 'utf8');
    expect(indexSrc).toMatch(/GrantMusicosAppOnAllTables20260802000001/);
  });
});
