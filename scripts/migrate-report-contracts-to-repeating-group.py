from pathlib import Path
import re

path = Path('apps/api/src/modules/reports/form-contracts/report-form-contracts.ts')
text = path.read_text(encoding='utf-8')

text = text.replace("export type ReportFieldStorage = 'column' | 'metadata' | 'encrypted' | 'ref';", "export type ReportFieldStorage = 'column' | 'metadata' | 'encrypted';")
text = text.replace('export interface ReportChildSheetFieldSpec', 'export interface ReportRepeatingGroupFieldSpec')
text = text.replace('export interface ReportChildSheetSpec', 'export interface ReportRepeatingGroupSpec')
text = text.replace('fields: ReportChildSheetFieldSpec[];', 'fields: ReportRepeatingGroupFieldSpec[];')
text = text.replace('childSheets?: ReportChildSheetSpec[];', 'repeatingGroup?: ReportRepeatingGroupSpec;')
text = re.sub(r"\nconst ref = \(key: string, physical: string\): ReportFieldSpec => \(\{ key, storage: 'ref', physical \}\);\n", '\n', text)

# Cada contrato antigo tinha exatamente uma aba filha. Ela vira um grupo repetível
# achatado em linhas da mesma aba; sheetName deixa de existir.
text = text.replace('childSheets: [\n    {', 'repeatingGroup: {')
text = re.sub(r"\n\s*sheetName: '[^']+',", '', text)
text = text.replace('\n    },\n  ],', '\n  },')

# Remove qualquer campo técnico de correlação que tenha sobrado.
text = re.sub(r"\n\s*ref\('[^']+',\s*'[^']+'\),[^\n]*", '', text)
text = text.replace("music as", "musicas")

# Terminologia e documentação deixam claro que nunca há worksheet filha.
replacements = {
    'Aba filha do workbook': 'Grupo repetível do formulário',
    'aba filha': 'grupo repetível',
    'abas filhas': 'grupos repetíveis',
    'childSheets': 'repeatingGroup',
    'ReportFormContract.refField': 'campos gerais do contrato',
    'representada em aba filha própria': 'representada por colunas repetíveis na mesma aba',
    'aba própria': 'linhas repetidas na mesma aba',
}
for old, new in replacements.items():
    text = text.replace(old, new)

# Não pode haver array em repeatingGroup.
text = re.sub(r"repeatingGroup:\s*\[\s*\{", 'repeatingGroup: {', text)
text = re.sub(r"\n\s*\}\s*\],", '\n  },', text)

if 'childSheets' in text or "storage: 'ref'" in text or 'ReportChildSheet' in text:
    raise SystemExit('resíduos de childSheets/ref ainda presentes')

path.write_text(text, encoding='utf-8')
print('report contracts migrated to repeatingGroup')
