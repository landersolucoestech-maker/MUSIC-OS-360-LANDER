import * as fs from 'fs';
import * as path from 'path';

/**
 * no-csv-support.spec.ts  (Parte 81)
 *
 * MUSIC OS 360 não suporta CSV em nenhuma funcionalidade operacional —
 * XLSX é o único formato tabular, PDF para relatórios visuais, JSON só para
 * integrações técnicas. Este guard varre apps/api/src, apps/web/src e
 * packages/*\/src (fonte real, nunca node_modules/dist/build) por qualquer
 * menção a "csv" e falha o CI se a palavra reaparecer fora da allowlist
 * abaixo.
 *
 * A allowlist é INTENCIONALMENTE mínima e cada entrada documenta por que a
 * palavra sobrevive ali:
 *   - migração já executada em produção/staging: nunca editada retroativamente
 *     (regra de ouro de migrations — mudar o passado corrompe o histórico real).
 *   - o próprio código/teste que REJEITA csv precisa nomear o que rejeita.
 *   - documentação explícita da remoção (não é orientação para usar CSV).
 *   - este próprio arquivo guard.
 */
const REPO_ROOT = path.resolve(__dirname, '../../../../../');

const SCAN_ROOTS = [
  'apps/api/src',
  'apps/web/src',
  'packages',
];

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx']);
const EXCLUDED_DIR_NAMES = new Set(['node_modules', 'dist', 'build', '.turbo', 'coverage']);

// path relativo ao repo root → motivo
const ALLOWLIST: Record<string, string> = {
  'apps/api/src/core/guards/no-csv-support.spec.ts':
    'este próprio guard — precisa citar "csv" para descrevê-lo e para compor a allowlist.',
  'apps/api/src/database/migrations/20260719000005_RebuildProjectsInCanonicalFormOrder.ts':
    'migração histórica já aplicada — comentário descreve um fluxo real da época; migrations não são editadas retroativamente.',
  'apps/api/src/modules/registry/adapters/manual-export.adapter.spec.ts':
    'teste que documenta e comprova a substituição de CSV por XLSX na exportação manual de submissões (Parte 81).',
  'apps/api/src/modules/reports/import/import-parser.service.ts':
    'código real de rejeição: detecta CSV renomeado para .xlsx via assinatura de arquivo (Parte 81).',
  'apps/api/src/modules/reports/import/import-parser.service.spec.ts':
    'teste anti-CSV: confirma rejeição de extensão .csv e de CSV renomeado para .xlsx.',
  'apps/api/src/modules/reports/import/import-engine.service.spec.ts':
    'teste anti-CSV: confirma que arquivo .csv é rejeitado pelo motor de importação.',
  'apps/api/src/modules/reports/reports.controller.ts':
    'comentário descreve a rejeição explícita de ?format=csv (UNSUPPORTED_EXPORT_FORMAT).',
  'apps/api/src/modules/reports/reports.controller.spec.ts':
    'teste anti-CSV: confirma que ?format=csv é rejeitado com 400/UNSUPPORTED_EXPORT_FORMAT.',
  'apps/web/src/shared/lib/xlsx.ts':
    'comentário de topo documenta explicitamente que CSV foi eliminado da plataforma (Parte 81).',
};

function walk(dir: string, out: string[]): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (EXCLUDED_DIR_NAMES.has(entry.name)) continue;
      walk(path.join(dir, entry.name), out);
    } else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      out.push(path.join(dir, entry.name));
    }
  }
}

function collectSourceFiles(): string[] {
  const files: string[] = [];
  for (const root of SCAN_ROOTS) {
    const abs = path.join(REPO_ROOT, root);
    if (fs.existsSync(abs)) walk(abs, files);
  }
  return files;
}

describe('Guard: CSV não é suportado em nenhum lugar da plataforma (Parte 81)', () => {
  it('nenhuma menção a "csv" fora da allowlist documentada', () => {
    const offenders: string[] = [];

    for (const absFile of collectSourceFiles()) {
      const relFile = path.relative(REPO_ROOT, absFile).split(path.sep).join('/');
      if (ALLOWLIST[relFile]) continue;

      const content = fs.readFileSync(absFile, 'utf8');
      if (/csv/i.test(content)) {
        const lines = content.split('\n');
        const hitLines = lines
          .map((line, i) => ({ line, i }))
          .filter(({ line }) => /csv/i.test(line))
          .map(({ line, i }) => `    L${i + 1}: ${line.trim().slice(0, 140)}`);
        offenders.push(`${relFile}\n${hitLines.join('\n')}`);
      }
    }

    if (offenders.length > 0) {
      throw new Error(
        `CSV reapareceu fora da allowlist em ${offenders.length} arquivo(s):\n\n${offenders.join('\n\n')}\n\n` +
        `Se é uma remoção legítima em andamento, adicione o formato correto (XLSX/PDF/JSON). ` +
        `Se a menção é inevitável (ex.: teste que REJEITA csv), adicione a allowlist neste guard com o motivo.`,
      );
    }

    expect(offenders).toEqual([]);
  });

  it('allowlist não contém entradas para arquivos que não existem mais', () => {
    const missing = Object.keys(ALLOWLIST).filter((rel) => !fs.existsSync(path.join(REPO_ROOT, rel)));
    expect(missing).toEqual([]);
  });
});
