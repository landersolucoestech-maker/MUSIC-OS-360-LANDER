/**
 * modules/reports/import/import-engine.service.ts
 *
 * Validação e template XLSX em uma única aba. Grupos repetíveis são linhas
 * consecutivas do mesmo arquivo, nunca worksheets auxiliares.
 */
import {
  BadRequestException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import * as XLSX from 'xlsx';
import { EntityMetadataService } from '../entity-metadata.service';
import { ReportEntityDefinitionService } from '../definitions/report-entity-definition.service';
import { ImportParserService } from './import-parser.service';
import { ImportMapperService } from './import-mapper.service';
import { ImportValidationService } from './import-validation.service';
import { ReportTableGuardService } from '../report-table-guard.service';
import { ExportFormatService, sanitizeExcelCellValue } from '../export/export-format.service';
import { getReportFormContract, type ReportChildSheetSpec } from '../form-contracts/report-form-contracts';
import type { ReportEntityDefinition } from '../definitions/report-entity-definition.types';
import type { FieldTypeMeta, ImportValidationResult } from './import.types';

export interface ImportTemplateResult {
  filename: string;
  contentType: string;
  body: Buffer;
}

export const IMPORT_TEMPLATE_VERSION = '2.0-single-sheet';
const MULTI_VALUE_SEPARATOR = ' | ';

type RepeatingGroup = { key: string; fields: Array<{ key: string; multi?: boolean }> };
type CompatibleContract = NonNullable<ReturnType<typeof getReportFormContract>> & {
  repeatingGroup?: RepeatingGroup;
  childSheets?: ReportChildSheetSpec[];
};

function syntheticExample(meta: FieldTypeMeta | undefined): string {
  if (!meta) return 'exemplo';
  if (meta.isEnum && meta.enumValues?.length) return meta.enumValues[0]!;
  const type = meta.type ?? 'String';
  if (/int|numeric|decimal|float|bigint|real|double/i.test(type)) return '0';
  if (/boolean|bool/i.test(type)) return 'Não';
  if (/timestamp|date/i.test(type)) return '2026-01-01';
  return 'exemplo';
}

@Injectable()
export class ImportEngineService {
  constructor(
    private readonly metadata: EntityMetadataService,
    private readonly definitions: ReportEntityDefinitionService,
    private readonly parser: ImportParserService,
    private readonly mapper: ImportMapperService,
    private readonly validator: ImportValidationService,
    private readonly tableGuard: ReportTableGuardService,
    private readonly exportFormat: ExportFormatService,
  ) {}

  async validateFile(
    entity: string,
    file: { filename: string; content: Buffer },
    tenantId: string | undefined,
  ): Promise<ImportValidationResult> {
    if (!tenantId) throw new ForbiddenException('Tenant não identificado');

    const report = this.metadata.scan().entities.find((item) => item.tableName === entity);
    if (!report || !report.reportable) {
      throw new NotFoundException({
        error: 'REPORT_ENTITY_NOT_AVAILABLE',
        message: `Entidade não disponível na Central de Relatórios: ${entity}`,
      });
    }

    await this.tableGuard.assertTableUsable(entity, report);
    const def = this.definitions.getDefinition(entity);
    if (!def) {
      throw new NotFoundException({
        error: 'REPORT_CONTRACT_REQUIRED',
        message: `Entidade sem contrato de relatório explícito: ${entity}`,
      });
    }
    if (!def.supportsImport) throw new BadRequestException(`Entidade não suporta importação: ${entity}`);

    const typeMap: Record<string, FieldTypeMeta> = {};
    for (const column of report.columns) {
      typeMap[column.name] = {
        type: column.type,
        isEnum: column.isEnum,
        enumValues: column.enumValues,
        nullable: column.nullable,
        hasDefault: column.hasDefault,
      };
    }

    const parsed = this.parser.parse(file.filename, file.content);
    const headerMapping = this.mapper.build(def, parsed.headers);
    return this.validator.validate(def, typeMap, headerMapping, parsed.rows, entity);
  }

  async buildTemplate(entity: string, tenantId: string | undefined): Promise<ImportTemplateResult> {
    if (!tenantId) throw new ForbiddenException('Tenant não identificado');

    const report = this.metadata.scan().entities.find((item) => item.tableName === entity);
    if (!report || !report.reportable) {
      throw new NotFoundException({
        error: 'REPORT_ENTITY_NOT_AVAILABLE',
        message: `Entidade não disponível na Central de Relatórios: ${entity}`,
      });
    }

    await this.tableGuard.assertTableUsable(entity, report);
    const def = this.definitions.getDefinition(entity);
    if (!def) {
      throw new NotFoundException({
        error: 'REPORT_CONTRACT_REQUIRED',
        message: `Entidade sem contrato de relatório explícito: ${entity}`,
      });
    }
    if (!def.supportsImport) throw new BadRequestException(`Entidade não suporta importação: ${entity}`);

    const typeMap: Record<string, FieldTypeMeta> = {};
    for (const column of report.columns) {
      typeMap[column.name] = {
        type: column.type,
        isEnum: column.isEnum,
        enumValues: column.enumValues,
        nullable: column.nullable,
        hasDefault: column.hasDefault,
      };
    }

    return {
      filename: `${entity}_template.xlsx`,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      body: this.buildTemplateWorkbook(entity, def, typeMap, getReportFormContract(entity) as CompatibleContract | null),
    };
  }

  private buildTemplateWorkbook(
    entity: string,
    def: ReportEntityDefinition,
    typeMap: Record<string, FieldTypeMeta>,
    contract: CompatibleContract | null,
  ): Buffer {
    const headers = this.exportFormat.headers(def.importableColumns);
    const clean = (value: unknown, column: string) => sanitizeExcelCellValue(value, { entity, column });
    const repeatingGroup = contract?.repeatingGroup ?? contract?.childSheets?.[0];
    const repeatedKeys = new Set(repeatingGroup?.fields.map((field) => field.key) ?? []);
    const multiKeys = new Set(repeatingGroup?.fields.filter((field) => field.multi).map((field) => field.key) ?? []);

    const exampleRow = def.importableColumns.map((column) => {
      if (multiKeys.has(column)) return clean(`Exemplo 1${MULTI_VALUE_SEPARATOR}Exemplo 2`, column);
      if (repeatedKeys.has(column)) return clean('exemplo', column);
      return clean(syntheticExample(typeMap[column]), column);
    });

    const worksheet = XLSX.utils.aoa_to_sheet([
      headers.map((header) => header.label),
      exampleRow,
    ]);
    const workbook = XLSX.utils.book_new();
    const sheetName = this.metadata.scan().entities.find((item) => item.tableName === entity)?.label ?? entity;
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31) || 'Dados');
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }
}
