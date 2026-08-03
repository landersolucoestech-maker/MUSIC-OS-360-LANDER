/**
 * modules/reports/import/import-validation.service.ts  ·  FASE 2.3A
 * Valida as linhas mapeadas contra o contrato + tipos da metadata.
 * Produz preview normalizado. NENHUMA persistência.
 */
import { Injectable } from '@nestjs/common';
import { normalizeFieldKey } from '../i18n/field-labels.pt-br';
import type { ReportEntityDefinition } from '../definitions/report-entity-definition.types';
import type { HeaderMapping } from './import-mapper.service';
import type { FieldTypeMeta, ImportValidationResult, RowIssue, RowValidation } from './import.types';

const DATE_TYPES = new Set(['timestamp', 'timestamptz', 'date', 'datetime', 'Date']);
const NUMERIC_TYPES = new Set(['int', 'integer', 'numeric', 'decimal', 'float', 'bigint', 'Number', 'real', 'double precision', 'smallint']);
const BOOL_TRUE = new Set(['true', '1', 'sim', 'verdadeiro', 'yes']);
const BOOL_FALSE = new Set(['false', '0', 'não', 'nao', 'falso', 'no']);

function coerce(raw: string, meta: FieldTypeMeta | undefined): { ok: boolean; value: unknown; message?: string } {
  const v = (raw ?? '').trim();
  if (v === '') return { ok: true, value: null };
  if (meta?.isEnum && meta.enumValues && meta.enumValues.length > 0) {
    const match = meta.enumValues.find((e) => e.toLowerCase() === v.toLowerCase());
    return match ? { ok: true, value: match } : { ok: false, value: v, message: `valor fora do conjunto permitido` };
  }
  const t = meta?.type ?? 'String';
  if (DATE_TYPES.has(t)) {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? { ok: false, value: v, message: 'data inválida' } : { ok: true, value: d.toISOString() };
  }
  if (NUMERIC_TYPES.has(t)) {
    const n = Number(v.replace(',', '.'));
    return Number.isNaN(n) ? { ok: false, value: v, message: 'número inválido' } : { ok: true, value: n };
  }
  if (t === 'Boolean' || t === 'boolean' || t === 'bool') {
    if (BOOL_TRUE.has(v.toLowerCase())) return { ok: true, value: true };
    if (BOOL_FALSE.has(v.toLowerCase())) return { ok: true, value: false };
    return { ok: false, value: v, message: 'booleano inválido' };
  }
  return { ok: true, value: v };
}

@Injectable()
export class ImportValidationService {
  validate(
    def: ReportEntityDefinition,
    typeMap: Record<string, FieldTypeMeta>,
    headerMapping: HeaderMapping,
    rows: Record<string, string>[],
    entity: string,
  ): ImportValidationResult {
    const { mapping, unknownColumns, ignoredColumns } = headerMapping;
    const errors: string[] = [];
    const warnings: string[] = [];

    // Colunas desconhecidas: warning; sensíveis: erro bloqueante.
    const sensitiveCanon = new Set(def.sensitiveColumns.map((c) => normalizeFieldKey(c).toLowerCase()));
    for (const u of unknownColumns) {
      if (sensitiveCanon.has(normalizeFieldKey(u).toLowerCase())) {
        errors.push(`Coluna sensível rejeitada: "${u}".`);
      } else {
        warnings.push(`Coluna desconhecida ignorada: "${u}".`);
      }
    }
    for (const ig of ignoredColumns) warnings.push(`Coluna de infraestrutura ignorada: "${ig}".`);

    // header → coluna importável (apenas mapeamentos válidos)
    const activeHeaders = Object.entries(mapping).filter(([, col]) => col !== null) as [string, string][];
    const mappedColumns = new Set(activeHeaders.map(([, col]) => col));

    // Obrigatórias pelo contrato (ex.: identityColumn) + obrigatórias pelo
    // SCHEMA (coluna NOT NULL sem DEFAULT — omiti-la do INSERT quebra a
    // constraint no commit; sem isso o erro só aparecia como 500 na
    // persistência em vez de ser pego aqui, no preview).
    const schemaRequired = def.importableColumns.filter((c) => {
      const meta = typeMap[c];
      return meta != null && meta.nullable === false && meta.hasDefault === false;
    });
    const requiredColumns = Array.from(new Set([...def.requiredImportColumns, ...schemaRequired]));

    // Colunas obrigatórias precisam estar presentes no arquivo.
    const missingRequired = requiredColumns.filter((c) => !mappedColumns.has(c));
    for (const c of missingRequired) errors.push(`Coluna obrigatória ausente no arquivo: "${c}".`);

    const seenIdentity = new Set<string>();
    const result: RowValidation[] = rows.map((row, i) => {
      const data: Record<string, unknown> = {};
      const rowErrors: RowIssue[] = [];
      const rowWarnings: RowIssue[] = [];

      for (const [header, col] of activeHeaders) {
        if (def.sensitiveColumns.includes(col)) {
          rowErrors.push({ column: col, message: 'coluna sensível não pode ser importada' });
          continue;
        }
        const c = coerce(row[header] ?? '', typeMap[col]);
        if (!c.ok) rowErrors.push({ column: col, message: c.message ?? 'valor inválido' });
        else data[col] = c.value;
      }

      // Obrigatórios não-vazios.
      for (const req of requiredColumns) {
        if (mappedColumns.has(req) && (data[req] === null || data[req] === undefined || data[req] === '')) {
          rowErrors.push({ column: req, message: 'campo obrigatório vazio' });
        }
      }

      // Duplicidade interna no arquivo (pela identityColumn).
      const idVal = data[def.identityColumn];
      if (idVal != null && idVal !== '') {
        const key = String(idVal).toLowerCase();
        if (seenIdentity.has(key)) rowWarnings.push({ column: def.identityColumn, message: 'registro duplicado no arquivo' });
        else seenIdentity.add(key);
      }

      return { index: i, data, valid: rowErrors.length === 0, errors: rowErrors, warnings: rowWarnings };
    });

    const validRows = result.filter((r) => r.valid).length;
    return {
      entity,
      supportsImport: def.supportsImport,
      mapping,
      unknownColumns,
      ignoredColumns,
      totalRows: rows.length,
      validRows,
      invalidRows: rows.length - validRows,
      rows: result,
      errors,
      warnings,
    };
  }
}
