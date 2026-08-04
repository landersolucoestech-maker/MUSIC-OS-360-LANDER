import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const REPORTS_ROOT = join(__dirname);
const SELF = 'single-sheet.guard.spec.ts';
const FORBIDDEN = [
  'childSheets',
  'ChildSheet',
  'child-sheet',
  'toXlsxMultiSheet',
  'serializeWithChildSheets',
  'Projeto ID de referência',
  'Músicas do Projeto',
] as const;

function isOperationalSource(entry: string): boolean {
  return /\.ts$/.test(entry) &&
    entry !== SELF &&
    !/\.(spec|test|e2e-spec)\.ts$/.test(entry);
}

function sourceFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory)) {
    const absolute = join(directory, entry);
    const stats = statSync(absolute);
    if (stats.isDirectory()) files.push(...sourceFiles(absolute));
    else if (isOperationalSource(entry)) files.push(absolute);
  }
  return files;
}

describe('Central de Relatórios — arquitetura XLSX de aba única', () => {
  it('não contém resíduos operacionais de abas auxiliares ou IDs técnicos de correlação', () => {
    const violations: string[] = [];
    for (const file of sourceFiles(REPORTS_ROOT)) {
      const content = readFileSync(file, 'utf8');
      for (const token of FORBIDDEN) {
        if (content.includes(token)) {
          violations.push(`${relative(REPORTS_ROOT, file)}: ${token}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('mantém Contatos e Leads sem prefixo CRM na Central de Relatórios', () => {
    const registry = readFileSync(join(REPORTS_ROOT, 'report-module-registry.ts'), 'utf8');
    expect(registry).toContain("label: 'Contatos'");
    expect(registry).toContain("label: 'Leads'");
    expect(registry).not.toContain('CRM — Contatos');
    expect(registry).not.toContain('CRM — Leads');
  });
});
