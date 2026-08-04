/**
 * modules/reports/export/export-engine.service.ts  ·  FASE 2.2 (Parte 87: abas filhas)
 *
 * Orquestra a exportação 100% entity-driven: valida entidade/contrato/tenant,
 * monta a query segura (contrato), executa com isolamento por tenant, serializa
 * com labels pt-BR e audita. Sem if/switch por entidade — exceto o suporte a
 * abas filhas (contract.childSheets), que é opt-in por contrato, não por tabela.
 */
import {
  BadRequestException, ForbiddenException, Inject, Injectable,
  Optional, ServiceUnavailableException, UnprocessableEntityException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DATA_SOURCE } from '../../../database/database.module';
import { EntityMetadataService } from '../entity-metadata.service';
import { ReportEntityDefinitionService } from '../definitions/report-entity-definition.service';
import { ExportQueryBuilderService } from './export-query-builder.service';
import { ExportFormatService } from './export-format.service';
import { ExportAuditService } from './export-audit.service';
import { ReportTableGuardService } from '../report-table-guard.service';
import { EncryptionService } from '../../../core/security/encryption.service';
import {
  contractEncryptedFields,
  contractRefFields,
  getReportFormContract,
  type ReportChildSheetSpec,
} from '../form-contracts/report-form-contracts';
import { CHILD_SHEET_EXPORT_RESOLVERS } from '../computed-fields/registry';
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

    const softDeleteColumn = report.hasSoftDelete
      ? report.columns.find((c) => c.isDeletedAt)?.name
      : undefined;
    const query = this.queryBuilder.build(def, params, tenantId, { softDeleteColumn });

    if (!this.ds) throw new ServiceUnavailableException('Banco de dados indisponivel');

    let rows: Record<string, unknown>[];
    try {
      rows = (await this.ds.query(query.sql, query.parameters)) as Record<string, unknown>[];
    } catch (err) {
      this.audit.record({ userId, tenantId, entity, format: params.format, recordCount: 0, status: 'failed', error: String(err) });
      throw err;
    }

    const contract = getReportFormContract(entity);

    // Campos cifrados são exportados DESCRIPTOGRAFADOS (a chave lógica do
    // formulário, ex.: email). Sem isso o arquivo carregaria ciphertext e o
    // round-trip exportar→importar re-cifraria o ciphertext (dado corrompido).
    const encryptedFields = Object.keys(contract ? contractEncryptedFields(contract) : {})
      .filter((k) => query.columns.includes(k));
    if (encryptedFields.length > 0) {
      for (const row of rows) {
        for (const key of encryptedFields) {
          const v = row[key];
          row[key] = typeof v === 'string' && v.length > 0 ? this.encryption.decryptNullable(v) : null;
        }
      }
    }

    if (contract?.childSheets?.length) {
      const result = await this.serializeWithChildSheets(entity, params.format, contract.childSheets, query.columns, rows, contract, tenantId);
      this.audit.record({ userId, tenantId, entity, format: params.format, recordCount: rows.length, status: 'success' });
      return result;
    }

    const result = this.serialize(entity, params.format, query.columns, rows);
    this.audit.record({ userId, tenantId, entity, format: params.format, recordCount: rows.length, status: 'success' });
    return result;
  }

  private async serializeWithChildSheets(
    entity: string,
    format: ExportFormat,
    childSheets: ReportChildSheetSpec[],
    mainColumns: string[],
    mainRows: Record<string, unknown>[],
    contract: NonNullable<ReturnType<typeof getReportFormContract>>,
    tenantId: string,
  ): Promise<ExportResult> {
    if (!this.ds) throw new ServiceUnavailableException('Banco de dados indisponivel');

    const refFields = contractRefFields(contract);
    const refKey = Object.keys(refFields)[0];
    if (!refKey) {
      throw new Error(`[reports-export] contrato com childSheets sem campo 'ref' declarado: ${entity}`);
    }
    const refValues = mainRows.map((r) => String(r[refKey]));

    const report = this.metadata.scan().entities.find((e) => e.tableName === entity);
    const mainSheetName = report?.label ?? entity;

    const sheets: Array<{ sheetName: string; columns: string[]; rows: Record<string, unknown>[] }> = [
      { sheetName: mainSheetName, columns: mainColumns, rows: mainRows },
    ];

    for (const spec of childSheets) {
      const resolver = CHILD_SHEET_EXPORT_RESOLVERS[`${entity}.${spec.key}`];
      if (!resolver) {
        throw new Error(`[reports-export] aba filha sem resolver registrado: ${entity}.${spec.key}`);
      }
      const dataByRef = await resolver(this.ds, tenantId, refValues);
      const childColumns = [refKey, ...spec.fields.map((f) => f.key)];
      const childRows: Record<string, unknown>[] = [];
      for (const ref of refValues) {
        for (const item of dataByRef.get(ref) ?? []) {
          const row: Record<string, unknown> = { [refKey]: ref };
          for (const f of spec.fields) {
            const value = (item as Record<string, unknown>)[f.key];
            row[f.key] = f.multi && Array.isArray(value) ? value.join(', ') : value;
          }
          childRows.push(row);
        }
      }
      sheets.push({ sheetName: spec.sheetName, columns: childColumns, rows: childRows });
    }

    const stamp = new Date().toISOString().slice(0, 10);
    return {
      filename: `${entity}_${stamp}.xlsx`,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      body: this.format.toXlsxMultiSheet(entity, sheets),
      recordCount: mainRows.length,
      format,
    };
  }

  private serialize(
    entity: string,
    format: ExportFormat,
    columns: string[],
    rows: Record<string, unknown>[],
  ): ExportResult {
    const stamp = new Date().toISOString().slice(0, 10);
    const base = `${entity}_${stamp}`;
    return {
      filename: `${base}.xlsx`,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      body: this.format.toXlsx(entity, columns, rows),
      recordCount: rows.length,
      format,
    };
  }
}
