/**
 * modules/reports/export/export-audit.service.ts  ·  FASE 2.2
 *
 * Auditoria de exportação usando a infraestrutura de eventos existente
 * (EventsService). Emite o evento REPORT_EXPORT. Não cria sistema paralelo.
 */
import { Injectable, Logger, Optional } from '@nestjs/common';
import { EventsService } from '../../../core/events/events.service';
import type { ExportFormat } from './export.types';

export const REPORT_EXPORT_EVENT = 'report.exported';

export interface ExportAuditEntry {
  userId: string;
  tenantId: string;
  entity: string;
  format: ExportFormat;
  recordCount: number;
  status: 'success' | 'failed';
  error?: string;
}

@Injectable()
export class ExportAuditService {
  private readonly logger = new Logger('ExportAudit');

  constructor(@Optional() private readonly events?: EventsService) {}

  record(entry: ExportAuditEntry): void {
    this.logger.log(
      `REPORT_EXPORT tenant=${entry.tenantId} user=${entry.userId} entity=${entry.entity} ` +
        `format=${entry.format} records=${entry.recordCount} status=${entry.status}`,
    );
    this.events?.emit({
      type: REPORT_EXPORT_EVENT,
      tenantId: entry.tenantId,
      userId: entry.userId,
      aggregateType: 'report',
      aggregateId: entry.entity,
      occurredAt: new Date().toISOString(),
      payload: {
        entity: entry.entity,
        format: entry.format,
        recordCount: entry.recordCount,
        status: entry.status,
        error: entry.error ?? null,
      },
    });
  }
}
