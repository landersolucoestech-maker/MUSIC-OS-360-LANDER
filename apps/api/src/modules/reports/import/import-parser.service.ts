/**
 * modules/reports/import/import-parser.service.ts
 * Faz o parse de um workbook XLSX com exatamente uma aba.
 */
import { BadRequestException, Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { isWritableKey } from '../../../core/security/safe-object';
import { IMPORT_MAX_ROWS, IMPORT_MAX_BYTES, type ImportFormat, type ParsedFile } from './import.types';

function unsupportedImportFormat(detail: string): BadRequestException {
  return new BadRequestException({
    error: 'UNSUPPORTED_IMPORT_FORMAT',
    message: `Formato de arquivo não suportado. Apenas XLSX (.xlsx/.xls) é aceito. ${detail}`,
  });
}

function formatFromName(filename: string): ImportFormat {
  if (/\.(xlsx|xls)$/i.test(filename)) return 'xlsx';
  throw unsupportedImportFormat(`Extensão rejeitada: "${filename}".`);
}

const KNOWN_WORKBOOK_SIGNATURES: readonly Buffer[] = [
  Buffer.from([0x50, 0x4b, 0x03, 0x04]),
  Buffer.from([0x50, 0x4b, 0x05, 0x06]),
  Buffer.from([0x50, 0x4b, 0x07, 0x08]),
  Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]),
];

function assertKnownWorkbookSignature(content: Buffer): void {
  const valid = KNOWN_WORKBOOK_SIGNATURES.some(
    (signature) => content.length >= signature.length && content.subarray(0, signature.length).equals(signature),
  );
  if (!valid) {
    throw unsupportedImportFormat('O conteúdo não é um workbook OpenXML/OLE2 válido (possível CSV renomeado ou arquivo corrompido).');
  }
}

@Injectable()
export class ImportParserService {
  parse(filename: string, content: Buffer): ParsedFile {
    formatFromName(filename);
    if (!content || content.length === 0) throw new BadRequestException('Arquivo vazio.');
    if (content.length > IMPORT_MAX_BYTES) {
      throw new BadRequestException(`Arquivo excede o limite de ${IMPORT_MAX_BYTES} bytes.`);
    }
    assertKnownWorkbookSignature(content);

    const workbook = XLSX.read(content, { type: 'buffer', sheetRows: IMPORT_MAX_ROWS + 2 });
    if (workbook.SheetNames.length !== 1) {
      throw new BadRequestException({
        error: 'SINGLE_SHEET_REQUIRED',
        message: `O arquivo deve conter exatamente uma aba. Abas encontradas: ${workbook.SheetNames.length}.`,
      });
    }

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) throw new BadRequestException('Planilha sem aba válida.');
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: '',
      raw: false,
      blankrows: false,
    });
    if (matrix.length === 0) throw new BadRequestException('Planilha vazia.');

    const headers = (matrix[0] as unknown[]).map((header) => String(header ?? '').trim());
    const body = matrix.slice(1);
    if (body.length > IMPORT_MAX_ROWS) {
      throw new BadRequestException(`Arquivo excede o limite de ${IMPORT_MAX_ROWS} registros.`);
    }

    const rows = body.map((line) => {
      const record: Record<string, string> = Object.create(null);
      headers.forEach((header, index) => {
        if (isWritableKey(header)) record[header] = String((line as unknown[])[index] ?? '');
      });
      return record;
    });

    return { format: 'xlsx', headers: headers.filter(isWritableKey), rows };
  }
}
