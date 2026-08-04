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
import { getFieldLabelPtBr, normalizeFieldKey } from '../i18n/field-labels.pt-br';
import {
  contractRefFields,
  getReportFormContract,
  type ReportChildSheetSpec,
} from '../form-contracts/report-form-contracts';
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
    if (!report || !report.reportable) {
      throw new NotFoundException({
        error: 'REPORT_ENTITY_NOT_AVAILABLE',
        message: `Entidade não disponível na Central de Relatórios: ${entity}`,
      });
    }

    // Guarda: tabela física precisa existir (422 controlado, nunca 500).
    await this.tableGuard.assertTableUsable(entity, report);

    const def = this.definitions.getDefinition(entity);
    if (!def) {
      throw new NotFoundException({
        error: 'REPORT_CONTRACT_REQUIRED',
        message: `Entidade sem contrato de relatório explícito (nenhum fallback heurístico): ${entity}`,
      });
    }
    if (!def.supportsImport) throw new BadRequestException(`Entidade não suporta importação: ${entity}`);

    const typeMap: Record<string, FieldTypeMeta> = {};
    for (const c of report.columns) {
      typeMap[c.name] = { type: c.type, isEnum: c.isEnum, enumValues: c.enumValues, nullable: c.nullable, hasDefault: c.hasDefault };
    }

    const parsed = this.parser.parse(file.filename, file.content);
    const headerMapping = this.mapper.build(def, parsed.headers);
    const result = this.validator.validate(def, typeMap, headerMapping, parsed.rows, entity);

    const contract = getReportFormContract(entity);
    if (contract?.childSheets?.length) {
      this.attachChildSheets(contract.childSheets, contract, file, result);
    }

    return result;
  }

  /**
   * Parte 87: correlaciona cada linha validada da aba principal com suas
   * linhas de aba(s) filha(s) (pelo valor da coluna 'ref', mesma coluna em
   * ambas as abas). Parsing/agrupamento dedicados — as abas filhas NÃO
   * passam pelo mapper/validator genérico (contrato mais simples: toda
   * célula é texto, sem coerção de tipo/obrigatoriedade por schema).
   */
  private attachChildSheets(
    childSheets: ReportChildSheetSpec[],
    contract: NonNullable<ReturnType<typeof getReportFormContract>>,
    file: { filename: string; content: Buffer },
    result: ImportValidationResult,
  ): void {
    const refFields = contractRefFields(contract);
    const refKey = Object.keys(refFields)[0];
    if (!refKey) return;

    childSheets.forEach((spec, i) => {
      const sheetIndex = i + 1; // 0 = aba principal
      const parsed = this.parser.parseChildSheet(file.filename, file.content, sheetIndex);
      if (!parsed) return;

      const allowedKeys = [refKey, ...spec.fields.map((f) => f.key)];
      const byLabel = new Map(allowedKeys.map((k) => [getFieldLabelPtBr(k).toLowerCase(), k]));
      const byCanonical = new Map(allowedKeys.map((k) => [normalizeFieldKey(k).toLowerCase(), k]));
      const resolveHeader = (h: string): string | null =>
        byLabel.get(h.trim().toLowerCase()) ?? byCanonical.get(normalizeFieldKey(h).toLowerCase()) ?? null;

      const headerToKey = new Map(parsed.headers.map((h) => [h, resolveHeader(h)]));
      const grouped = new Map<string, Record<string, unknown>[]>();

      for (const rawRow of parsed.rows) {
        const item: Record<string, unknown> = {};
        let ref: string | null = null;
        for (const [header, value] of Object.entries(rawRow)) {
          const key = headerToKey.get(header);
          if (!key) continue;
          if (key === refKey) { ref = value; continue; }
          const fieldSpec = spec.fields.find((f) => f.key === key);
          item[key] = fieldSpec?.multi
            ? value.split(',').map((s) => s.trim()).filter(Boolean)
            : (value === '' ? null : value);
        }
        if (!ref) continue;
        const list = grouped.get(ref) ?? [];
        list.push(item);
        grouped.set(ref, list);
      }

      for (const row of result.rows) {
        const ref = row.data[refKey];
        if (ref === undefined || ref === null || ref === '') continue;
        const matched = grouped.get(String(ref));
        if (!matched) continue;
        row.childSheets = { ...row.childSheets, [spec.key]: matched };
      }
    });
  }

  /**
   * Template de importação: workbook XLSX com:
   *   1) a aba principal (label pt-BR da entidade): cabeçalho pt-BR + UMA
   *      linha de exemplo sintético (nunca dado real), claramente marcada
   *      para o usuário apagar antes de importar de verdade;
   *   2) uma aba por estrutura filha do contrato (Parte 87, Bloco 6) —
   *      mesma coluna de referência (valor de exemplo "1") correlacionando
   *      as linhas entre abas, nunca uma célula JSON compactada;
   *   3) "Instruções": versão do template + tabela coluna→obrigatório/
   *      opcional→valores permitidos, gerada a partir do próprio schema
   *      (NOT NULL sem DEFAULT = obrigatório, enum = valores permitidos).
   * Sem macro, sem fórmula (toda célula passa por sanitizeExcelCellValue).
   * Mesmo guard de disponibilidade do validateFile/commit (nunca 500 por
   * entidade sem tabela física ou sem contrato de importação).
   */
  async buildTemplate(entity: string, tenantId: string | undefined): Promise<ImportTemplateResult> {
    if (!tenantId) throw new ForbiddenException('Tenant não identificado');

    const report = this.metadata.scan().entities.find((e) => e.tableName === entity);
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
        message: `Entidade sem contrato de relatório explícito (nenhum fallback heurístico): ${entity}`,
      });
    }
    if (!def.supportsImport) throw new BadRequestException(`Entidade não suporta importação: ${entity}`);

    const typeMap: Record<string, FieldTypeMeta> = {};
    for (const c of report.columns) {
      typeMap[c.name] = { type: c.type, isEnum: c.isEnum, enumValues: c.enumValues, nullable: c.nullable, hasDefault: c.hasDefault };
    }

    const contract = getReportFormContract(entity);
    const body = this.buildTemplateWorkbook(entity, def, typeMap, contract);
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
    contract: ReturnType<typeof getReportFormContract>,
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

    const refFields = contract ? contractRefFields(contract) : {};
    const refKey = Object.keys(refFields)[0] ?? null;
    // Aba 1 — dados: cabeçalho + uma linha de exemplo sintético. Coluna 'ref'
    // usa um valor fixo e legível ("1") — é a chave de junção com as abas
    // filhas, não um dado real do formulário.
    const exampleRow = def.importableColumns.map((c) =>
      c === refKey ? clean('1', c) : clean(syntheticExample(typeMap[c]), c),
    );
    const dataSheet = XLSX.utils.aoa_to_sheet([
      headers.map((h) => h.label),
      exampleRow,
    ]);

    const wb = XLSX.utils.book_new();
    const mainSheetName = this.metadata.scan().entities.find((e) => e.tableName === entity)?.label ?? entity;
    XLSX.utils.book_append_sheet(wb, dataSheet, mainSheetName.slice(0, 31) || 'Dados');

    // Abas filhas (Parte 87): mesma coluna 'ref' com o mesmo valor de exemplo
    // ("1"), uma linha de exemplo por aba, para deixar claro como as abas se
    // correlacionam.
    if (contract?.childSheets?.length && refKey) {
      for (const spec of contract.childSheets) {
        const childColumns = [refKey, ...spec.fields.map((f) => f.key)];
        const childHeaders = this.exportFormat.headers(childColumns).map((h) => h.label);
        const childExampleRow = childColumns.map((c) =>
          c === refKey ? clean('1', c) : clean(spec.fields.find((f) => f.key === c)?.multi ? 'exemplo 1, exemplo 2' : 'exemplo', c),
        );
        const childSheet = XLSX.utils.aoa_to_sheet([childHeaders, childExampleRow]);
        XLSX.utils.book_append_sheet(wb, childSheet, spec.sheetName.slice(0, 31));
      }
    }

    // Aba de instruções — versão + tabela coluna/obrigatoriedade/valores permitidos.
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
    XLSX.utils.book_append_sheet(wb, instrucoesSheet, 'Instruções');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }
}
