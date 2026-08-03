import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { SocietyDriver } from '@music-os-360/types';
import type {
  ExportFormat,
  ExportResult,
  SocietyAdapter,
  SocietySubmissionResult,
  SocietySubmissionStatusResult,
} from './society-adapter.contract';

/** Flatten a nested object into dot-path rows for a simple, valid two-column workbook. */
function flatten(value: unknown, prefix = '', out: Array<[string, string]> = []): Array<[string, string]> {
  if (value === null || value === undefined) {
    out.push([prefix, '']);
  } else if (Array.isArray(value)) {
    if (value.length === 0) out.push([prefix, '[]']);
    else value.forEach((v, i) => flatten(v, `${prefix}[${i}]`, out));
  } else if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) out.push([prefix, '{}']);
    else entries.forEach(([k, v]) => flatten(v, prefix ? `${prefix}.${k}` : k, out));
  } else {
    out.push([prefix, String(value)]);
  }
  return out;
}

/**
 * MANUAL_EXPORT — the only functional driver. It does NOT contact any society;
 * it serialises the payload so an operator downloads it and submits it through
 * the official channel. Submission/status report that this is manual.
 */
@Injectable()
export class ManualExportAdapter implements SocietyAdapter {
  readonly driver = SocietyDriver.MANUAL_EXPORT;
  readonly enabled = true;

  async exportPayload(payload: Record<string, unknown>, format: ExportFormat, baseName: string): Promise<ExportResult> {
    if (format === 'xlsx') {
      const rows = flatten(payload);
      const ws = XLSX.utils.aoa_to_sheet([['field', 'value'], ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'submission');
      const content = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
      return {
        format,
        content,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        fileName: `${baseName}.xlsx`,
      };
    }
    return {
      format: 'json',
      content: JSON.stringify(payload, null, 2),
      mimeType: 'application/json; charset=utf-8',
      fileName: `${baseName}.json`,
    };
  }

  async submitWork(): Promise<SocietySubmissionResult> {
    return this.manualResult();
  }

  async submitRecording(): Promise<SocietySubmissionResult> {
    return this.manualResult();
  }

  async getSubmissionStatus(): Promise<SocietySubmissionStatusResult> {
    return {
      status: 'MANUAL',
      protocol: null,
      message: 'Driver manual: o status é acompanhado fora do sistema, no portal da sociedade.',
    };
  }

  private manualResult(): SocietySubmissionResult {
    return {
      accepted: false,
      externalId: null,
      protocol: null,
      message: 'Exportação manual: baixe o arquivo (JSON/XLSX) e submeta no portal oficial da sociedade. Depois registre o protocolo manualmente.',
    };
  }
}
