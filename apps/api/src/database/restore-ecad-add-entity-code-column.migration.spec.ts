import * as fs from 'fs';
import * as path from 'path';

/**
 * restore-ecad-add-entity-code-column.migration.spec.ts
 *
 * Guarda permanente (correção de produto sobre a Rodada 8, 2026-07-18):
 * `cod_ecad` continua existindo como coluna própria (ECAD é entidade central
 * e obrigatória — não deveria ter sido removida). `cod_abramus` foi
 * corretamente renomeado para `cod_entidade` (continua sendo UMA coluna
 * simples — o valor pode ser um código em qualquer entidade de gestão
 * coletiva: ABRAMUS, UBC, SOCINPRO, entre outras).
 */
const migrationSrc = fs.readFileSync(
  path.resolve(__dirname, 'migrations/20260718000017_RestoreEcadAddEntityCodeColumn.ts'),
  'utf8',
);

describe('RestoreEcadAddEntityCodeColumn20260718000017', () => {
  it('recria cod_ecad e cria cod_entidade em works e phonograms', () => {
    expect(migrationSrc).toMatch(/ALTER TABLE works[\s\S]*ADD COLUMN IF NOT EXISTS cod_ecad/);
    expect(migrationSrc).toMatch(/ALTER TABLE works[\s\S]*ADD COLUMN IF NOT EXISTS cod_entidade/);
    expect(migrationSrc).toMatch(/ALTER TABLE phonograms[\s\S]*ADD COLUMN IF NOT EXISTS cod_ecad/);
    expect(migrationSrc).toMatch(/ALTER TABLE phonograms[\s\S]*ADD COLUMN IF NOT EXISTS cod_entidade/);
  });

  it('não recria cod_abramus nem colunas por sociedade específica', () => {
    expect(migrationSrc).not.toMatch(/ADD COLUMN[^;]*cod_abramus/);
    expect(migrationSrc).not.toMatch(/cod_ubc|cod_sbacem|cod_socinpro|cod_assim|cod_amar|cod_sicam/i);
  });

  it('restaura valores de external_identifiers apenas quando há exatamente um identificador (HAVING COUNT(*) = 1)', () => {
    expect(migrationSrc).toMatch(/HAVING COUNT\(\*\) = 1/);
  });

  it('não usa DROP ... CASCADE e possui down() que remove as colunas', () => {
    expect(migrationSrc).not.toMatch(/DROP\s+\w+[^;]*CASCADE/i);
    expect(migrationSrc).toMatch(/async down/);
    expect(migrationSrc).toMatch(/DROP COLUMN IF EXISTS cod_ecad/);
    expect(migrationSrc).toMatch(/DROP COLUMN IF EXISTS cod_entidade/);
  });
});
