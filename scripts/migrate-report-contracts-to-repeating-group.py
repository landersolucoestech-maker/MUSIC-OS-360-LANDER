from pathlib import Path
import re

path = Path('apps/api/src/modules/reports/form-contracts/report-form-contracts.ts')
text = path.read_text(encoding='utf-8')

text = text.replace("export type ReportFieldStorage = 'column' | 'metadata' | 'encrypted' | 'ref';", "export type ReportFieldStorage = 'column' | 'metadata' | 'encrypted';")
text = text.replace('ReportChildSheetFieldSpec', 'ReportRepeatingGroupFieldSpec')
text = text.replace('ReportChildSheetSpec', 'ReportRepeatingGroupSpec')
text = text.replace('childSheets?: ReportRepeatingGroupSpec[];', 'repeatingGroup?: ReportRepeatingGroupSpec;')
text = text.replace('childSheets?: ReportChildSheetSpec[];', 'repeatingGroup?: ReportRepeatingGroupSpec;')
text = text.replace('childSheets', 'repeatingGroup')

# Interface canônica: grupo repetível não possui nome de worksheet.
text = re.sub(
    r"/\*\*\n \* Grupo repetível.*?export interface ReportRepeatingGroupSpec \{.*?\n\}",
    """/** Grupo repetível achatado em linhas da mesma aba XLSX. */
export interface ReportRepeatingGroupFieldSpec {
  key: string;
  multi?: boolean;
}

export interface ReportRepeatingGroupSpec {
  key: string;
  fields: ReportRepeatingGroupFieldSpec[];
}""",
    text,
    count=1,
    flags=re.S,
)

text = re.sub(r"\nconst ref = \(key: string, physical: string\): ReportFieldSpec => \(\{ key, storage: 'ref', physical \}\);\n", '\n', text)
text = re.sub(r"\n\s*ref\('[^']+',\s*'[^']+'\),[^\n]*", '', text)
text = re.sub(r"\nexport function contractRefFields\(contract: ReportFormContract\): Record<string, string> \{.*?\n\}", '', text, flags=re.S)
text = re.sub(r"\n\s*sheetName: '[^']+',", '', text)
text = text.replace("  /** Coluna física para storage 'encrypted'/'ref' (ex.: email → email_encrypted; projeto_ref → id). */", "  /** Coluna física para storage cifrado ou alias de coluna real. */")
text = text.replace('representada como abas próprias', 'representada por linhas repetidas na mesma aba')
text = text.replace('correlacionar as duas abas', 'agrupar os itens do mesmo registro')
text = text.replace('Nome da aba no workbook (≤ 31 caracteres — limite do Excel).', 'Grupo sem worksheet própria.')
text = text.replace('aba filha', 'grupo repetível').replace('abas filhas', 'grupos repetíveis')

if 'childSheets' in text or "storage: 'ref'" in text or 'ReportChildSheet' in text or 'contractRefFields' in text:
    raise SystemExit('resíduos de childSheets/ref ainda presentes')

path.write_text(text, encoding='utf-8')
print('report contracts repeatingGroup cleanup complete')
