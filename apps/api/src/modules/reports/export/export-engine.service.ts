/**
 * modules/reports/export/export-engine.service.ts  ·  FASE 2.2
 *
 * Orquestra a exportação 100% entity-driven: valida entidade/contrato/tenant,
 * monta a query segura (contrato), executa com isolamento por tenant, serializa
 * com labels pt-BR e audita. Sem if/switch por entidade.
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
  contractComputedFields,
  contractEncryptedFields,
  getReportFormContract,
} from '../form-contracts/report-form-contracts';
import { COMPUTED_FIELD_EXPORT_RESOLVERS } from '../computed-fields/registry';
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
    if (!report) throw new UnprocessableEntityException(`Entidade nao registrada para relatorios: ${entity}`);
    if (!report.reportable) throw new UnprocessableEntityException(`Entidade nao e exportavel pela Central de Relatorios: ${entity}`);

    await this.tableGuard.assertTableUsable(entity, report);

    const def = this.definitions.getDefinition(entity);
    if (!def) throw new UnprocessableEntityException(`Entidade nao e exportavel (contrato de relatorio ausente): ${entity}`);
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

    // Campos cifrados são exportados DESCRIPTOGRAFADOS (a chave lógica do
    // formulário, ex.: email). Sem isso o arquivo carregaria ciphertext e o
    // round-trip exportar→importar re-cifraria o ciphertext (dado corrompido).
    const encryptedFields = Object.keys(
      getReportFormContract(entity) ? contractEncryptedFields(getReportFormContract(entity)!) : {},
    ).filter((k) => query.columns.includes(k));
    if (encryptedFields.length > 0) {
      for (const row of rows) {
        for (const key of encryptedFields) {
          const v = row[key];
          row[key] = typeof v === 'string' && v.length > 0 ? this.encryption.decryptNullable(v) : null;
        }
      }
    }

    // Campos computed (sem coluna própria, ex.: projects.musicas): resolvidos
    // após o fetch principal, via resolver dedicado (registry.ts), e serializados
    // como JSON em uma única célula (sanitizeExcelCellValue rejeita objeto/array
    // cru — JSON.stringify aqui é obrigatório, não estético). A coluna interna
    // de correlação (__row_id) nunca aparece no arquivo.
    const contract = getReportFormContract(entity);
    const computedFields = contract ? Array.from(contractComputedFields(contract)).filter((f) => query.columns.includes(f)) : [];
    if (computedFields.length > 0) {
      if (!query.internalIdColumn) {
        throw new Error(`[reports-export] campo(s) computed sem internalIdColumn para correlação: ${entity}`);
      }
      const rowIds = rows.map((r) => String(r[query.internalIdColumn!]));
      for (const field of computedFields) {
        const resolver = COMPUTED_FIELD_EXPORT_RESOLVERS[`${entity}.${field}`];
        if (!resolver) {
          throw new Error(`[reports-export] campo computed sem resolver registrado: ${entity}.${field}`);
        }
        const valuesById = await resolver(this.ds, tenantId, rowIds);
        for (const row of rows) {
          const id = String(row[query.internalIdColumn!]);
          row[field] = JSON.stringify(valuesById.get(id) ?? []);
        }
      }
      for (const row of rows) delete row[query.internalIdColumn!];
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
    return {
      filename: `${base}.xlsx`,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      body: this.format.toXlsx(entity, columns, rows),
      recordCount: rows.length,
      format,
    };
  }
}
