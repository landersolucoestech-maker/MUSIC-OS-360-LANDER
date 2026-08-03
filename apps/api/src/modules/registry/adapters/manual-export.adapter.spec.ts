import * as XLSX from 'xlsx';
import { ManualExportAdapter } from './manual-export.adapter';

/**
 * manual-export.adapter.spec.ts  (Parte 81)
 *
 * A exportação manual de submissões de registro (payload para sociedades
 * como ECAD) suportava 'json' | 'csv'. CSV foi eliminado da plataforma —
 * este teste confirma que o formato tabular agora é XLSX real (workbook
 * válido, MIME OpenXML), nunca texto delimitado por vírgula.
 */
describe('ManualExportAdapter — exportPayload (Parte 81: XLSX substitui CSV)', () => {
  const adapter = new ManualExportAdapter();

  it('formato xlsx produz um workbook OpenXML real (não texto CSV)', async () => {
    const payload = { titulo: 'Minha Obra', autores: [{ nome: 'Fulano', percentual: 100 }], ano: 2026 };
    const result = await adapter.exportPayload(payload, 'xlsx', 'submission-test');

    expect(result.format).toBe('xlsx');
    expect(result.fileName).toBe('submission-test.xlsx');
    expect(result.mimeType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(Buffer.isBuffer(result.content)).toBe(true);

    const wb = XLSX.read(result.content as Buffer, { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]!]!;
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
    expect(rows[0]).toEqual(['field', 'value']);
    expect(rows.some((r) => r[0] === 'titulo' && r[1] === 'Minha Obra')).toBe(true);
    expect(rows.some((r) => r[0] === 'autores[0].nome' && r[1] === 'Fulano')).toBe(true);
  });

  it('formato json continua funcionando normalmente', async () => {
    const payload = { titulo: 'Outra Obra' };
    const result = await adapter.exportPayload(payload, 'json', 'submission-json');
    expect(result.format).toBe('json');
    expect(result.fileName).toBe('submission-json.json');
    expect(result.mimeType).toContain('application/json');
    expect(JSON.parse(result.content as string)).toEqual(payload);
  });
});
