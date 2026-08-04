from pathlib import Path

path = Path('apps/api/src/modules/reports/form-contracts/report-form-contracts.ts')
text = path.read_text(encoding='utf-8')

text = text.replace(
    '  /** Abas filhas para estruturas repetíveis do formulário (Parte 87). */\n  repeatingGroup?: ReportRepeatingGroupSpec;',
    '  /** Campos repetíveis achatados em linhas da mesma aba XLSX. */\n  repeatingGroup?: ReportRepeatingGroupSpec;',
)
text = text.replace(
    '''/**
 * Coluna de correlação entre a linha principal e suas grupos repetíveis
 * (contract.repeatingGroup) — nunca persistida (nenhuma tabela tem coluna
 * própria para isto); resolvida a partir de uma coluna física real (ex.: o
 * `id` do próprio registro) só para existir um valor estável dentro do
 * arquivo. Fora de contratos com repeatingGroup, não deve ser usada.
 */

''',
    '',
)
text = text.replace(
    '''export function contractExportableColumns(contract: ReportFormContract): string[] {
  return contract.fields.map((f) => f.key);
}

export function contractImportableColumns(contract: ReportFormContract): string[] {
  return contract.fields.filter((f) => f.importable !== false).map((f) => f.key);
}''',
    '''export function contractExportableColumns(contract: ReportFormContract): string[] {
  return [
    ...contract.fields.map((field) => field.key),
    ...(contract.repeatingGroup?.fields.map((field) => field.key) ?? []),
  ];
}

export function contractImportableColumns(contract: ReportFormContract): string[] {
  return [
    ...contract.fields.filter((field) => field.importable !== false).map((field) => field.key),
    ...(contract.repeatingGroup?.fields.map((field) => field.key) ?? []),
  ];
}''',
)

for forbidden in ('childSheets', "storage: 'ref'", 'ReportChildSheet', 'contractRefFields'):
    if forbidden in text:
        raise SystemExit(f'legacy residue remains: {forbidden}')

if 'contract.repeatingGroup?.fields.map' not in text:
    raise SystemExit('repeating group columns were not added to contract column helpers')

path.write_text(text, encoding='utf-8')
print('report contract column helpers fixed')
