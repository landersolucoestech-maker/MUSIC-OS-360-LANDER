/**
 * modules/reports/export/export-engine.service.ts  ·  FASE 2.2
 *
 * Orquestra a exportação 100% entity-driven: valida entidade/contrato/tenant,
 * monta a query segura (contrato), executa com isolamento por tenant, serializa
 * com labels pt-BR e audita. Sem if/switch por entidade.
 */
import {
  BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException,
  Optional, ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DATA_SOURCE } from '../../../database/database.module';
import { EntityMetadataService } from '../entity-metadata.service';
import { ReportEntityDefinitionService } from '../definitions/report-entity-definition.service';
import { ExportQueryBuilderService } from './export-query-builder.service';
import { ExportFormatService } from './export-format.service';
import { ExportAuditService } from './export-audit.service';
import { ReportTableGuardService } from '../report-table-guard.service';
import { EXPORT_FORMATS, type ExportFormat, type ExportQueryParams, type ExportResult } from './export.types';

@Injectable()
export class ExportEngineService {
  constructor(
    @Inject(DATA_SOURCE) @Optional() private readonly ds: DataSource | null,
    private readonly metadata: EntityMetadataService,
    private readonly definitions: ReportEntityDefinitionService,
    private readonly queryBuilder: ExportQueryBuilderService,
    private readonly format: ExportFormatService,
    private readonly audit: ExportAuditService,
    private readonly tableGuard: ReportTableGuardService,
  ) {}

  async export(
    entity: string,
    params: ExportQueryParams,
    tenantId: string | undefined,
    userId: string,
  ): Promise<ExportResult> {
    if (!tenantId) throw new ForbiddenException('Tenant não identificado');
    if (!EXPORT_FORMATS.includes(params.format)) {
      throw new BadRequestException(`Formato inválido: ${params.format}`);
    }

    // ── Validação da entidade (entity-driven) ──────────────────────────────────
    const report = this.metadata.scan().entities.find((e) => e.tableName === entity);
    if (!report) throw new NotFoundException(`Entidade não encontrada: ${entity}`);
    if (!report.reportable) throw new NotFoundException(`Entidade não é reportável: ${entity}`);

    // Guarda: tabela física precisa existir (422 controlado, nunca 500).
    await this.tableGuard.assertTableUsable(entity, report);

    const def = this.definitions.getDefinition(entity);
    if (!def) throw new NotFoundException(`Contrato de relatório ausente: ${entity}`);
    if (!def.supportsExport) throw new BadRequestException(`Entidade não suporta exportação: ${entity}`);

    // ── Query segura a partir do contrato ──────────────────────────────────────
    const softDeleteColumn = report.hasSoftDelete
      ? report.columns.find((c) => c.isDeletedAt)?.name
      : undefined;
    const query = this.queryBuilder.build(def, params, tenantId, { softDeleteColumn });

    if (!this.ds) throw new ServiceUnavailableException('Banco de dados indisponível');

    let rows: Record<string, unknown>[];
    try {
      rows = (await this.ds.query(query.sql, query.parameters)) as Record<string, unknown>[];
    } catch (err) {
      this.audit.record({ userId, tenantId, entity, format: params.format, recordCount: 0, status: 'failed', error: String(err) });
      throw err;
    }

    const result = this.serialize(entity, params.format, query.columns, rows);
    this.audit.record({ userId, tenantId, entity, format: params.format, recordCount: rows.length, status: 'success' });
    return result;
  }

  private serialize(
    entity: string,
    format: ExportFormat,
    columns: string[],
    rows: Record<string, unknown>[],
  ): ExportResult {
    const stamp = new Date().toISOString().slice(0, 10);
    const base = `${entity}_${stamp}`;
    if (format === 'json') {
      return { filename: `${base}.json`, contentType: 'application/json', body: this.format.toJson(entity, columns, rows), recordCount: rows.length, format };
    }
    if (format === 'csv') {
      return { filename: `${base}.csv`, contentType: 'text/csv;charset=utf-8', body: this.format.toCsv(columns, rows), recordCount: rows.length, format };
    }
    return {
      filename: `${base}.xlsx`,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      body: this.format.toXlsx(entity, columns, rows),
      recordCount: rows.length,
      format,
    };
  }
}
