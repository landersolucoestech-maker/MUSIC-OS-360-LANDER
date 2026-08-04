/**
 * modules/reports/export/export-engine.service.ts  ·  uma única aba, sempre
 *
 * Orquestra a exportação entity-driven. Grupos repetíveis são achatados em
 * linhas da mesma aba; nunca são criadas worksheets adicionais.
 */
import {
  BadRequestException, ForbiddenException, Inject, Injectable,
  Optional, ServiceUnavailableException, UnprocessableEntityException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DATA_SOURCE } from '../../../database/database.module';
import { EntityMetadataService } from '../entity-metadata.service';
import { ReportEntityDefinitionService } from '../definitions/report-entity-definition.service';
import type { ReportEntityDefinition } from '../definitions/report-entity-definition.types';
import { ExportQueryBuilderService } from './export-query-builder.service';
import { ExportFormatService } from './export-format.service';
import { ExportAuditService } from './export-audit.service';
import { ReportTableGuardService } from '../report-table-guard.service';
import { EncryptionService } from '../../../core/security/encryption.service';
import {
  contractEncryptedFields,
  getReportFormContract,
  REPORT_MULTI_VALUE_SEPARATOR,
} from '../form-contracts/report-form-contracts';
import { REPEATING_GROUP_EXPORT_RESOLVERS } from '../computed-fields/registry';
import { REPORT_MODULE_REGISTRY_BY_TABLE, ACCOUNTING_SUMMARY_TABLE_NAME } from '../report-module-registry';
import { fetchAccountingSummaryRows } from '../computed-fields/accounting-summary.report';
import { EXPORT_FORMATS, type ExportQueryParams, type ExportResult } from './export.types';

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
    private readonly encryption: EncryptionService,
  ) {}

  async export(
    entity: string,
    params: ExportQueryParams,
    tenantId: string | undefined,
    userId: string,
  ): Promise<ExportResult> {
    if (!tenantId) throw new ForbiddenException('Tenant nao identificado');
    if (!EXPORT_FORMATS.includes(params.format)) {
      throw new BadRequestException({
        error: 'UNSUPPORTED_EXPORT_FORMAT',
        message: `Formato de exportação não suportado: "${params.format}". Formatos aceitos: ${EXPORT_FORMATS.join(', ')}.`,
      });
    }

    const report = this.metadata.scan().entities.find((e) => e.tableName === entity);
    if (!report || !report.reportable) {
      throw new UnprocessableEntityException({
        error: 'REPORT_ENTITY_NOT_AVAILABLE',
        message: `Entidade não disponível na Central de Relatórios: ${entity}`,
      });
    }

    await this.tableGuard.assertTableUsable(entity, report);

    const def = this.definitions.getDefinition(entity);
    if (!def) {
      throw new UnprocessableEntityException({
        error: 'REPORT_CONTRACT_REQUIRED',
        message: `Entidade sem contrato de relatório explícito (nenhum fallback heurístico): ${entity}`,
      });
    }
    if (!def.supportsExport) throw new BadRequestException(`Entidade nao suporta exportacao: ${entity}`);

    const sheetName = report.label ?? entity;

    if (REPORT_MODULE_REGISTRY_BY_TABLE.get(entity)?.computed) {
      if (!this.ds) throw new ServiceUnavailableException('Banco de dados indisponivel');
      let computedRows: Record<string, unknown>[];
      try {
        computedRows = await this.resolveComputedReport(entity, tenantId);
      } catch (err) {
        this.audit.record({ userId, tenantId, entity, format: params.format, recordCount: 0, status: 'failed', error: String(err) });
        throw err;
      }
      const columns = params.columns?.length
        ? params.columns.filter((c) => def.exportableColumns.includes(c))
        : def.exportableColumns;
      const result = this.serialize(entity, sheetName, params.format, columns, computedRows);
      this.audit.record({ userId, tenantId, entity, format: params.format, recordCount: computedRows.length, status: 'success' });
      return result;
    }

    const contract = getReportFormContract(entity);
    const softDeleteColumn = report.hasSoftDelete
      ? report.columns.find((c) => c.isDeletedAt)?.name
      : undefined;

    if (!this.ds) throw new ServiceUnavailableException('Banco de dados indisponivel');

    if (contract?.repeatingGroup) {
      let result: ExportResult;
      try {
        result = await this.exportWithRepeatingGroup(entity, sheetName, params, tenantId, def, contract, softDeleteColumn);
      } catch (err) {
        this.audit.record({ userId, tenantId, entity, format: params.format, recordCount: 0, status: 'failed', error: String(err) });
        throw err;
      }
      this.audit.record({ userId, tenantId, entity, format: params.format, recordCount: result.recordCount, status: 'success' });
      return result;
    }

    const query = this.queryBuilder.build(def, params, tenantId, { softDeleteColumn });

    let rows: Record<string, unknown>[];
    try {
      rows = (await this.ds.query(query.sql, query.parameters)) as Record<string, unknown>[];
    } catch (err) {
      this.audit.record({ userId, tenantId, entity, format: params.format, recordCount: 0, status: 'failed', error: String(err) });
      throw err;
    }

    this.decryptEncryptedColumns(contract, query.columns, rows);

    const result = this.serialize(entity, sheetName, params.format, query.columns, rows);
    this.audit.record({ userId, tenantId, entity, format: params.format, recordCount: rows.length, status: 'success' });
    return result;
  }

  private decryptEncryptedColumns(
    contract: ReturnType<typeof getReportFormContract>,
    columns: string[],
    rows: Record<string, unknown>[],
  ): void {
    const encryptedFields = Object.keys(contract ? contractEncryptedFields(contract) : {})
      .filter((k) => columns.includes(k));
    if (encryptedFields.length === 0) return;
    for (const row of rows) {
      for (const key of encryptedFields) {
        const v = row[key];
        row[key] = typeof v === 'string' && v.length > 0 ? this.encryption.decryptNullable(v) : null;
      }
    }
  }

  private async resolveComputedReport(entity: string, tenantId: string): Promise<Record<string, unknown>[]> {
    if (entity === ACCOUNTING_SUMMARY_TABLE_NAME) {
      return fetchAccountingSummaryRows(this.ds!, tenantId) as unknown as Record<string, unknown>[];
    }
    throw new Error(`[reports-export] relatório computado sem resolver registrado: ${entity}`);
  }

  private async exportWithRepeatingGroup(
    entity: string,
    sheetName: string,
    params: ExportQueryParams,
    tenantId: string,
    def: ReportEntityDefinition,
    contract: NonNullable<ReturnType<typeof getReportFormContract>>,
    softDeleteColumn: string | undefined,
  ): Promise<ExportResult> {
    if (!this.ds) throw new ServiceUnavailableException('Banco de dados indisponivel');
    const group = contract.repeatingGroup!;

    const generalColumns = contract.fields.map((f) => f.key);
    const query = this.queryBuilder.build(
      def,
      { ...params, columns: generalColumns },
      tenantId,
      { softDeleteColumn, includeInternalId: true },
    );
    const rawRows = (await this.ds.query(query.sql, query.parameters)) as Record<string, unknown>[];
    this.decryptEncryptedColumns(contract, query.columns, rawRows);

    const resolver = REPEATING_GROUP_EXPORT_RESOLVERS[`${entity}.${group.key}`];
    if (!resolver) {
      throw new Error(`[reports-export] grupo repetível sem resolver registrado: ${entity}.${group.key}`);
    }
    const parentIds = rawRows.map((r) => String(r.__internal_id));
    const itemsByParent = await resolver(this.ds, tenantId, parentIds);

    const itemColumns = group.fields.map((f) => f.key);
    const allColumns = [...generalColumns, ...itemColumns];
    const flatRows: Record<string, unknown>[] = [];

    for (const row of rawRows) {
      const general: Record<string, unknown> = {};
      for (const c of generalColumns) general[c] = row[c];

      const items = itemsByParent.get(String(row.__internal_id)) ?? [];
      if (items.length === 0) {
        const blank: Record<string, unknown> = { ...general };
        for (const c of itemColumns) blank[c] = '';
        flatRows.push(blank);
        continue;
      }
      for (const item of items) {
        const flat: Record<string, unknown> = { ...general };
        for (const f of group.fields) {
          const value = (item as Record<string, unknown>)[f.key];
          flat[f.key] = f.multi && Array.isArray(value) ? value.join(REPORT_MULTI_VALUE_SEPARATOR) : value;
        }
        flatRows.push(flat);
      }
    }

    return this.serialize(entity, sheetName, params.format, allColumns, flatRows);
  }

  private serialize(
    entity: string,
    sheetName: string,
    format: ExportResult['format'],
    columns: string[],
    rows: Record<string, unknown>[],
  ): ExportResult {
    const stamp = new Date().toISOString().slice(0, 10);
    const base = `${entity}_${stamp}`;
    return {
      filename: `${base}.xlsx`,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      body: this.format.toXlsx(entity, sheetName, columns, rows),
      recordCount: rows.length,
      format,
    };
  }
}
