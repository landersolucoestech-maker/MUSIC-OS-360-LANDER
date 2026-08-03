/**
 * modules/reports/import/import-engine.service.ts  ·  FASE 2.3A
 * Orquestra: valida entidade/contrato/tenant → parse → mapping → validação →
 * preview. NENHUMA persistência (commit é a FASE 2.3B).
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
import type { ReportEntityDefinition } from '../definitions/report-entity-definition.types';
import type { FieldTypeMeta, ImportValidationResult } from './import.types';

export interface ImportTemplateResult {
  filename: string;
  contentType: string;
  body: Buffer;
}

/** Versão do contrato de template — some junto de mudanças de coluna/obrigatoriedade. */
export const IMPORT_TEMPLATE_VERSION = '1.0';

/** Placeholder sintético por tipo de coluna — nunca dado real, só para orientar o preenchimento. */
function syntheticExample(meta: FieldTypeMeta | undefined): string {
  if (!meta) return 'exemplo';
  if (meta.isEnum && meta.enumValues && meta.enumValues.length > 0) return meta.enumValues[0]!;
  const t = meta.type ?? 'String';
  if (/int|numeric|decimal|float|bigint|real|double/i.test(t)) return '0';
  if (t === 'Boolean' || t === 'boolean' || t === 'bool') return 'Não';
  if (/timestamp|date/i.test(t)) return '2026-01-01';
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

  /** Upload → parse → mapping → preview → validação. Sem persistência. */
  async validateFile(
    entity: string,
    file: { filename: string; content: Buffer },
    tenantId: string | undefined,
  ): Promise<ImportValidationResult> {
    if (!tenantId) throw new ForbiddenException('Tenant não identificado');

    const report = this.metadata.scan().entities.find((e) => e.tableName === entity);
    if (!report) throw new NotFoundException(`Entidade não encontrada: ${entity}`);
    if (!report.reportable) throw new NotFoundException(`Entidade não é reportável: ${entity}`);

    // Guarda: tabela física precisa existir (422 controlado, nunca 500).
    await this.tableGuard.assertTableUsable(entity, report);

    const def = this.definitions.getDefinition(entity);
    if (!def) throw new NotFoundException(`Contrato de relatório ausente: ${entity}`);
    if (!def.supportsImport) throw new BadRequestException(`Entidade não suporta importação: ${entity}`);

    const typeMap: Record<string, FieldTypeMeta> = {};
    for (const c of report.columns) {
      typeMap[c.name] = { type: c.type, isEnum: c.isEnum, enumValues: c.enumValues, nullable: c.nullable, hasDefault: c.hasDefault };
    }

    const parsed = this.parser.parse(file.filename, file.content);
    const headerMapping = this.mapper.build(def, parsed.headers);
    return this.validator.validate(def, typeMap, headerMapping, parsed.rows, entity);
  }

  /**
   * Template de importação: workbook XLSX com duas abas —
   *   1) a aba de dados (nome da entidade): cabeçalho pt-BR + UMA linha de
   *      exemplo sintético (nunca dado real), claramente marcada para o
   *      usuário apagar antes de importar de verdade;
   *   2) "Instruções": versão do template + tabela coluna→obrigatório/
   *      opcional→valores permitidos, gerada a partir do próprio schema
   *      (NOT NULL sem DEFAULT = obrigatório, enum = valores permitidos).
   * Sem macro, sem fórmula (toda célula passa por sanitizeExcelCellValue).
   * Mesmo guard de disponibilidade do validateFile/commit (nunca 500 por
   * entidade sem tabela física ou sem contrato de importação).
   */
  async buildTemplate(entity: string, tenantId: string | undefined): Promise<ImportTemplateResult> {
    if (!tenantId) throw new ForbiddenException('Tenant não identificado');

    const report = this.metadata.scan().entities.find((e) => e.tableName === entity);
    if (!report) throw new NotFoundException(`Entidade não encontrada: ${entity}`);
    if (!report.reportable) throw new NotFoundException(`Entidade não é reportável: ${entity}`);

    await this.tableGuard.assertTableUsable(entity, report);

    const def = this.definitions.getDefinition(entity);
    if (!def) throw new NotFoundException(`Contrato de relatório ausente: ${entity}`);
    if (!def.supportsImport) throw new BadRequestException(`Entidade não suporta importação: ${entity}`);

    const typeMap: Record<string, FieldTypeMeta> = {};
    for (const c of report.columns) {
      typeMap[c.name] = { type: c.type, isEnum: c.isEnum, enumValues: c.enumValues, nullable: c.nullable, hasDefault: c.hasDefault };
    }

    const body = this.buildTemplateWorkbook(entity, def, typeMap);
    return {
      filename: `${entity}_template.xlsx`,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      body,
    };
  }

  private buildTemplateWorkbook(
    entity: string,
    def: ReportEntityDefinition,
    typeMap: Record<string, FieldTypeMeta>,
  ): Buffer {
    const requiredSet = new Set([
      ...def.requiredImportColumns,
      ...def.importableColumns.filter((c) => {
        const meta = typeMap[c];
        return meta != null && meta.nullable === false && meta.hasDefault === false;
      }),
    ]);

    const headers = this.exportFormat.headers(def.importableColumns);
    const clean = (v: unknown, column: string) => sanitizeExcelCellValue(v, { entity, column });

    // Aba 1 — dados: cabeçalho + uma linha de exemplo sintético.
    const exampleRow = def.importableColumns.map((c) => clean(syntheticExample(typeMap[c]), c));
    const dataSheet = XLSX.utils.aoa_to_sheet([
      headers.map((h) => h.label),
      exampleRow,
    ]);

    // Aba 2 — instruções: versão + tabela coluna/obrigatoriedade/valores permitidos.
    const instrucoesRows: unknown[][] = [
      [`Template de importação — ${entity}`],
      [`Versão do template: ${IMPORT_TEMPLATE_VERSION}`],
      [''],
      ['Apague a linha de exemplo da aba de dados antes de importar. Nenhum dado de exemplo é real.'],
      [''],
      ['Coluna', 'Obrigatório', 'Valores permitidos'],
      ...def.importableColumns.map((c) => {
        const meta = typeMap[c];
        const label = headers.find((h) => h.key === c)?.label ?? c;
        const obrigatorio = requiredSet.has(c) ? 'Sim' : 'Não';
        const permitidos = meta?.isEnum && meta.enumValues?.length ? meta.enumValues.join(', ') : '—';
        return [clean(label, c), obrigatorio, clean(permitidos, c)];
      }),
    ];
    const instrucoesSheet = XLSX.utils.aoa_to_sheet(instrucoesRows);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, dataSheet, entity.slice(0, 31) || 'Dados');
    XLSX.utils.book_append_sheet(wb, instrucoesSheet, 'Instruções');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }
}
