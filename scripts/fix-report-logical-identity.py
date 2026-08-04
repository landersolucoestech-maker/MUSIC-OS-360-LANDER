from pathlib import Path

path = Path('apps/api/src/modules/reports/import/import-commit.service.ts')
text = path.read_text(encoding='utf-8')
text = text.replace(
    'await this.assertNotDuplicate(qr, def, group.generalRow, tenantId, errors);',
    'await this.assertNotDuplicate(qr, def, contract, group.generalRow, tenantId, errors);',
)
text = text.replace(
    '''    def: ReportEntityDefinition,
    row: RowValidation,
    tenantId: string,''',
    '''    def: ReportEntityDefinition,
    contract: ReportFormContract | null,
    row: RowValidation,
    tenantId: string,''',
    1,
)
text = text.replace(
    '''    const value = row.data[def.identityColumn];
    if (value === null || value === undefined || value === '') return;
    const found = await qr.query(
      `SELECT 1 FROM ${quote(def.tableName)} WHERE ${quote(def.identityColumn)} = $1 AND ${quote('tenant_id')} = $2 LIMIT 1`,''',
    '''    const value = row.data[def.identityColumn];
    if (value === null || value === undefined || value === '') return;
    const identityColumn = contract?.fields.find((field) => field.key === def.identityColumn)?.physical ?? def.identityColumn;
    const found = await qr.query(
      `SELECT 1 FROM ${quote(def.tableName)} WHERE ${quote(identityColumn)} = $1 AND ${quote('tenant_id')} = $2 LIMIT 1`,''',
)
if 'quote(def.identityColumn)' in text:
    raise SystemExit('logical identity still used as physical SQL column')
path.write_text(text, encoding='utf-8')
print('logical identity SQL mapping fixed')
