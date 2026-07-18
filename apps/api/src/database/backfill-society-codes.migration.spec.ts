import * as fs from 'fs';
import * as path from 'path';

/**
 * backfill-society-codes.migration.spec.ts
 *
 * Guarda permanente (auditoria 2026-07-18 — generalização de entidades de
 * gestão coletiva): a migration completa uma generalização que já estava
 * parcialmente construída (`external_identifiers`, 2026-06-01) mas nunca
 * teve os dados legados (`works.cod_abramus`/`cod_ecad`,
 * `phonograms.cod_abramus`/`cod_ecad`) migrados. Não remove as colunas
 * legadas (ainda usadas por formulário ativo, contrato de Reports e
 * integração real com a API da ABRAMUS) — apenas populate a tabela
 * genérica, de forma aditiva e idempotente.
 */
const migrationSrc = fs.readFileSync(
  path.resolve(__dirname, 'migrations/20260718000015_BackfillLegacySocietyCodesToExternalIdentifiers.ts'),
  'utf8',
);

describe('BackfillLegacySocietyCodesToExternalIdentifiers20260718000015', () => {
  it('migra works.cod_abramus/cod_ecad e phonograms.cod_abramus/cod_ecad para external_identifiers', () => {
    expect(migrationSrc).toMatch(/FROM works WHERE cod_abramus/);
    expect(migrationSrc).toMatch(/FROM works WHERE cod_ecad/);
    expect(migrationSrc).toMatch(/FROM phonograms WHERE cod_abramus/);
    expect(migrationSrc).toMatch(/FROM phonograms WHERE cod_ecad/);
  });

  it('usa os providers/identifier_types genéricos já existentes (não cria coluna por sociedade)', () => {
    expect(migrationSrc).toMatch(/'ABRAMUS', 'ABRAMUS_PROTOCOL'/);
    expect(migrationSrc).toMatch(/'ECAD', 'ECAD_WORK_CODE'/);
    expect(migrationSrc).not.toMatch(/cod_ubc|cod_socinpro|cod_sbacem|cod_assim/i);
  });

  it('é idempotente (ON CONFLICT DO NOTHING) e não usa DROP ... CASCADE', () => {
    expect(migrationSrc).toMatch(/ON CONFLICT \(tenant_id, entity_type, entity_id, identifier_type, identifier_value\) DO NOTHING/);
    expect(migrationSrc).not.toMatch(/DROP\s+\w+[^;]*CASCADE/i);
  });

  it('não remove as colunas legadas nesta rodada (aditiva apenas)', () => {
    expect(migrationSrc).not.toMatch(/DROP COLUMN.*cod_abramus/i);
    expect(migrationSrc).not.toMatch(/DROP COLUMN.*cod_ecad/i);
  });

  it('aborta se a contagem de external_identifiers diminuir (fail-fast)', () => {
    expect(migrationSrc).toMatch(/if \(Number\(after\) < Number\(before\)\)/);
    expect(migrationSrc).toMatch(/throw new Error/);
  });

  it('possui down() que remove apenas o que corresponde às colunas legadas ainda presentes', () => {
    expect(migrationSrc).toMatch(/async down/);
    expect(migrationSrc).toMatch(/DELETE FROM external_identifiers/);
  });
});
